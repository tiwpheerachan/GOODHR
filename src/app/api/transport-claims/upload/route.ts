import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const formData = await req.formData()
  const file = formData.get("file") as File | null
  if (!file) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })

  const ext = file.name.split(".").pop() || "bin"
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
  const path = `transport/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Try transport-receipts bucket, fallback to employee-avatars
  let publicUrl = ""
  const { error: upErr } = await supa.storage
    .from("transport-receipts")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (upErr) {
    // fallback
    const { error: upErr2 } = await supa.storage
      .from("employee-avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr2) return NextResponse.json({ error: `Upload failed: ${upErr2.message}` }, { status: 500 })
    const { data: { publicUrl: url } } = supa.storage.from("employee-avatars").getPublicUrl(path)
    publicUrl = url
  } else {
    const { data: { publicUrl: url } } = supa.storage.from("transport-receipts").getPublicUrl(path)
    publicUrl = url
  }

  return NextResponse.json({
    url: publicUrl,
    name: file.name,
    size: file.size,
    type: file.type,
  })
}
