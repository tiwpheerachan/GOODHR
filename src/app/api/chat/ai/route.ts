import { NextRequest } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createServiceClient, createClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" })

// ── Pre-fetch live context for the AI ──
async function fetchLiveContext(supa: any, _companyId?: string) {
  const now = new Date()
  const bangkokDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
  const day = parseInt(bangkokDate.split("-")[2])
  // Current payroll period
  const periodMonth = day > 21
    ? (now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2)
    : now.getMonth() + 1
  const periodYear = day > 21 && now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()

  const queries = await Promise.all([
    // Employee counts by company
    supa.from("employees").select("company_id, employment_status, is_active"),
    // Current period payroll summary
    supa.from("payroll_records").select("company_id, gross_income, net_salary, deduct_late, deduct_absent, ot_amount, absent_days, base_salary, status").eq("year", periodYear).eq("month", periodMonth),
    // Today's attendance
    supa.from("attendance_records").select("company_id, status, late_minutes").eq("work_date", bangkokDate),
    // Pending approvals
    supa.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("overtime_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    // Companies
    supa.from("companies").select("id, code, name_th"),
  ])

  const [empResult, payrollResult, todayAttResult, pendingLeave, pendingOT, companiesResult] = queries

  // Summarize employees
  const empByCompany: Record<string, { active: number; total: number }> = {}
  for (const e of empResult.data ?? []) {
    if (!empByCompany[e.company_id]) empByCompany[e.company_id] = { active: 0, total: 0 }
    empByCompany[e.company_id].total++
    if (e.is_active) empByCompany[e.company_id].active++
  }

  // Summarize payroll
  const payrollSummary: Record<string, { count: number; totalGross: number; totalNet: number; totalOT: number }> = {}
  for (const p of payrollResult.data ?? []) {
    if (!payrollSummary[p.company_id]) payrollSummary[p.company_id] = { count: 0, totalGross: 0, totalNet: 0, totalOT: 0 }
    payrollSummary[p.company_id].count++
    payrollSummary[p.company_id].totalGross += Number(p.gross_income) || 0
    payrollSummary[p.company_id].totalNet += Number(p.net_salary) || 0
    payrollSummary[p.company_id].totalOT += Number(p.ot_amount) || 0
  }

  // Summarize today's attendance
  const todayAtt = { present: 0, late: 0, absent: 0, wfh: 0, total: 0 }
  for (const a of todayAttResult.data ?? []) {
    todayAtt.total++
    if (a.status === "present") todayAtt.present++
    else if (a.status === "late") todayAtt.late++
    else if (a.status === "absent") todayAtt.absent++
    else if (a.status === "wfh") todayAtt.wfh++
  }

  const companyMap: Record<string, string> = {}
  for (const c of companiesResult.data ?? []) companyMap[c.id] = `${c.code} (${c.name_th})`

  let ctx = `## ข้อมูล ณ ปัจจุบัน (ดึงแบบ real-time)
วันที่: ${bangkokDate}
รอบเงินเดือนปัจจุบัน: ${periodMonth}/${periodYear}

### พนักงาน
`
  for (const [cid, info] of Object.entries(empByCompany)) {
    ctx += `- ${companyMap[cid] ?? cid}: ${info.active} active / ${info.total} total\n`
  }
  ctx += `\n### เงินเดือนรอบ ${periodMonth}/${periodYear}\n`
  for (const [cid, info] of Object.entries(payrollSummary)) {
    ctx += `- ${companyMap[cid] ?? cid}: ${info.count} records, gross รวม ${info.totalGross.toLocaleString()}฿, net รวม ${info.totalNet.toLocaleString()}฿, OT รวม ${info.totalOT.toLocaleString()}฿\n`
  }
  ctx += `\n### วันนี้ (${bangkokDate})
- เช็คอินแล้ว: ${todayAtt.total} คน (ตรงเวลา ${todayAtt.present}, สาย ${todayAtt.late}, WFH ${todayAtt.wfh})
- คำร้องลารออนุมัติ: ${pendingLeave.count ?? 0}
- คำร้อง OT รออนุมัติ: ${pendingOT.count ?? 0}`

  return ctx
}

const SYSTEM_PROMPT = `คุณคือ "น้องเอช" ผู้ช่วย AI ของระบบ GOODHR — ฉลาด รวดเร็ว รู้ข้อมูลทุกอย่างในระบบ
ตอบเป็นภาษาไทย กระชับ ใช้ตัวเลขจริง ใช้ emoji น้อย

## ความสามารถ
1. **query_database** — Query ข้อมูลจาก Supabase ได้ทุกตาราง
2. **search_employee** — ค้นหาพนักงานจากชื่อ/รหัส/ชื่อเล่น แล้วดึงข้อมูลละเอียด

## ตาราง & คอลัมน์

**companies**: id, code (SHD/PTC/TOP1/RABBIT), name_th, name_en
**branches**: id, company_id, code, name, latitude, longitude, geo_radius_m
**departments**: id, company_id, code, name
**positions**: id, company_id, code, name
**employees**: id, company_id, branch_id, department_id, position_id, employee_code, first_name_th, last_name_th, first_name_en, last_name_en, nickname, email, phone, hire_date, probation_end_date, resign_date, employment_status, is_active, is_attendance_exempt, brand, supervisor_id
**users**: id, role (super_admin/hr_admin/manager/employee), employee_id
**salary_structures**: id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from, tax_withholding_pct
**attendance_records**: id, employee_id, company_id, shift_template_id, work_date, clock_in, clock_out, status (present/late/early_out/absent/wfh), late_minutes, early_out_minutes, ot_minutes, work_minutes
**payroll_periods**: id, company_id, year, month, period_name, start_date, end_date, pay_date, status (draft/completed)
**payroll_records**: id, payroll_period_id, employee_id, company_id, year, month, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_amount, bonus, commission, other_income, gross_income, deduct_absent, deduct_late, deduct_early_out, deduct_loan, deduct_other, social_security_amount, monthly_tax_withheld, total_deductions, net_salary, working_days, present_days, absent_days, late_count, leave_paid_days, leave_unpaid_days, status, income_extras (json), deduction_extras (json), kpi_grade, kpi_standard_amount, ot_weekday_minutes, ot_holiday_reg_minutes, ot_holiday_ot_minutes
**leave_requests**: id, employee_id, company_id, leave_type_id, start_date, end_date, total_days, is_half_day, reason, status (pending/approved/rejected)
**leave_types**: id, company_id, code, name, is_paid, days_per_year
**overtime_requests**: id, employee_id, company_id, work_date, ot_start, ot_end, ot_rate, reason, status
**shift_templates**: id, company_id, name, work_start, work_end, is_overnight, break_minutes
**monthly_shift_assignments**: id, employee_id, company_id, work_date, shift_id, assignment_type (work/dayoff/leave/holiday)
**employee_schedule_profiles**: employee_id, company_id, schedule_type (fixed/variable), default_shift_id, fixed_dayoffs (text[])
**employee_loans**: id, employee_id, company_id, status (active/paid)
**company_holidays**: id, company_id, date, name, year, is_active
**time_adjustment_requests**: id, employee_id, company_id, work_date, status

## บริษัท 4 แห่ง
- SHD: a684555a-e44d-4441-9af8-521115cd000a
- PTC: a24d6342-8720-42c7-bb8a-5932169274bf
- TOP1: 3d383dcd-9544-4b38-8cff-a37b69b9db57
- RABBIT: 03d7debf-d6d9-4b6b-afde-e8e91a3758e5

## Payroll
- รอบเงินเดือน: 22 เดือนก่อน ถึง 21 เดือนนี้ จ่ายวันที่ 25
- สูตร: base/30/8 = อัตราต่อชม., OT 1.5x(ปกติ)/1.0x(วันหยุดเวลาปกติ)/3.0x(วันหยุดนอกเวลา)
- SSO 5% cap 875, ภาษีขั้นบันได

## กฎ Query
- ใช้ Supabase .select() .eq() .gte() .lte() .ilike() .in() .or() .order() .limit()
- join ใช้ nested select: "*, employees(first_name_th, department:departments(name))"
- ค้นหาชื่อใช้ ilike: .ilike("first_name_th", "%ชื่อ%")
- limit ไม่เกิน 100 rows
- ตอบด้วยตัวเลขจริง ใส่หน่วยบาท ถ้าเป็นเงิน format ด้วย comma

## ตัวอย่าง Query Patterns

ค้นหาพนักงาน "สมชาย":
table: employees, select: "*, department:departments(name), position:positions(name), company:companies(code)"
filters: [{ method: "ilike", args: ["first_name_th", "%สมชาย%"] }]

เงินเดือนของพนักงาน (ต้องรู้ employee_id ก่อน):
table: payroll_records, select: "*"
filters: [{ method: "eq", args: ["employee_id", "xxx"] }, { method: "eq", args: ["month", 4] }, { method: "eq", args: ["year", 2026] }]

คนมาสายมากสุด 10 อันดับ:
table: attendance_records, select: "employee_id, late_minutes, work_date"
filters: [{ method: "gt", args: ["late_minutes", 0] }, { method: "gte", args: ["work_date", "2026-03-22"] }]
order: { column: "late_minutes", ascending: false }
limit: 50

สถิติการลาเดือนนี้:
table: leave_requests, select: "*, leave_type:leave_types(name, is_paid), employee:employees(first_name_th, last_name_th)"
filters: [{ method: "gte", args: ["start_date", "2026-03-01"] }]

## การแสดงผลพิเศษ

### ตาราง — ใช้ Markdown table:
| ชื่อ | แผนก | เงินเดือน |
|------|------|-----------|
| สมชาย | IT | 35,000 |

### กราฟ — ใช้ format พิเศษ $$CHART{...}$$:
- Bar chart: $$CHART{"type":"bar","title":"ชื่อกราฟ","items":[{"label":"A","value":100},{"label":"B","value":200}]}$$
- Donut chart: $$CHART{"type":"donut","title":"ชื่อ","items":[{"label":"มาตรงเวลา","value":80},{"label":"มาสาย","value":15}]}$$

ใช้กราฟเมื่อ: สรุปสัดส่วน, เปรียบเทียบตัวเลข, แนวโน้ม
ใช้ตารางเมื่อ: แสดงรายการพนักงาน, รายละเอียดเงินเดือน

## สำคัญ
- ถ้าถามเรื่องพนักงานรายคน ให้ใช้ search_employee ก่อน แล้วค่อย query ข้อมูลเพิ่ม
- ถ้าข้อมูลเยอะ สรุปเป็นตาราง/ตัวเลข
- ใช้กราฟเมื่อเหมาะสม (ไม่ต้องใช้ทุกครั้ง)
- ตอบตรงประเด็น ไม่อ้อมค้อม
- ถ้าไม่มีข้อมูลให้บอกตรงๆ`

// ── Tool definitions ──
const TOOLS: Anthropic.Tool[] = [
  {
    name: "query_database",
    description: "Query ฐานข้อมูล Supabase ได้ทุกตาราง — ส่งหลาย query พร้อมกันได้",
    input_schema: {
      type: "object" as const,
      properties: {
        queries: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "อธิบายสั้นๆ ว่า query นี้หาอะไร" },
              table: { type: "string" },
              select: { type: "string", description: "Supabase select string" },
              filters: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    method: { type: "string", description: "eq, neq, gt, gte, lt, lte, like, ilike, in, is, or, not, contains, overlaps" },
                    args: { type: "array", items: {} }
                  },
                  required: ["method", "args"]
                }
              },
              order: { type: "object", properties: { column: { type: "string" }, ascending: { type: "boolean" } } },
              limit: { type: "number" },
              count: { type: "string", enum: ["exact"] },
              head: { type: "boolean" }
            },
            required: ["table", "select"]
          }
        }
      },
      required: ["queries"]
    }
  },
  {
    name: "search_employee",
    description: "ค้นหาพนักงานจากชื่อ/รหัส/ชื่อเล่น แล้วดึงข้อมูลทุกอย่างของคนนั้น (ข้อมูลส่วนตัว, เงินเดือน, การเข้างาน, การลา) — ใช้เมื่อถามเรื่องพนักงานรายบุคคล",
    input_schema: {
      type: "object" as const,
      properties: {
        keyword: { type: "string", description: "ชื่อ หรือ รหัสพนักงาน หรือ ชื่อเล่น ที่จะค้นหา" },
        include: {
          type: "array",
          items: { type: "string", enum: ["salary", "attendance", "payroll", "leave", "shift", "overtime"] },
          description: "ข้อมูลเพิ่มเติมที่ต้องการ (default: ทั้งหมด)"
        }
      },
      required: ["keyword"]
    }
  }
]

// ── Query executor ──
interface QueryCall {
  table: string
  select: string
  filters?: Array<{ method: string; args: any[] }>
  order?: { column: string; ascending?: boolean }
  limit?: number
  count?: "exact"
  head?: boolean
}

async function executeQuery(supa: any, q: QueryCall) {
  try {
    let query = supa.from(q.table).select(q.select, q.count ? { count: q.count, head: q.head ?? false } : undefined)
    for (const f of q.filters ?? []) {
      if (typeof (query as any)[f.method] === "function") {
        query = (query as any)[f.method](...f.args)
      }
    }
    if (q.order) query = query.order(q.order.column, { ascending: q.order.ascending ?? true })
    query = query.limit(q.limit ?? 100)
    const { data, error, count } = await query
    if (error) return { error: error.message }
    return { data, count }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ── Employee deep search ──
async function searchEmployee(supa: any, keyword: string, includes: string[]) {
  // Search by multiple fields
  const k = `%${keyword}%`
  const { data: employees } = await supa.from("employees")
    .select("*, department:departments(name), position:positions(name), company:companies(code, name_th), branch:branches(name)")
    .or(`first_name_th.ilike.${k},last_name_th.ilike.${k},first_name_en.ilike.${k},last_name_en.ilike.${k},nickname.ilike.${k},employee_code.ilike.${k}`)
    .eq("is_active", true)
    .limit(10)

  if (!employees?.length) return { message: `ไม่พบพนักงานที่ตรงกับ "${keyword}"` }

  const all = includes.length === 0
  const results: any[] = []

  const now = new Date()
  const bangkokDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
  const day = parseInt(bangkokDate.split("-")[2])
  const periodMonth = day > 21 ? (now.getMonth() + 2 > 12 ? 1 : now.getMonth() + 2) : now.getMonth() + 1
  const periodYear = day > 21 && now.getMonth() + 2 > 12 ? now.getFullYear() + 1 : now.getFullYear()
  const periodStart = day > 21
    ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-22`
    : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}-22`

  for (const emp of employees) {
    const info: any = {
      employee: {
        id: emp.id,
        code: emp.employee_code,
        name: `${emp.first_name_th} ${emp.last_name_th}`,
        name_en: emp.first_name_en ? `${emp.first_name_en} ${emp.last_name_en}` : null,
        nickname: emp.nickname,
        company: emp.company?.code,
        department: emp.department?.name,
        position: emp.position?.name,
        branch: emp.branch?.name,
        hire_date: emp.hire_date,
        probation_end: emp.probation_end_date,
        email: emp.email,
        phone: emp.phone,
        status: emp.employment_status,
        is_exempt: emp.is_attendance_exempt,
      }
    }

    const fetches: Promise<void>[] = []

    if (all || includes.includes("salary")) {
      fetches.push(
        supa.from("salary_structures").select("*").eq("employee_id", emp.id).order("effective_from", { ascending: false }).limit(1)
          .then((r: any) => { info.salary = r.data?.[0] ?? null })
      )
    }

    if (all || includes.includes("payroll")) {
      fetches.push(
        supa.from("payroll_records").select("*").eq("employee_id", emp.id).eq("year", periodYear).eq("month", periodMonth).limit(1)
          .then((r: any) => { info.payroll_current = r.data?.[0] ?? null })
      )
      fetches.push(
        supa.from("payroll_records").select("month, year, gross_income, net_salary, deduct_late, deduct_absent, ot_amount, absent_days, present_days, working_days")
          .eq("employee_id", emp.id).order("year", { ascending: false }).order("month", { ascending: false }).limit(6)
          .then((r: any) => { info.payroll_history = r.data })
      )
    }

    if (all || includes.includes("attendance")) {
      fetches.push(
        supa.from("attendance_records").select("work_date, status, late_minutes, early_out_minutes, ot_minutes, work_minutes, clock_in, clock_out")
          .eq("employee_id", emp.id).gte("work_date", periodStart).order("work_date", { ascending: false }).limit(31)
          .then((r: any) => {
            const records = r.data ?? []
            info.attendance = {
              records_count: records.length,
              present: records.filter((a: any) => a.status === "present").length,
              late: records.filter((a: any) => a.status === "late").length,
              absent: records.filter((a: any) => a.status === "absent").length,
              total_late_min: records.reduce((s: number, a: any) => s + (Number(a.late_minutes) || 0), 0),
              total_ot_min: records.reduce((s: number, a: any) => s + (Number(a.ot_minutes) || 0), 0),
              recent_5: records.slice(0, 5),
            }
          })
      )
    }

    if (all || includes.includes("leave")) {
      fetches.push(
        supa.from("leave_requests").select("*, leave_type:leave_types(name, is_paid)")
          .eq("employee_id", emp.id).gte("start_date", `${periodYear}-01-01`).order("start_date", { ascending: false }).limit(20)
          .then((r: any) => { info.leaves = r.data })
      )
    }

    if (all || includes.includes("shift")) {
      fetches.push(
        supa.from("employee_schedule_profiles").select("*, shift:shift_templates(name, work_start, work_end)")
          .eq("employee_id", emp.id).limit(1)
          .then((r: any) => { info.schedule_profile = r.data?.[0] ?? null })
      )
      fetches.push(
        supa.from("monthly_shift_assignments").select("work_date, assignment_type, shift:shift_templates(name, work_start, work_end)")
          .eq("employee_id", emp.id).gte("work_date", periodStart).order("work_date").limit(31)
          .then((r: any) => { info.shift_assignments = r.data })
      )
    }

    if (all || includes.includes("overtime")) {
      fetches.push(
        supa.from("overtime_requests").select("work_date, ot_start, ot_end, ot_rate, reason, status")
          .eq("employee_id", emp.id).gte("work_date", periodStart).order("work_date", { ascending: false }).limit(10)
          .then((r: any) => { info.overtime_requests = r.data })
      )
    }

    await Promise.all(fetches)
    results.push(info)
  }

  return { found: results.length, employees: results }
}

// ── Tool execution loop ──
async function runToolLoop(
  supa: any,
  systemPrompt: string,
  chatMessages: Anthropic.MessageParam[],
  maxRounds = 3
): Promise<string> {
  let messages = [...chatMessages]

  for (let round = 0; round < maxRounds; round++) {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: TOOLS,
      messages,
    })

    // Collect all tool uses
    const toolUses = response.content.filter((b: any) => b.type === "tool_use") as Array<{ type: "tool_use"; id: string; name: string; input: any }>

    // If no tool use, return text
    if (toolUses.length === 0) {
      const text = response.content.find((b: any) => b.type === "text") as { text: string } | undefined
      return text?.text ?? "ไม่สามารถตอบได้ครับ"
    }

    // Execute all tools in parallel
    const toolResults = await Promise.all(
      toolUses.map(async (tu: any) => {
        let result: any
        if (tu.name === "query_database") {
          const inp = tu.input as { queries: (QueryCall & { label?: string })[] }
          const queryResults = await Promise.all(
            inp.queries.map(async (q: any) => ({
              label: q.label ?? q.table,
              ...await executeQuery(supa, q)
            }))
          )
          result = queryResults
        } else if (tu.name === "search_employee") {
          const inp = tu.input as { keyword: string; include?: string[] }
          result = await searchEmployee(supa, inp.keyword, inp.include ?? [])
        } else {
          result = { error: "Unknown tool" }
        }
        return { tool_use_id: tu.id, content: JSON.stringify(result) }
      })
    )

    // Add assistant response + tool results to messages
    messages = [
      ...messages,
      { role: "assistant" as const, content: response.content },
      {
        role: "user" as const,
        content: toolResults.map(tr => ({
          type: "tool_result" as const,
          tool_use_id: tr.tool_use_id,
          content: tr.content,
        }))
      }
    ]

    // If stop_reason is end_turn, break
    if (response.stop_reason === "end_turn") {
      const text = response.content.find((b: any) => b.type === "text") as { text: string } | undefined
      return text?.text ?? "ไม่สามารถตอบได้ครับ"
    }
  }

  // After max rounds, return whatever we have
  return "ขอโทษครับ ข้อมูลซับซ้อนมาก ลองถามใหม่ให้เจาะจงขึ้นนะครับ"
}

// ── Streaming POST handler ──
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } })

    const supa = createServiceClient()
    const { data: userData } = await supa.from("users")
      .select("role, employee_id, employee:employees(company_id, company:companies(code, name_th))")
      .eq("id", user.id).single()

    if (!userData || !["super_admin", "hr_admin"].includes(userData.role)) {
      return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { "Content-Type": "application/json" } })
    }

    const { messages } = await req.json()
    if (!messages?.length) {
      return new Response(JSON.stringify({ error: "No messages" }), { status: 400, headers: { "Content-Type": "application/json" } })
    }

    const companyId = (userData.employee as any)?.company_id
    const companyContext = (userData.employee as any)?.company
      ? `ผู้ใช้: ${(userData.employee as any).company.name_th} (${(userData.employee as any).company.code}), company_id=${companyId}`
      : "ผู้ใช้เป็น super_admin เห็นทุกบริษัท"

    // Pre-fetch live context in parallel
    const liveContext = await fetchLiveContext(supa, companyId)

    const bangkokNow = new Date().toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", year: "numeric", month: "long", day: "numeric", weekday: "long" })
    const systemPrompt = SYSTEM_PROMPT + `\n\n## Context\n${companyContext}\nวันนี้: ${bangkokNow}\n\n${liveContext}`

    const chatMessages: Anthropic.MessageParam[] = messages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }))

    // Run tool loop
    const reply = await runToolLoop(supa, systemPrompt, chatMessages)

    return new Response(JSON.stringify({ reply }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
    })

  } catch (err: any) {
    console.error("AI Chat error:", err)
    return new Response(
      JSON.stringify({ error: err?.error?.message ?? err.message ?? "Internal error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
