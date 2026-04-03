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
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })

  // Validate size
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "ไฟล์ใหญ่เกินไป (สูงสุด 10 MB)" }, { status: 400 })
  }

  // Validate type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "รองรับเฉพาะไฟล์ รูปภาพ, PDF, Word" }, { status: 400 })
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `leave/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Try leave-attachments bucket, fallback to employee-avatars
  let publicUrl = ""
  const { error: upErr } = await supa.storage
    .from("leave-attachments")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (upErr) {
    // fallback bucket
    const { error: upErr2 } = await supa.storage
      .from("employee-avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr2) return NextResponse.json({ error: `Upload failed: ${upErr2.message}` }, { status: 500 })
    const { data: { publicUrl: url } } = supa.storage.from("employee-avatars").getPublicUrl(path)
    publicUrl = url
  } else {
    const { data: { publicUrl: url } } = supa.storage.from("leave-attachments").getPublicUrl(path)
    publicUrl = url
  }

  return NextResponse.json({
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  })
}
