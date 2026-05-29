// ─────────────────────────────────────────────────────────────
// ตรวจรายละเอียดทีมของพนักงานที่ลาเกินโควต้า
// แสดง: สมาชิกในทีม + ใบลาที่ approved ก่อนหน้า
// ─────────────────────────────────────────────────────────────
import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envFile = path.join(__dirname, "../.env.local")
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
}

const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const bold = s => `\x1b[1m${s}\x1b[0m`
const red = s => `\x1b[31m${s}\x1b[0m`
const green = s => `\x1b[32m${s}\x1b[0m`
const amber = s => `\x1b[33m${s}\x1b[0m`
const cyan = s => `\x1b[36m${s}\x1b[0m`
const gray = s => `\x1b[90m${s}\x1b[0m`

// เคสที่ต้องเช็ค
const CASES = [
  {
    name: "ไอยวริญ บุญเจริญ (ไอเฟล)",
    code: "68000107",
    leave_date_start: "2026-06-02",
    leave_date_end:   "2026-06-02",
    submitted_at:     "2026-05-15T14:24:19",
  },
  {
    name: "ทัชชาพิชญ์ ชยรัฐสิริมงคล (มิว)",
    code: "68000031",
    leave_date_start: "2026-05-30",
    leave_date_end:   "2026-05-31",
    submitted_at:     "2026-04-22T10:27:56",
  },
]

async function audit(c) {
  console.log("\n" + "═".repeat(70))
  console.log(bold(`👤 ${c.name}`) + gray(`  (${c.code})`))
  console.log(gray(`   ลา ${c.leave_date_start}${c.leave_date_end !== c.leave_date_start ? ` → ${c.leave_date_end}` : ""}  · ยื่นเมื่อ ${new Date(c.submitted_at).toLocaleString("th-TH")}`))
  console.log("═".repeat(70))

  // 1. หาตัวเอง
  const { data: me } = await supa.from("employees")
    .select("id, first_name_th, last_name_th, nickname, employee_code, department:departments(id, name), company:companies(code, name_th)")
    .eq("employee_code", c.code).single()

  if (!me) { console.log(red("ไม่พบพนักงาน")); return }

  // 2. หา manager_id ปัจจุบัน
  const { data: hist } = await supa.from("employee_manager_history")
    .select("manager_id, effective_from").eq("employee_id", me.id).is("effective_to", null).maybeSingle()
  const mgrId = hist?.manager_id

  // 3. หาทีม (เพื่อนร่วมงานใต้หัวหน้าเดียวกัน — อิงหัวหน้าเป็นหลัก)
  let teamIds = []
  let teamMode = ""
  if (mgrId) {
    const { data: peers } = await supa.from("employee_manager_history")
      .select("employee_id").eq("manager_id", mgrId).is("effective_to", null)
    teamIds = (peers ?? []).map(r => r.employee_id)
    teamMode = `เพื่อนร่วมงานใต้หัวหน้าเดียวกัน`
  } else {
    // ตัวเองเป็นหัวหน้า?
    const { data: subs } = await supa.from("employee_manager_history")
      .select("employee_id").eq("manager_id", me.id).is("effective_to", null)
    const subIds = (subs ?? []).map(r => r.employee_id)
    if (subIds.length > 0) {
      teamIds = [me.id, ...subIds]
      teamMode = `เป็นหัวหน้า — ทีม = ตัวเอง + ลูกน้อง`
    }
  }

  // 4. ดึง info สมาชิก + กรอง active เท่านั้น
  const { data: teamEmpsAll } = await supa.from("employees")
    .select("id, first_name_th, last_name_th, nickname, employee_code, is_active, employment_status")
    .in("id", teamIds)
  const teamEmps = (teamEmpsAll ?? []).filter(e => e.is_active)
  teamIds = teamEmps.map(e => e.id)

  const teamSize = teamIds.length
  const minWorking = Math.ceil(teamSize * 0.7)
  const maxLeave = teamSize - minWorking

  console.log(`\n${bold("📊 ทีม:")} ${teamSize} คน  ${gray(`(${teamMode})`)}`)
  console.log(`   เกณฑ์ 70% → ต้องทำงาน ${green(`${minWorking}/${teamSize}`)} คน  ·  ลาได้สูงสุด ${red(`${maxLeave}`)} คน\n`)

  console.log(bold("👥 สมาชิกในทีม:"))
  for (const m of (teamEmps ?? [])) {
    const star = m.id === me.id ? cyan(" ← คนนี้") : ""
    const inactive = !m.is_active ? red(" [inactive]") : ""
    console.log(`   · ${m.first_name_th} ${m.last_name_th}${m.nickname ? ` (${m.nickname})` : ""} ${gray(m.employee_code)}${inactive}${star}`)
  }

  // 5. หาใบลา approved ของทีม - ตั้งแต่วันที่ยื่น → วันลา + เลยจากนั้นอีกนิด
  // นับใบที่ wrap with the leave date range
  console.log(`\n${bold("📋 ใบลา approved ของทีมในช่วงครอบคลุมวันลา:")}`)
  const { data: teamLeaves } = await supa.from("leave_requests")
    .select(`id, employee_id, start_date, end_date, total_days, status, requested_at, reviewed_at, reason,
      leave_type:leave_types(name),
      employee:employees!leave_requests_employee_id_fkey(first_name_th, last_name_th, nickname, employee_code)`)
    .in("employee_id", teamIds)
    .eq("status", "approved")
    .lte("start_date", c.leave_date_end)
    .gte("end_date", c.leave_date_start)
    .is("deleted_at", null)
    .order("requested_at", { ascending: true })

  if (!teamLeaves || teamLeaves.length === 0) {
    console.log(gray("   — ไม่มีใบลา approved อื่นในช่วงนี้"))
  } else {
    for (const lv of teamLeaves) {
      const isMe = lv.employee_id === me.id
      const submittedB4 = lv.requested_at && new Date(lv.requested_at) < new Date(c.submitted_at)
      const tag = isMe ? cyan(" [คนนี้]") : submittedB4 ? amber(" [ยื่นก่อน]") : gray(" [ยื่นทีหลัง]")
      const emp = lv.employee
      console.log(`   · ${emp?.first_name_th} ${emp?.last_name_th}${emp?.nickname ? ` (${emp.nickname})` : ""} ${gray(emp?.employee_code)}${tag}`)
      console.log(`     ${lv.start_date}${lv.end_date !== lv.start_date ? ` → ${lv.end_date}` : ""} (${lv.total_days} วัน) · ${lv.leave_type?.name || "—"} · ${gray("ยื่น " + (lv.requested_at ? new Date(lv.requested_at).toLocaleDateString("th-TH") : "—"))}`)
      if (lv.reason) console.log(gray(`     เหตุผล: ${lv.reason.slice(0, 60)}`))
    }
  }

  // 6. หาใบลา pending ของทีมเช่นกัน (อาจมีผลกระทบ)
  const { data: pendingLeaves } = await supa.from("leave_requests")
    .select(`id, employee_id, start_date, end_date, total_days, requested_at, leave_type:leave_types(name),
      employee:employees!leave_requests_employee_id_fkey(first_name_th, last_name_th, nickname, employee_code)`)
    .in("employee_id", teamIds)
    .eq("status", "pending")
    .lte("start_date", c.leave_date_end)
    .gte("end_date", c.leave_date_start)
    .is("deleted_at", null)

  if (pendingLeaves && pendingLeaves.length > 0) {
    console.log(`\n${bold("⏳ ใบลา pending รออนุมัติของทีมในช่วงนี้:")}`)
    for (const lv of pendingLeaves) {
      const isMe = lv.employee_id === me.id
      const tag = isMe ? cyan(" [คนนี้]") : ""
      const emp = lv.employee
      console.log(`   · ${emp?.first_name_th} ${emp?.last_name_th}${emp?.nickname ? ` (${emp.nickname})` : ""}${tag} — ${lv.start_date} (${lv.total_days} วัน) · ${lv.leave_type?.name || "—"}`)
    }
  }

  // 7. Per-day analysis สำหรับวันลาของเขา
  console.log(`\n${bold("📅 วิเคราะห์รายวันในช่วงลา:")}`)
  const days = []
  for (let d = new Date(c.leave_date_start); d <= new Date(c.leave_date_end); d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10))
  }
  for (const day of days) {
    const onLeave = new Set()
    for (const lv of (teamLeaves ?? [])) {
      if (lv.start_date <= day && lv.end_date >= day) onLeave.add(lv.employee_id)
    }
    const working = teamSize - onLeave.size
    const pct = teamSize > 0 ? Math.round((working / teamSize) * 1000) / 10 : 100
    const badge = pct < 70 ? red(`${pct}%`) : green(`${pct}%`)
    console.log(`   ${day}: ลา ${red(onLeave.size)}/${teamSize} · ทำงาน ${badge}${pct < 70 ? red("  ✗ ต่ำกว่า 70%") : ""}`)
  }
  console.log()
}

async function main() {
  for (const c of CASES) await audit(c)
}
main().catch(e => { console.error(e); process.exit(1) })
