#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Import Feishu Contacts Excel → feishu_users + auto-match GoodHR
//
// Usage:
//   node scripts/import_feishu_users.js [path/to/contacts.xlsx]
//
// ที่ทำ:
//   1. Parse Excel (skip Tips row, header row 1, data row 2+)
//   2. Upsert ลง feishu_users by feishu_user_id
//   3. Auto-match กับ GoodHR ตาม priority:
//        a) existing employees.feishu_user_id (สำหรับ re-import)
//        b) email exact (work/business/contact)
//        c) nickname lowercase
//        d) name_en (extract จาก "EN-..." pattern)
//   4. Report stats
// ════════════════════════════════════════════════════════════════════

const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")
const crypto = require("crypto")

const SRC = process.argv[2] || "/Users/tiw/Downloads/SHD TECHNOLOGY LIMITED-Contacts-Export(2).xlsx"
const BATCH_ID = `batch-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}`

// ── Load env ──
const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8")
const env = envContent.split("\n").reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.+)$/)
  if (m) a[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "")
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ─── Column index ──
// row 1 ของ Sheet1 มี header (offset เพราะ Tips อยู่ row 0)
// XLSX json_to_sheet ใช้ keys แปลก — ใช้ array of arrays ดีกว่า
function parseRows() {
  const wb = XLSX.readFile(SRC)
  const ws = wb.Sheets["Sheet1"]
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

  // Row 0 = Tips. Row 1 = headers. Row 2+ = data
  const headers = aoa[1] || []
  const rows = aoa.slice(2)

  // map column index → header (lowercased simple)
  const COL = {}
  headers.forEach((h, i) => {
    if (!h) return
    COL[String(h).trim()] = i
  })

  return { headers, rows, COL }
}

// ── Parse name ──
// raw รูปแบบ: "陈安琪|CN-陈安琪|EN-Clara|JP-アンキ"
function parseName(raw) {
  if (!raw) return { default: null, cn: null, en: null, jp: null }
  const s = String(raw).trim()
  const parts = s.split("|").map(x => x.trim())
  const out = { default: parts[0] || null, cn: null, en: null, jp: null }
  for (const p of parts.slice(1)) {
    const m = p.match(/^(CN|EN|JP)\s*-\s*(.+)$/i)
    if (!m) continue
    const lang = m[1].toUpperCase()
    if (lang === "CN") out.cn = m[2].trim()
    else if (lang === "EN") out.en = m[2].trim()
    else if (lang === "JP") out.jp = m[2].trim()
  }
  return out
}

function s(v) {
  if (v === null || v === undefined) return null
  const str = String(v).trim()
  return str === "" ? null : str
}
function sLower(v) {
  const x = s(v); return x ? x.toLowerCase() : null
}
function sDate(v) {
  const x = s(v); if (!x) return null
  // ลอง parse YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(x)) return x
  return null
}

;(async () => {
  console.log("📂 อ่านไฟล์:", SRC)
  const { headers, rows, COL } = parseRows()
  console.log(`📊 พบ ${rows.length} แถวข้อมูล`)

  // index columns ที่ใช้
  const colIdx = {
    user_id:           COL["User ID"] ?? 0,
    user_id_revised:   COL["User ID (Modified)"] ?? 1,
    name:              COL["Name"] ?? 2,
    phone:             COL["Contact phone number"] ?? 3,
    department:        COL["Department"] ?? 4,
    work_email:        COL["Work email"] ?? 5,
    biz_email:         COL["Business email"] ?? 6,
    employee_number:   COL["Employee number"] ?? 9,
    gender:            COL["Gender"] ?? 10,
    city:              COL["City"] ?? 11,
    direct_manager:    COL["Direct Manager"] ?? 12,
    workforce_type:    COL["Workforce Type"] ?? 13,
    start_date:        COL["Start date"] ?? 16,
    job_title:         COL["Job title"] ?? 18,
    status:            COL["Status"] ?? 19,
    nickname:          COL["Nickname"] ?? 20,
    english_name:      COL["英文名"] ?? 22,
    brand:             COL["负责品牌"] ?? 23,
    mentor:            COL["导师"] ?? 26,
  }
  console.log("📌 Column mapping:")
  Object.entries(colIdx).forEach(([k, v]) => console.log(`   ${k.padEnd(20)} → col ${v}`))

  // ── 1. แปลง rows เป็น records ──
  const records = []
  for (const row of rows) {
    const userId = s(row[colIdx.user_id])
    if (!userId) continue  // ต้องมี Feishu User ID
    const name = s(row[colIdx.name])
    if (!name) continue

    const parsed = parseName(name)
    records.push({
      feishu_user_id: userId,
      feishu_user_id_modified: s(row[colIdx.user_id_revised]),
      name: parsed.default || name,
      name_cn: parsed.cn,
      name_en: parsed.en,
      name_jp: parsed.jp,
      nickname: s(row[colIdx.nickname]),
      english_name_custom: s(row[colIdx.english_name]),
      employee_number: s(row[colIdx.employee_number]),
      email:          sLower(row[colIdx.work_email]) || sLower(row[colIdx.biz_email]),
      email_work:     sLower(row[colIdx.work_email]),
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
      raw_payload: Object.fromEntries(Object.entries(colIdx).map(([k, i]) => [k, row[i]])),
    })
  }
  console.log(`✓ พร้อม upsert ${records.length} records`)

  // ── 2. ดึง GoodHR employees ──
  console.log("🔎 ดึงข้อมูล GoodHR employees...")
  const { data: emps } = await sb.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, nickname_en, email, feishu_user_id, is_active")

  // build indexes สำหรับ match
  const byFeishuId = new Map()
  const byEmail = new Map()
  const byNickEn = new Map()
  const byNickTh = new Map()
  const byFirstNameEn = new Map()
  for (const e of (emps ?? [])) {
    if (e.feishu_user_id) byFeishuId.set(e.feishu_user_id, e)
    if (e.email) byEmail.set(e.email.trim().toLowerCase(), e)
    if (e.nickname_en) byNickEn.set(e.nickname_en.trim().toLowerCase(), e)
    if (e.nickname)    byNickTh.set(e.nickname.trim().toLowerCase(), e)
    if (e.first_name_en) byFirstNameEn.set(e.first_name_en.trim().toLowerCase(), e)
  }
  console.log(`   GoodHR: ${emps?.length ?? 0} คน · มี feishu_user_id แล้ว ${byFeishuId.size}`)

  // ── 3. Auto-match (ยกเว้น record ที่มี manually_verified=true) ──
  console.log("🤖 รัน auto-match...")
  // ดึง manually_verified status ปัจจุบัน
  const { data: existing } = await sb.from("feishu_users")
    .select("feishu_user_id, goodhr_employee_id, manually_verified")
  const verifiedSet = new Set((existing ?? []).filter(r => r.manually_verified).map(r => r.feishu_user_id))

  let m_existing = 0, m_email = 0, m_nick_en = 0, m_nick_th = 0, m_name_en = 0, m_none = 0

  for (const r of records) {
    // skip ถ้า manually verified แล้ว — รักษา manual mapping ไว้
    if (verifiedSet.has(r.feishu_user_id)) continue

    let match = null, method = null, confidence = 0
    // 1. existing feishu_user_id mapping (re-import case)
    if (byFeishuId.has(r.feishu_user_id)) {
      match = byFeishuId.get(r.feishu_user_id); method = "code"; confidence = 100
      m_existing++
    }
    // 2. email exact
    else if (r.email && byEmail.has(r.email)) {
      match = byEmail.get(r.email); method = "email"; confidence = 95
      m_email++
    }
    else if (r.email_work && byEmail.has(r.email_work)) {
      match = byEmail.get(r.email_work); method = "email"; confidence = 95
      m_email++
    }
    else if (r.email_business && byEmail.has(r.email_business)) {
      match = byEmail.get(r.email_business); method = "email"; confidence = 92
      m_email++
    }
    // 3. nickname EN
    else if (r.nickname) {
      const nk = r.nickname.toLowerCase()
      if (byNickEn.has(nk))      { match = byNickEn.get(nk); method = "nickname"; confidence = 88; m_nick_en++ }
      else if (byNickTh.has(nk)) { match = byNickTh.get(nk); method = "nickname"; confidence = 75; m_nick_th++ }
    }
    // 4. name_en (จาก "EN-XXX")
    if (!match && r.name_en) {
      const ne = r.name_en.toLowerCase()
      if (byFirstNameEn.has(ne))    { match = byFirstNameEn.get(ne); method = "name_en"; confidence = 70; m_name_en++ }
      else if (byNickEn.has(ne))    { match = byNickEn.get(ne); method = "name_en"; confidence = 78; m_name_en++ }
    }

    if (match) {
      r.goodhr_employee_id = match.id
      r.match_method = method
      r.match_confidence = confidence
      r.matched_at = new Date().toISOString()
    } else {
      m_none++
    }
  }

  console.log(`   ━━━ match results ━━━`)
  console.log(`   existing FUID: ${m_existing}`)
  console.log(`   email:         ${m_email}`)
  console.log(`   nickname EN:   ${m_nick_en}`)
  console.log(`   nickname TH:   ${m_nick_th}`)
  console.log(`   name_en:       ${m_name_en}`)
  console.log(`   total matched: ${records.length - m_none}/${records.length}`)
  console.log(`   no match:      ${m_none}`)

  // ── 4. Upsert ลง DB (batch 100) ──
  console.log("\n💾 Upserting...")
  let ok = 0, fail = 0
  for (let i = 0; i < records.length; i += 100) {
    const slice = records.slice(i, i + 100)
    // ── สำหรับ manually_verified record → ไม่ overwrite mapping fields ──
    //    เราใช้ upsert แบบ ON CONFLICT แต่ต้องระวัง preserve manually_verified mapping
    //    วิธี: แยกเป็น 2 batch
    const toInsert = []
    for (const r of slice) {
      if (verifiedSet.has(r.feishu_user_id)) {
        // ไม่ override mapping — แต่อัพเดต Feishu fields ทั่วไป
        const { goodhr_employee_id, match_method, match_confidence, matched_at, ...rest } = r
        toInsert.push(rest)
      } else {
        toInsert.push(r)
      }
    }
    const { error, data } = await sb.from("feishu_users").upsert(toInsert, {
      onConflict: "feishu_user_id",
      ignoreDuplicates: false,
    }).select("id")
    if (error) { console.error("  ❌", error.message); fail += slice.length }
    else { ok += data?.length ?? slice.length; process.stdout.write(`\r   ✓ ${ok}/${records.length}`) }
  }

  console.log(`\n\n══════════════════════════════════════════════════════════`)
  console.log(`  Total records:    ${records.length}`)
  console.log(`  Upsert success:   ${ok}`)
  console.log(`  Upsert failed:    ${fail}`)
  console.log(`  Matched:          ${records.length - m_none}`)
  console.log(`  Unmatched:        ${m_none}`)
  console.log(`  Batch ID:         ${BATCH_ID}`)
  console.log(`══════════════════════════════════════════════════════════`)
})()
