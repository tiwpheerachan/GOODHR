import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import reg from "@/lib/regulations-content.json"

// ════════════════════════════════════════════════════════════════════
// ระเบียบข้อบังคับการทำงาน — ฝั่งพนักงาน
//   GET   → { version, acknowledged, ack? }  สถานะการเซ็นของตัวเอง
//   POST  { signature (dataURL png), signed_name } → บันทึกการยินยอม + ลายเซ็น
// ════════════════════════════════════════════════════════════════════

const BUCKET = "regulation-signatures"
const VERSION = (reg as any).version as string

async function getMe() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users")
    .select("id, employee_id").eq("id", user.id).single()
  if (!dbUser?.employee_id) {
    return { error: NextResponse.json({ error: "ไม่พบข้อมูลพนักงาน" }, { status: 404 }) }
  }
  return { svc, employeeId: dbUser.employee_id as string }
}

async function ensureBucket(svc: any) {
  const { data: buckets } = await svc.storage.listBuckets()
  if (!buckets?.find((b: any) => b.name === BUCKET)) {
    await svc.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 2 * 1024 * 1024 })
  }
}

export async function GET() {
  const m = await getMe()
  if (m.error) return m.error
  const { svc, employeeId } = m
  const { data: ack } = await svc.from("regulation_acknowledgements")
    .select("*").eq("employee_id", employeeId).eq("version", VERSION).maybeSingle()
  return NextResponse.json({ version: VERSION, acknowledged: !!ack, ack: ack ?? null })
}

export async function POST(req: NextRequest) {
  const m = await getMe()
  if (m.error) return m.error
  const { svc, employeeId } = m

  const body = await req.json().catch(() => ({}))
  const signature = (body?.signature ?? "").toString()   // data:image/png;base64,....
  const signedName = (body?.signed_name ?? "").toString().trim()
  if (!signature.startsWith("data:image/")) {
    return NextResponse.json({ error: "กรุณาลงลายเซ็น" }, { status: 400 })
  }

  // ป้องกันเซ็นซ้ำเวอร์ชันเดิม
  const { data: existing } = await svc.from("regulation_acknowledgements")
    .select("id").eq("employee_id", employeeId).eq("version", VERSION).maybeSingle()
  if (existing) return NextResponse.json({ error: "คุณได้ลงนามรับทราบเอกสารนี้แล้ว" }, { status: 409 })

  // company_id ของพนักงาน
  const { data: emp } = await svc.from("employees").select("company_id").eq("id", employeeId).maybeSingle()

  // อัปโหลดลายเซ็น
  let signatureUrl: string | null = null
  try {
    await ensureBucket(svc)
    const b64 = signature.split(",")[1] ?? ""
    const buf = Buffer.from(b64, "base64")
    const path = `${employeeId}/${VERSION}.png`
    const { error: upErr } = await svc.storage.from(BUCKET)
      .upload(path, buf, { upsert: true, contentType: "image/png" })
    if (upErr) throw upErr
    const { data: pub } = svc.storage.from(BUCKET).getPublicUrl(path)
    signatureUrl = pub?.publicUrl ?? null
  } catch (e: any) {
    return NextResponse.json({ error: "อัปโหลดลายเซ็นไม่สำเร็จ: " + (e?.message || "") }, { status: 500 })
  }

  const { error } = await svc.from("regulation_acknowledgements").insert({
    employee_id: employeeId,
    company_id: emp?.company_id ?? null,
    version: VERSION,
    signature_url: signatureUrl,
    signed_name: signedName || null,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
