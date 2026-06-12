import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

const ADMIN_ROLES = ["super_admin", "hr_admin"]

// POST /api/feishu-users/import
//   FormData: file = .xlsx
//   parse + upsert + auto-match (same algorithm as CLI script)
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const { data: u } = await svc.from("users").select("role").eq("id", user.id).single()
  if (!u || !ADMIN_ROLES.includes(u.role)) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const form = await req.formData()
  const file = form.get("file") as File | null
  if (!file) return NextResponse.json({ error: "no file" }, { status: 400 })
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "ไฟล์เกิน 20MB" }, { status: 400 })

  const XLSX = await import("xlsx")
  const buf = Buffer.from(await file.arrayBuffer())
  const wb = XLSX.read(buf)
  const ws = wb.Sheets["Sheet1"] || wb.Sheets[wb.SheetNames[0]]
  if (!ws) return NextResponse.json({ error: "ไม่พบ sheet" }, { status: 400 })

  const aoa = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: null })
  if (aoa.length < 3) return NextResponse.json({ error: "ไฟล์ว่าง" }, { status: 400 })

  // Row 0 = Tips, Row 1 = headers, Row 2+ = data
  const headers: any[] = aoa[1] || []
  const rows: any[][] = aoa.slice(2)

  const COL: Record<string, number> = {}
  headers.forEach((h, i) => { if (h) COL[String(h).trim()] = i })

  const colIdx = {
    user_id: COL["User ID"] ?? 0,
    user_id_revised: COL["User ID (Modified)"] ?? 1,
    name: COL["Name"] ?? 2,
    phone: COL["Contact phone number"] ?? 3,
    department: COL["Department"] ?? 4,
    work_email: COL["Work email"] ?? 5,
    biz_email: COL["Business email"] ?? 6,
    employee_number: COL["Employee number"] ?? 9,
    gender: COL["Gender"] ?? 10,
    city: COL["City"] ?? 11,
    direct_manager: COL["Direct Manager"] ?? 12,
    workforce_type: COL["Workforce Type"] ?? 13,
    start_date: COL["Start date"] ?? 16,
    job_title: COL["Job title"] ?? 18,
    status: COL["Status"] ?? 19,
    nickname: COL["Nickname"] ?? 20,
    english_name: COL["英文名"] ?? 22,
    brand: COL["负责品牌"] ?? 23,
    mentor: COL["导师"] ?? 26,
  }

  const s = (v: any) => { if (v === null || v === undefined) return null; const x = String(v).trim(); return x === "" ? null : x }
  const sLower = (v: any) => { const x = s(v); return x ? x.toLowerCase() : null }
  const sDate = (v: any) => { const x = s(v); return x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null }
  const parseName = (raw: any) => {
    if (!raw) return { d: null, cn: null, en: null, jp: null }
    const parts = String(raw).trim().split("|").map((p: string) => p.trim())
    const out: any = { d: parts[0] || null, cn: null, en: null, jp: null }
    for (const p of parts.slice(1)) {
      const m = p.match(/^(CN|EN|JP)\s*-\s*(.+)$/i)
      if (!m) continue
      out[m[1].toLowerCase()] = m[2].trim()
    }
    return out
  }

  const BATCH_ID = `web-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`
  const records: any[] = []
  for (const row of rows) {
    const userId = s(row[colIdx.user_id])
    if (!userId) continue
    const name = s(row[colIdx.name])
    if (!name) continue
    const parsed = parseName(name)
    records.push({
      feishu_user_id: userId,
      feishu_user_id_modified: s(row[colIdx.user_id_revised]),
      name: parsed.d || name,
      name_cn: parsed.cn, name_en: parsed.en, name_jp: parsed.jp,
      nickname: s(row[colIdx.nickname]),
      english_name_custom: s(row[colIdx.english_name]),
      employee_number: s(row[colIdx.employee_number]),
      email: sLower(row[colIdx.work_email]) || sLower(row[colIdx.biz_email]),
      email_work: sLower(row[colIdx.work_email]),
      email_business: sLower(row[colIdx.biz_email]),
      phone: s(row[colIdx.phone]),
      department_path: s(row[colIdx.department]),
      job_title: s(row[colIdx.job_title]),
      workforce_type: s(row[colIdx.workforce_type]),
      start_date: sDate(row[colIdx.start_date]),
      gender: s(row[colIdx.gender]),
      city: s(row[colIdx.city]),
      status: s(row[colIdx.status]),
      brand: s(row[colIdx.brand]),
      mentor: s(row[colIdx.mentor]),
      direct_manager_raw: s(row[colIdx.direct_manager]),
      last_imported_batch: BATCH_ID,
    })
  }

  // ── ดึง verified set ──
  const { data: existing } = await svc.from("feishu_users").select("feishu_user_id, manually_verified")
  const verified = new Set((existing ?? []).filter(r => r.manually_verified).map(r => r.feishu_user_id))

  let ok = 0, fail = 0
  for (let i = 0; i < records.length; i += 100) {
    const slice = records.slice(i, i + 100)
    const toUpsert = slice.map(r => {
      if (verified.has(r.feishu_user_id)) {
        const { goodhr_employee_id, match_method, match_confidence, matched_at, ...rest } = r
        return rest
      }
      return r
    })
    const { error, data } = await svc.from("feishu_users").upsert(toUpsert, {
      onConflict: "feishu_user_id",
    }).select("id")
    if (error) fail += slice.length
    else ok += (data?.length ?? slice.length)
  }

  return NextResponse.json({ success: true, imported: ok, failed: fail, total: records.length, batch_id: BATCH_ID })
}
