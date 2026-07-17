import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getBranchEvalAccess } from "@/lib/utils/branch-eval-permissions"

// POST — อัปโหลดรูป/ไฟล์เช็คลิสต์ (multipart: file)
//   → { url, storage_path, name, mime, size, is_image }
//   bucket "store-checklist" รับทุกชนิดไฟล์ สูงสุด 100 MB
const BUCKET = "store-checklist"
const MAX = 100 * 1024 * 1024

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getBranchEvalAccess(svc, user.id)
  if (!access.employeeId) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "missing file" }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: "ไฟล์ใหญ่เกิน 100 MB" }, { status: 400 })

  const rawName = (file.name || "file").replace(/[^\w.\-ก-๙ ]/g, "_")
  const ext = (rawName.split(".").pop() || "bin").toLowerCase()
  const stamp = Date.now()
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${access.employeeId}/${stamp}_${rand}.${ext}`

  const buf = Buffer.from(await file.arrayBuffer())
  const mime = file.type || "application/octet-stream"
  const { error: upErr } = await svc.storage.from(BUCKET).upload(path, buf, { contentType: mime, upsert: false })
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({
    url: pub.publicUrl, storage_path: path,
    name: rawName, mime, size: file.size, is_image: mime.startsWith("image/"),
  })
}
