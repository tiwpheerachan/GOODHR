import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// POST /api/sample-requests/upload
//   FormData: { file: File, record_id?: string }
//   → { url, name, size }
//
// ⚠️ Storage bucket = "sample-request-returns" (public)
//    ระบบ Feishu sync จะ download จาก URL นี้ไปแนบในฟอร์ม → URL ต้อง public ถาวร
//    ไฟล์ ≤ 50MB (engine limit), HR เป็นคนอัพ
const BUCKET = "sample-request-returns"
const MAX_BYTES = 50 * 1024 * 1024  // 50MB ตาม engine limit

export async function POST(req: NextRequest) {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()

  // ── Auth: เฉพาะ admin/equipment_admin ──
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  const ADMIN_ROLES = ["super_admin", "hr_admin", "equipment_admin"]
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  const recordId = (form.get("record_id") as string | null) || ""
  if (!file) return NextResponse.json({ error: "ไม่มีไฟล์" }, { status: 400 })
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `ไฟล์เกิน 50MB (Feishu sync limit)` }, { status: 400 })
  }

  // ── สร้าง path ──
  const ext = (file.name.split(".").pop() || "bin").toLowerCase()
  const safeName = file.name.replace(/[^a-zA-Z0-9฀-๿._-]/g, "_").slice(0, 100)
  const folder = recordId ? recordId.replace(/[^a-zA-Z0-9_-]/g, "_") : "_unassigned"
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`

  // ── ensure bucket (public) ──
  const { data: buckets } = await svc.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await svc.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await svc.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = svc.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({
    url: data.publicUrl,
    name: file.name,
    size: file.size,
    path,
  })
}
