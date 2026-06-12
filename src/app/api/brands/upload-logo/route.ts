import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]
const BUCKET = "brand-logos"

// POST /api/brands/upload-logo
// FormData: { file: File, brand_id?: string }
// → { url: string }
export async function POST(req: NextRequest) {
  const cookieClient = createClient()
  const { data: { user } } = await cookieClient.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!dbUser || !ADMIN_ROLES.includes(dbUser.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  const brandId = (form.get("brand_id") as string | null) || ""
  if (!file) return NextResponse.json({ error: "ไม่มีไฟล์" }, { status: 400 })
  if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์เกิน 5MB" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "ต้องเป็นรูปภาพเท่านั้น" }, { status: 400 })

  const ext = (file.name.split(".").pop() || "png").toLowerCase()
  const base = brandId
    ? `${brandId}/${Date.now()}.${ext}`
    : `_unassigned/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const safe = base.replace(/[^a-zA-Z0-9._/-]/g, "_")

  // ensure bucket
  const { data: buckets } = await svc.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await svc.storage.createBucket(BUCKET, {
      public: true, fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
    })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await svc.storage.from(BUCKET).upload(safe, buf, {
    contentType: file.type, upsert: true,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = svc.storage.from(BUCKET).getPublicUrl(safe)
  return NextResponse.json({ url: data.publicUrl, path: safe })
}
