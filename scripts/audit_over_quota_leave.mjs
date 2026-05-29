// ─────────────────────────────────────────────────────────────
// ตรวจสอบใบลาที่ยื่นเกินโควต้าทีม (70% rule)
// จากวันนี้เป็นต้นไป — สถานะ pending + approved
// ทีมบัญชี: pool ทุกบริษัท
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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) { console.error("missing env"); process.exit(1) }

const supa = createClient(url, key)
const THRESHOLD = 0.7  // 70%
// ── Floor allowance: ทีม < 3 คน ลาได้ 1 คน ──
function calcMaxLeave(size) {
  if (size <= 0) return 0
  if (size < 3) return 1
  return size - Math.ceil(size * THRESHOLD)
}

function isAcct(name) {
  if (!name) return false
  const l = String(name).toLowerCase().trim()
  return l.includes("บัญชี") || l === "accounting" || l.includes("account")
}

const today = new Date().toISOString().slice(0, 10)

const fmt = (n) => `\x1b[33m${n}\x1b[0m`
const red = (s) => `\x1b[31m${s}\x1b[0m`
const green = (s) => `\x1b[32m${s}\x1b[0m`
const gray = (s) => `\x1b[90m${s}\x1b[0m`
const bold = (s) => `\x1b[1m${s}\x1b[0m`

async function main() {
  console.log(bold(`\n🔍 ตรวจใบลาเกินโควต้า 70% — ตั้งแต่ ${today} เป็นต้นไป\n`))

  // 1. ดึงใบลา pending + approved ที่ start_date ≥ วันนี้
  const { data: leaves, error } = await supa
    .from("leave_requests")
    .select(`
      id, employee_id, company_id, leave_type_id, start_date, end_date, total_days,
      is_half_day, status, requested_at, created_at, reason,
      employee:employees!leave_requests_employee_id_fkey(id, first_name_th, last_name_th, nickname, employee_code,
        department:departments(id, name), company:companies(code, name_th)
      ),
      leave_type:leave_types(name)
    `)
    .gte("end_date", today)
    .in("status", ["pending", "approved"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) { console.error("error:", error.message); process.exit(1) }
  console.log(gray(`พบใบลา ${leaves.length} ใบ (pending + approved) ที่ยังไม่หมดอายุ\n`))

  // 2. Pre-load: departments + all active employees per department
  const { data: allDepts } = await supa.from("departments").select("id, name")
  const acctDeptIds = (allDepts ?? []).filter(d => isAcct(d.name)).map(d => d.id)
  const acctDeptSet = new Set(acctDeptIds)

  // หาทุก manager_history ที่ active เพื่อ map manager → team
  const { data: histories } = await supa
    .from("employee_manager_history")
    .select("employee_id, manager_id")
    .is("effective_to", null)
  const teamByManager = new Map()  // manager_id → Set<employee_id>
  const managerByEmp = new Map()   // employee_id → manager_id (1 active)
  for (const h of (histories ?? [])) {
    if (!teamByManager.has(h.manager_id)) teamByManager.set(h.manager_id, new Set())
    teamByManager.get(h.manager_id).add(h.employee_id)
    managerByEmp.set(h.employee_id, h.manager_id)
  }

  // pool ทีมบัญชี
  let acctTeamIds = []
  if (acctDeptIds.length > 0) {
    const { data: acctEmps } = await supa.from("employees")
      .select("id").in("department_id", acctDeptIds).eq("is_active", true)
    acctTeamIds = (acctEmps ?? []).map(e => e.id)
  }

  // 3. ตรวจแต่ละใบ
  const violations = []

  for (const lv of leaves) {
    const emp = lv.employee
    if (!emp) continue

    const empDeptId = emp.department?.id
    const isAccting = empDeptId && acctDeptSet.has(empDeptId)

    // ── หาทีมของพนักงานนี้ (อิงหัวหน้างานเป็นหลัก) ──
    let teamIds = []
    const mgrId = managerByEmp.get(emp.id)
    if (isAccting) {
      teamIds = acctTeamIds
    } else if (mgrId && teamByManager.has(mgrId)) {
      // เพื่อนใต้หัวหน้าเดียวกัน
      teamIds = Array.from(teamByManager.get(mgrId))
    } else if (teamByManager.has(emp.id)) {
      // ตัวเองเป็นหัวหน้า → ทีม = ตัวเอง + ลูกน้อง
      teamIds = [emp.id, ...Array.from(teamByManager.get(emp.id))]
    } else {
      // ไม่มีหัวหน้า + ไม่มีลูกน้อง → ข้าม (ไม่ตรวจโควต้า)
      continue
    }

    // กรอง active เท่านั้น
    const { data: activeTeam } = await supa.from("employees")
      .select("id").in("id", teamIds).eq("is_active", true)
    teamIds = (activeTeam ?? []).map(e => e.id)

    const teamSize = teamIds.length
    if (teamSize === 0) continue
    const maxLeave = calcMaxLeave(teamSize)        // รองรับ floor allowance
    const minWorking = teamSize - maxLeave

    // หาทุกใบ approved ของทีมในช่วง start–end ของใบนี้
    const { data: teamApproved } = await supa.from("leave_requests")
      .select("employee_id, start_date, end_date")
      .in("employee_id", teamIds)
      .eq("status", "approved")
      .lte("start_date", lv.end_date)
      .gte("end_date", lv.start_date)
      .neq("id", lv.id)
      .is("deleted_at", null)

    // เช็คทีละวันใน range ของใบ
    const startD = new Date(lv.start_date + "T00:00:00")
    const endD = new Date(lv.end_date + "T00:00:00")
    let worstDay = null
    let worstPct = 101
    let worstLeaveCount = 0
    let violatesQuota = false

    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10)
      const onLeaveOnDay = new Set(
        (teamApproved ?? [])
          .filter(t => t.start_date <= ds && t.end_date >= ds)
          .map(t => t.employee_id)
      )
      // นับ "ใบนี้" ด้วย (ถ้าตัวเองยังไม่อยู่ใน approved)
      onLeaveOnDay.add(emp.id)
      const workingAfter = teamSize - onLeaveOnDay.size
      const pctAfter = (workingAfter / teamSize) * 100
      // ── ใช้ maxLeave (รองรับ floor) ──
      if (onLeaveOnDay.size > maxLeave) violatesQuota = true
      if (pctAfter < worstPct) {
        worstPct = pctAfter
        worstDay = ds
        worstLeaveCount = onLeaveOnDay.size
      }
    }

    if (violatesQuota) {
      violations.push({
        leave_id: lv.id,
        status: lv.status,
        requested_at: lv.requested_at || lv.created_at,
        start_date: lv.start_date,
        end_date: lv.end_date,
        total_days: lv.total_days,
        is_half_day: lv.is_half_day,
        reason: lv.reason,
        emp_name: `${emp.first_name_th} ${emp.last_name_th}${emp.nickname ? ` (${emp.nickname})` : ""}`,
        emp_code: emp.employee_code,
        dept: emp.department?.name || "—",
        company: emp.company?.code || "—",
        leave_type: lv.leave_type?.name || "—",
        team_size: teamSize,
        min_working: minWorking,
        max_leave: maxLeave,
        is_accounting_pool: isAccting,
        worst_day: worstDay,
        worst_leave_count: worstLeaveCount,
        worst_working_pct: Math.round(worstPct * 10) / 10,
      })
    }
  }

  // 4. รายงาน
  if (violations.length === 0) {
    console.log(green(bold("✅ ไม่มีใบลาที่เกินโควต้า — ทุกทีมยังอยู่ใน 70% rule\n")))
    return
  }

  console.log(red(bold(`⚠️ พบใบลาที่เกินโควต้าทีม (>30%): ${violations.length} ใบ\n`)))

  // เรียงตาม worst_working_pct (น้อยสุด = แย่สุด)
  violations.sort((a, b) => a.worst_working_pct - b.worst_working_pct)

  for (const [i, v] of violations.entries()) {
    const statusBadge = v.status === "approved" ? red("✓ APPROVED") : gray("⏳ PENDING")
    const acctBadge = v.is_accounting_pool ? "  " + bold("[ทีมบัญชี pool]") : ""
    console.log(bold(`#${i + 1} ${statusBadge}${acctBadge}`))
    console.log(`  👤 ${v.emp_name} ${gray(v.emp_code)} · ${gray(`${v.dept} · ${v.company}`)}`)
    console.log(`  📅 ${v.start_date} → ${v.end_date}  (${fmt(v.total_days)} วัน${v.is_half_day ? " · ครึ่งวัน" : ""})`)
    console.log(`  📋 ${v.leave_type}  ${gray("· เหตุผล: " + (v.reason || "—").slice(0, 50))}`)
    console.log(`  ⏰ ยื่นเมื่อ ${v.requested_at ? new Date(v.requested_at).toLocaleString("th-TH") : "—"}`)
    console.log(`  🚨 วันวิกฤต ${red(v.worst_day)}: ทีม ${v.team_size} คน · ลา ${red(v.worst_leave_count)} คน · ทำงาน ${red(v.worst_working_pct + "%")} (ต้อง ≥ 70%)`)
    console.log(`  📊 เกณฑ์: ทีม ${v.team_size} → ลาได้สูงสุด ${fmt(v.max_leave)} คน, ต้องทำงาน ${fmt(v.min_working)} คน`)
    console.log()
  }

  // สรุป
  console.log(gray("─".repeat(60)))
  const byStatus = { pending: 0, approved: 0 }
  for (const v of violations) byStatus[v.status]++
  console.log(bold(`สรุป: ${violations.length} ใบ`))
  console.log(`  · pending (รออนุมัติ): ${fmt(byStatus.pending)} ใบ`)
  console.log(`  · approved (อนุมัติแล้ว): ${red(byStatus.approved)} ใบ ← ${red("ต้องรีวิว!")}`)

  // by department
  const byDept = new Map()
  for (const v of violations) {
    const k = v.dept
    if (!byDept.has(k)) byDept.set(k, 0)
    byDept.set(k, byDept.get(k) + 1)
  }
  console.log(`\nแยกตามแผนก:`)
  for (const [d, n] of Array.from(byDept).sort((a, b) => b[1] - a[1])) {
    console.log(`  · ${d}: ${fmt(n)} ใบ`)
  }
  console.log()
}

main().catch(e => { console.error(e); process.exit(1) })
