import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { requireTrainingAdmin } from "@/lib/utils/training-permissions"

const MAX_SIZE_VIDEO = 500 * 1024 * 1024  // 500 MB
const MAX_SIZE_DOC = 50 * 1024 * 1024     // 50 MB
const ALLOWED_VIDEO = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"]
const ALLOWED_DOC = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/jpeg", "image/png", "image/webp", "image/gif",
]

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const guard = await requireTrainingAdmin(svc, user.id)
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: 403 })

  const formData = await req.formData()
  const files: File[] = []
  const singleFile = formData.get("file") as File | null
  if (singleFile) files.push(singleFile)
  const multiFiles = formData.getAll("files") as File[]
  if (multiFiles.length > 0) files.push(...multiFiles)

  if (files.length === 0) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })

  const results: { url: string; name: string; size: number; type: string }[] = []
  const errors: string[] = []

  for (const file of files) {
    const isVideo = file.type.startsWith("video/")
    const max = isVideo ? MAX_SIZE_VIDEO : MAX_SIZE_DOC
    const allowed = isVideo ? ALLOWED_VIDEO : ALLOWED_DOC

    if (file.size > max) {
      errors.push(`${file.name}: ไฟล์ใหญ่เกินไป (สูงสุด ${Math.round(max / 1024 / 1024)} MB)`)
      continue
    }
    if (!allowed.includes(file.type)) {
      errors.push(`${file.name}: ไม่รองรับประเภทไฟล์ (${file.type})`)
      continue
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const folder = isVideo ? "videos" : "documents"
    const path = `training/${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await svc.storage
      .from("training-content")
      .upload(path, buffer, { contentType: file.type, upsert: false })

    if (upErr) {
      errors.push(`${file.name}: ${upErr.message}`)
      continue
    }

    const { data: { publicUrl } } = svc.storage.from("training-content").getPublicUrl(path)
    results.push({ url: publicUrl, name: file.name, size: file.size, type: file.type })
  }

  if (results.length === 0) {
    return NextResponse.json({ error: errors.join("; ") || "อัปโหลดไม่สำเร็จ" }, { status: 400 })
  }
  return NextResponse.json({ files: results, errors })
}
