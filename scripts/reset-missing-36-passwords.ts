/**
 * รีเซ็ตรหัสผ่าน 36 พนักงาน RABBIT+PTC ที่ credentials หายจากรอบแรก
 * แล้วรวม credentials ทั้งหมดเป็นไฟล์เดียว
 *
 * Usage: npx tsx scripts/reset-missing-36-passwords.ts
 */

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import fs from "fs"
import path from "path"

const SUPABASE_URL = "https://kqlumdrkoopykmmylnhf.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40"

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const specials = "!@#$%"
  let password = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length - 1; i++) {
    password += chars[bytes[i] % chars.length]
  }
  password += specials[bytes[length - 1] % specials.length]
  const arr = password.split("")
  const swapIdx = bytes[0] % (length - 1)
  ;[arr[swapIdx], arr[length - 1]] = [arr[length - 1], arr[swapIdx]]
  return arr.join("")
}

// 36 employee codes ที่ credentials หาย (RABBIT 15 + PTC 21)
const MISSING_36_CODES = [
  // RABBIT (15)
  "63000004", "63000013", "66000103", "67000016", "67000047",
  "67000048", "67000079", "67000122", "67000131", "67000141",
  "67000142", "68000083", "68000092", "68000181", "68000191",
  // PTC (21)
  "68000010", "69000017", "69000018", "69000023", "68000255",
  "68000192", "67000074", "68000216", "69000021", "69000028",
  "67000057", "69000005", "68000233", "69000004", "68000124",
  "69000016", "69000027", "67000187", "69000010", "69000026",
  "68000248",
]

async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log("🔑 รีเซ็ตรหัสผ่าน 36 คน RABBIT+PTC")
  console.log("═══════════════════════════════════════════════════\n")

  // ดึง employee data จาก DB
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, email")
    .in("employee_code", MISSING_36_CODES)

  if (empErr) { console.error("❌", empErr.message); process.exit(1) }
  console.log(`📊 พบพนักงานใน DB: ${employees?.length || 0} คน\n`)

  // ดึง users เพื่อหา auth user id
  const empIds = (employees || []).map(e => e.id)
  const { data: users } = await supabase
    .from("users")
    .select("id, employee_id")
    .in("employee_id", empIds)

  const userMap = new Map((users || []).map(u => [u.employee_id, u.id]))

  const credentials: Array<{ code: string; name: string; email: string; password: string }> = []
  let success = 0, failed = 0

  for (const emp of employees || []) {
    const authUserId = userMap.get(emp.id)
    if (!authUserId) {
      console.log(`   ⚠️ ${emp.employee_code}: ไม่พบ auth user — ข้าม`)
      failed++
      continue
    }

    const newPassword = generatePassword(10)
    const { error: updateErr } = await supabase.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    })

    if (updateErr) {
      console.log(`   ❌ ${emp.employee_code}: ${updateErr.message}`)
      failed++
      continue
    }

    credentials.push({
      code: emp.employee_code,
      name: `${emp.first_name_th} ${emp.last_name_th}`,
      email: emp.email,
      password: newPassword,
    })
    success++
  }

  console.log(`\n✅ รีเซ็ตสำเร็จ: ${success}`)
  console.log(`❌ ล้มเหลว: ${failed}`)

  // บันทึก credentials ของ 36 คน
  const credPath36 = path.join(__dirname, "credentials-rabbit-ptc-36.json")
  fs.writeFileSync(credPath36, JSON.stringify(credentials, null, 2), "utf-8")
  console.log(`\n📁 Credentials 36 คน: ${credPath36}`)

  // ── รวม credentials ทั้งหมด ──
  console.log("\n═══ รวม Credentials ทั้งหมด ═══")

  // อ่านไฟล์เดิม
  const v2Path = path.join(__dirname, "credentials-2026-03-16-v2.json")
  const topOnePath = path.join(__dirname, "credentials-missing-2026-03-16.json")

  let allCreds: Array<{ code: string; name: string; email: string; password: string }> = []

  if (fs.existsSync(v2Path)) {
    const v2 = JSON.parse(fs.readFileSync(v2Path, "utf-8"))
    allCreds.push(...v2)
    console.log(`   + credentials-2026-03-16-v2.json: ${v2.length} คน`)
  }

  // เพิ่ม 36 คน RABBIT+PTC
  allCreds.push(...credentials)
  console.log(`   + RABBIT+PTC 36 คน: ${credentials.length} คน`)

  if (fs.existsSync(topOnePath)) {
    const topOne = JSON.parse(fs.readFileSync(topOnePath, "utf-8"))
    allCreds.push(...topOne)
    console.log(`   + credentials-missing (TOP ONE): ${topOne.length} คน`)
  }

  // Sort by code
  allCreds.sort((a, b) => a.code.localeCompare(b.code))

  // Remove duplicates (keep last = newest password)
  const seen = new Map<string, typeof allCreds[0]>()
  for (const c of allCreds) {
    seen.set(c.code, c)
  }
  const merged = [...seen.values()].sort((a, b) => a.code.localeCompare(b.code))

  const mergedPath = path.join(__dirname, "credentials-all-merged.json")
  fs.writeFileSync(mergedPath, JSON.stringify(merged, null, 2), "utf-8")

  console.log(`\n📊 รวมทั้งหมด: ${merged.length} คน`)
  console.log(`📁 ไฟล์รวม: ${mergedPath}`)
  console.log("═══════════════════════════════════════════════════")
}

main().catch(console.error)
