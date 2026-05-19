// ════════════════════════════════════════════════════════════════════
// Training Storage — Direct Upload to Supabase
// ════════════════════════════════════════════════════════════════════
// Strategy:
//   - ไฟล์ ≤ 6 MB        → Standard POST upload (เร็ว)
//   - ไฟล์ > 6 MB          → TUS Resumable upload (chunks ละ 6 MB)
//                            แก้ปัญหา Supabase standard upload จำกัด ~50 MB
// ผ่าน XHR เพื่อได้ progress event + cancel ผ่าน AbortSignal
// ════════════════════════════════════════════════════════════════════

import { createClient } from "@/lib/supabase/client"

export type UploadProgress = {
  loaded: number; total: number; pct: number; speed: number; eta: number
}

export type UploadResult = {
  url: string; name: string; size: number; type: string; path: string
}

export class UploadCancelledError extends Error {
  constructor() { super("Upload cancelled") }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const BUCKET = "training-content"
const STANDARD_LIMIT = 6 * 1024 * 1024            // 6 MB — เกินกว่านี้ใช้ TUS
const CHUNK_SIZE = 6 * 1024 * 1024                // 6 MB per chunk
const MAX_CHUNK_RETRIES = 3                       // ลอง chunk เดิมไม่ผ่าน 3 ครั้ง

/**
 * Upload single file — เลือก standard vs TUS อัตโนมัติตามขนาด
 */
export async function uploadTrainingFile(
  file: File,
  options?: {
    onProgress?: (p: UploadProgress) => void
    signal?: AbortSignal
    subfolder?: string
  }
): Promise<UploadResult> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("กรุณาเข้าสู่ระบบใหม่")

  const isVideo = file.type.startsWith("video/")
  const folder = options?.subfolder ?? (isVideo ? "videos" : "documents")
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`

  if (file.size > STANDARD_LIMIT) {
    await uploadWithTus(file, path, session.access_token, options)
  } else {
    await uploadStandard(file, path, session.access_token, options)
  }

  return {
    url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`,
    name: file.name, size: file.size, type: file.type, path,
  }
}

// ════════════════════════════════════════════════════════════════════
// Standard upload — สำหรับไฟล์เล็ก (POST แบบ single shot)
// ════════════════════════════════════════════════════════════════════
function uploadStandard(
  file: File, path: string, accessToken: string,
  options?: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, true)
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream")
    xhr.setRequestHeader("Cache-Control", "3600")
    xhr.setRequestHeader("x-upsert", "false")

    const tracker = createProgressTracker(file.size, options?.onProgress)
    xhr.upload.onprogress = e => e.lengthComputable && tracker.report(e.loaded)
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(parseError(xhr))
    }
    xhr.onerror = () => reject(new Error("ขาดการเชื่อมต่อ — ตรวจสอบอินเทอร์เน็ต"))
    xhr.onabort = () => reject(new UploadCancelledError())
    xhr.timeout = 10 * 60 * 1000
    options?.signal?.addEventListener("abort", () => xhr.abort())
    xhr.send(file)
  })
}

// ════════════════════════════════════════════════════════════════════
// TUS Resumable upload — สำหรับไฟล์ใหญ่ (chunked, resumable)
// ════════════════════════════════════════════════════════════════════
async function uploadWithTus(
  file: File, path: string, accessToken: string,
  options?: { onProgress?: (p: UploadProgress) => void; signal?: AbortSignal },
): Promise<void> {
  // 1) Create upload session
  const meta = [
    `bucketName ${b64(BUCKET)}`,
    `objectName ${b64(path)}`,
    `contentType ${b64(file.type || "application/octet-stream")}`,
    `cacheControl ${b64("3600")}`,
  ].join(",")

  const createRes = await fetch(`${SUPABASE_URL}/storage/v1/upload/resumable`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Tus-Resumable": "1.0.0",
      "Upload-Length": String(file.size),
      "Upload-Metadata": meta,
      "x-upsert": "false",
    },
    signal: options?.signal,
  }).catch(e => {
    if (e.name === "AbortError") throw new UploadCancelledError()
    throw e
  })

  if (!createRes.ok) {
    const body = await createRes.text()
    throw new Error(`สร้าง upload session ไม่สำเร็จ (${createRes.status}): ${body || createRes.statusText}`)
  }
  const uploadUrl = createRes.headers.get("Location")
  if (!uploadUrl) throw new Error("ไม่ได้รับ upload URL จาก server")

  // 2) Upload chunks
  const tracker = createProgressTracker(file.size, options?.onProgress)
  let offset = 0
  while (offset < file.size) {
    const end = Math.min(offset + CHUNK_SIZE, file.size)
    const chunk = file.slice(offset, end)

    let attempt = 0
    let newOffset = -1
    while (attempt < MAX_CHUNK_RETRIES && newOffset < 0) {
      try {
        newOffset = await patchChunk(uploadUrl, chunk, offset, accessToken, tracker, options?.signal)
      } catch (e: any) {
        if (e instanceof UploadCancelledError) throw e
        attempt++
        if (attempt >= MAX_CHUNK_RETRIES) throw e
        await sleep(1000 * Math.pow(2, attempt))
      }
    }
    offset = newOffset
  }
}

function patchChunk(
  uploadUrl: string, chunk: Blob, offset: number, accessToken: string,
  tracker: ReturnType<typeof createProgressTracker>,
  signal?: AbortSignal,
): Promise<number> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("PATCH", uploadUrl, true)
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`)
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    xhr.setRequestHeader("Tus-Resumable", "1.0.0")
    xhr.setRequestHeader("Upload-Offset", String(offset))
    xhr.setRequestHeader("Content-Type", "application/offset+octet-stream")

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) tracker.report(offset + e.loaded)
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const newOffset = Number(xhr.getResponseHeader("Upload-Offset"))
        if (Number.isNaN(newOffset)) reject(new Error("Invalid Upload-Offset header"))
        else resolve(newOffset)
      } else {
        reject(parseError(xhr))
      }
    }
    xhr.onerror = () => reject(new Error("ขาดการเชื่อมต่อระหว่างอัปโหลด chunk"))
    xhr.onabort = () => reject(new UploadCancelledError())
    xhr.timeout = 5 * 60 * 1000  // 5 min per chunk
    signal?.addEventListener("abort", () => xhr.abort())
    xhr.send(chunk)
  })
}

// ════════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════════
function createProgressTracker(total: number, onProgress?: (p: UploadProgress) => void) {
  const startTime = Date.now()
  let lastReportTime = startTime
  let lastReportLoaded = 0
  let smoothSpeed = 0
  return {
    report(loaded: number) {
      if (!onProgress) return
      const now = Date.now()
      const dt = (now - lastReportTime) / 1000
      if (dt > 0.1) {  // throttle
        const instant = (loaded - lastReportLoaded) / dt
        smoothSpeed = smoothSpeed === 0 ? instant : smoothSpeed * 0.7 + instant * 0.3
        lastReportTime = now
        lastReportLoaded = loaded
      }
      const remaining = total - loaded
      const eta = smoothSpeed > 0 ? remaining / smoothSpeed : 0
      onProgress({ loaded, total, pct: (loaded / total) * 100, speed: smoothSpeed, eta })
    }
  }
}

function parseError(xhr: XMLHttpRequest): Error {
  if (xhr.status === 413) return new Error("ไฟล์ใหญ่เกินขีดจำกัดของระบบ")
  if (xhr.status === 401 || xhr.status === 403) return new Error("ไม่มีสิทธิ์อัปโหลด — กรุณาเข้าสู่ระบบใหม่")
  if (xhr.status === 409) return new Error("ไฟล์ซ้ำ — กรุณาลองใหม่")
  return new Error(`อัปโหลดล้มเหลว (${xhr.status}): ${xhr.responseText || xhr.statusText}`)
}

function b64(s: string): string {
  // base64 encode UTF-8 string
  return btoa(unescape(encodeURIComponent(s)))
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// ════════════════════════════════════════════════════════════════════
// Multi-file upload
// ════════════════════════════════════════════════════════════════════
export async function uploadTrainingFiles(
  files: File[],
  options?: {
    onProgress?: (overall: { loaded: number; total: number; pct: number; currentIdx: number; currentName: string }) => void
    signal?: AbortSignal
  }
): Promise<UploadResult[]> {
  const total = files.reduce((s, f) => s + f.size, 0)
  let loadedBefore = 0
  const results: UploadResult[] = []
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    const r = await uploadTrainingFile(f, {
      signal: options?.signal,
      onProgress: p => options?.onProgress?.({
        loaded: loadedBefore + p.loaded, total,
        pct: ((loadedBefore + p.loaded) / total) * 100,
        currentIdx: i, currentName: f.name,
      }),
    })
    results.push(r)
    loadedBefore += f.size
  }
  return results
}

// ════════════════════════════════════════════════════════════════════
// Formatters
// ════════════════════════════════════════════════════════════════════
export const fmtBytes = (b: number): string => {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}
export const fmtSpeed = (bps: number): string => `${(bps / 1024 / 1024).toFixed(1)} MB/s`
export const fmtEta = (sec: number): string => {
  if (sec < 60) return `${Math.ceil(sec)} วินาที`
  if (sec < 3600) return `${Math.ceil(sec / 60)} นาที`
  return `${Math.floor(sec / 3600)} ชม ${Math.ceil((sec % 3600) / 60)} น`
}
