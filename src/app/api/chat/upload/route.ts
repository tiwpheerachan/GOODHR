import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const formData = await req.formData()
  const files = formData.getAll("files") as File[]
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 })

  const results: Array<{ url: string; name: string; size: number; type: string }> = []

  for (const file of files) {
    const ext = file.name.split(".").pop() || "bin"
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `chat/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Try chat-images bucket first, fallback to employee-avatars
    const { error: upErr } = await supa.storage.from("chat-images")
      .upload(path, buffer, { contentType: file.type, upsert: true })

    // Encode original filename as query param so client can display it
    const nameParam = `?name=${encodeURIComponent(file.name)}`

    if (upErr) {
      const { error: upErr2 } = await supa.storage.from("employee-avatars")
        .upload(path, buffer, { contentType: file.type, upsert: true })
      if (upErr2) return NextResponse.json({ error: `Upload failed: ${upErr2.message}` }, { status: 500 })
      const { data: { publicUrl } } = supa.storage.from("employee-avatars").getPublicUrl(path)
      results.push({ url: publicUrl + nameParam, name: file.name, size: file.size, type: file.type })
    } else {
      const { data: { publicUrl } } = supa.storage.from("chat-images").getPublicUrl(path)
      results.push({ url: publicUrl + nameParam, name: file.name, size: file.size, type: file.type })
    }
  }

  // Backward compat: also return flat urls array
  return NextResponse.json({ urls: results.map((r: any) => r.url), files: results })
}
