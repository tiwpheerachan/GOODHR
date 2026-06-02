import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getProductSaleAccess, canRecordSale } from "@/lib/utils/product-sale-permissions"

const BUCKET = "products"

// POST /api/products/sales/upload-photo
// FormData: file (File)
// → คืน { url: "https://...", path: "sales-proofs/..." }
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()

  const me = await getProductSaleAccess(svc, user.id)
  if (!canRecordSale(me.access)) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "ไม่มีไฟล์" }, { status: 400 })
  if (file.size > 12 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์เกิน 12MB" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "ต้องเป็นรูปภาพ" }, { status: 400 })

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase()
  const today = new Date().toISOString().slice(0, 10)
  const safe = `sales-proofs/${today}/${me.employeeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  // ensure bucket
  const { data: buckets } = await svc.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    await svc.storage.createBucket(BUCKET, {
      public: true, fileSizeLimit: 12 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    })
  }

  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await svc.storage.from(BUCKET).upload(safe, buf, {
    contentType: file.type, upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const { data } = svc.storage.from(BUCKET).getPublicUrl(safe)
  return NextResponse.json({ url: data.publicUrl, path: safe })
}
