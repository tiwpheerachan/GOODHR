import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

const MAX_SIZE = 10 * 1024 * 1024  // 10 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const formData = await req.formData()

  // Support both single "file" and multiple "files"
  const files: File[] = []
  const singleFile = formData.get("file") as File | null
  if (singleFile) files.push(singleFile)
  const multiFiles = formData.getAll("files") as File[]
  if (multiFiles.length > 0) files.push(...multiFiles)

  if (files.length === 0) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })
  if (files.length > 10) return NextResponse.json({ error: "สูงสุด 10 ไฟล์" }, { status: 400 })

  const results: { url: string; name: string; size: number; type: string }[] = []
  const errors: string[] = []

  for (const file of files) {
    if (file.size > MAX_SIZE) {
      errors.push(`${file.name}: ไฟล์ใหญ่เกินไป (สูงสุด 10 MB)`)
      continue
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(`${file.name}: รองรับเฉพาะ รูปภาพ, PDF, Word`)
      continue
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `leave/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    let publicUrl = ""
    const { error: upErr } = await supa.storage
      .from("leave-attachments")
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (upErr) {
      const { error: upErr2 } = await supa.storage
        .from("employee-avatars")
        .upload(path, buffer, { contentType: file.type, upsert: true })
      if (upErr2) { errors.push(`${file.name}: Upload failed`); continue }
      const { data: { publicUrl: url } } = supa.storage.from("employee-avatars").getPublicUrl(path)
      publicUrl = url
    } else {
      const { data: { publicUrl: url } } = supa.storage.from("leave-attachments").getPublicUrl(path)
      publicUrl = url
    }

    results.push({ url: publicUrl, name: file.name, size: file.size, type: file.type })
  }

  if (results.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 })
  }

  // Backward compatible
  return NextResponse.json({
    url: results[0]?.url || null,
    name: results[0]?.name || null,
    size: results[0]?.size || null,
    type: results[0]?.type || null,
    files: results,
    errors: errors.length > 0 ? errors : undefined,
  })
}
