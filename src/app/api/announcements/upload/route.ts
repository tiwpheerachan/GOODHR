import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const formData = await req.formData()
  const file = formData.get("file") as File
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const ext = file.name.split(".").pop() || "jpg"
  const path = `announcements/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: upErr } = await supa.storage.from("announcement-images")
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (upErr) {
    // Bucket might not exist — try employee-avatars bucket as fallback
    const { error: upErr2 } = await supa.storage.from("employee-avatars")
      .upload(path, buffer, { contentType: file.type, upsert: true })
    if (upErr2) return NextResponse.json({ error: `Upload failed: ${upErr.message}. Fallback: ${upErr2.message}` }, { status: 500 })
    const { data: { publicUrl } } = supa.storage.from("employee-avatars").getPublicUrl(path)
    return NextResponse.json({ url: publicUrl })
  }

  const { data: { publicUrl } } = supa.storage.from("announcement-images").getPublicUrl(path)
  return NextResponse.json({ url: publicUrl })
}
