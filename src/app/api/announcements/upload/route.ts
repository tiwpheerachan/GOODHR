import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const formData = await req.formData()

  // Support multiple files: "file" (single) or "files" (multiple)
  const files: File[] = []
  const singleFile = formData.get("file") as File | null
  if (singleFile) files.push(singleFile)

  const multiFiles = formData.getAll("files") as File[]
  if (multiFiles.length > 0) files.push(...multiFiles)

  if (files.length === 0) return NextResponse.json({ error: "No file" }, { status: 400 })
  if (files.length > 10) return NextResponse.json({ error: "สูงสุด 10 รูป" }, { status: 400 })

  const urls: string[] = []
  const errors: string[] = []

  for (const file of files) {
    const ext = file.name.split(".").pop() || "jpg"
    const path = `announcements/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: upErr } = await supa.storage.from("announcement-images")
      .upload(path, buffer, { contentType: file.type, upsert: true })

    if (upErr) {
      // Fallback to employee-avatars bucket
      const { error: upErr2 } = await supa.storage.from("employee-avatars")
        .upload(path, buffer, { contentType: file.type, upsert: true })
      if (upErr2) {
        errors.push(`${file.name}: ${upErr.message}`)
        continue
      }
      const { data: { publicUrl } } = supa.storage.from("employee-avatars").getPublicUrl(path)
      urls.push(publicUrl)
    } else {
      const { data: { publicUrl } } = supa.storage.from("announcement-images").getPublicUrl(path)
      urls.push(publicUrl)
    }
  }

  if (urls.length === 0 && errors.length > 0) {
    return NextResponse.json({ error: errors.join("; ") }, { status: 500 })
  }

  // Backward compatible: single file returns `url`, multi returns `urls`
  return NextResponse.json({
    url: urls[0] || null,
    urls,
    errors: errors.length > 0 ? errors : undefined,
  })
}
