import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// ════════════════════════════════════════════════════════════════════
// เอกสารพนักงาน (employee_documents)
//   GET    ?employee_id=...        → รายการเอกสารของพนักงาน (admin)
//   POST   multipart: employee_id, files[], names[]  → อัปโหลดหลายไฟล์ + insert (admin)
//   DELETE ?id=...                 → ลบเอกสาร + ไฟล์ใน storage (admin)
// ════════════════════════════════════════════════════════════════════

const BUCKET = "employee-documents"
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB
const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain", "text/csv",
]

async function getAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  const svc = createServiceClient()
  const { data: dbUser } = await svc.from("users").select("*").eq("id", user.id).single()
  if (!dbUser) return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) }
  if (!["hr_admin", "super_admin"].includes(dbUser.role)) {
    return { error: NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 }) }
  }
  return { svc, dbUser }
}

// ตัดนามสกุลออกจากชื่อไฟล์ → ใช้เป็นชื่อ default
function stripExt(fileName: string): string {
  return fileName.replace(/\.[^./\\]+$/, "").trim() || fileName
}

async function ensureBucket(svc: any) {
  const { data: buckets } = await svc.storage.listBuckets()
  if (!buckets?.find((b: any) => b.name === BUCKET)) {
    // ไม่จำกัด allowedMimeTypes ที่ระดับ bucket (validate ในโค้ดแล้ว) — กันเคสไฟล์ที่ browser ส่ง type ว่าง
    await svc.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_SIZE,
    })
  }
}

export async function GET(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const employeeId = req.nextUrl.searchParams.get("employee_id")
  if (!employeeId) return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })

  const { data, error } = await svc.from("employee_documents")
    .select("*")
    .eq("employee_id", employeeId)
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ documents: data ?? [] })
}

export async function POST(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc, dbUser } = a

  const form = await req.formData()
  const employeeId = form.get("employee_id") as string | null
  if (!employeeId) return NextResponse.json({ error: "employee_id จำเป็น" }, { status: 400 })

  const files = form.getAll("files") as File[]
  const names = form.getAll("names") as string[]  // parallel กับ files (อาจว่าง = ใช้ชื่อไฟล์)
  // หมวด (Section A–F/custom) + รายการ checklist (1–20) — ใช้กับทุกไฟล์ในคำขอนี้
  const category = ((form.get("category") as string | null) ?? "").toString().trim() || null
  const checklistKey = ((form.get("checklist_key") as string | null) ?? "").toString().trim() || null
  if (!files || files.length === 0) return NextResponse.json({ error: "ไม่พบไฟล์" }, { status: 400 })
  if (files.length > 20) return NextResponse.json({ error: "สูงสุด 20 ไฟล์ต่อครั้ง" }, { status: 400 })

  await ensureBucket(svc)

  const { data: emp } = await svc.from("employees").select("company_id").eq("id", employeeId).single()

  const created: any[] = []
  const errors: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!(file instanceof File) || file.size === 0) continue
    if (file.size > MAX_SIZE) { errors.push(`${file.name}: ไฟล์ใหญ่เกิน 20 MB`); continue }
    if (file.type && !ALLOWED_TYPES.includes(file.type)) {
      errors.push(`${file.name}: ชนิดไฟล์ไม่รองรับ`); continue
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
    const path = `${employeeId}/${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: upErr } = await svc.storage
      .from(BUCKET).upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: true })
    if (upErr) { errors.push(`${file.name}: อัปโหลดล้มเหลว (${upErr.message})`); continue }

    const { data: { publicUrl } } = svc.storage.from(BUCKET).getPublicUrl(path)

    // ชื่อเอกสาร: ตั้งเอง หรือ default = ชื่อไฟล์ (ตัดนามสกุล)
    const customName = (names[i] ?? "").toString().trim()
    const docName = customName || stripExt(file.name)

    const { data: row, error: insErr } = await svc.from("employee_documents").insert({
      employee_id: employeeId,
      company_id: emp?.company_id ?? null,
      name: docName,
      file_url: publicUrl,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || null,
      storage_path: path,
      uploaded_by: dbUser.employee_id ?? null,
      category: category,
      checklist_key: checklistKey,
    }).select("*").single()
    if (insErr) { errors.push(`${file.name}: บันทึกล้มเหลว (${insErr.message})`); continue }
    created.push(row)
  }

  if (created.length === 0) {
    return NextResponse.json({ error: errors.join("; ") || "อัปโหลดไม่สำเร็จ" }, { status: 500 })
  }
  return NextResponse.json({ success: true, documents: created, errors: errors.length ? errors : undefined })
}

export async function DELETE(req: NextRequest) {
  const a = await getAdmin()
  if (a.error) return a.error
  const { svc } = a
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id จำเป็น" }, { status: 400 })

  // ลบไฟล์ใน storage ก่อน (ถ้ามี path)
  const { data: doc } = await svc.from("employee_documents").select("storage_path").eq("id", id).single()
  if (doc?.storage_path) {
    await svc.storage.from(BUCKET).remove([doc.storage_path])
  }
  const { error } = await svc.from("employee_documents").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
