import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"
import * as XLSX from "xlsx"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", user.id).single()

  if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 })
  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  if (!isAdmin) return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })

  const params = req.nextUrl.searchParams
  const month = params.get("month") || new Date().toISOString().slice(0, 7)
  const rawCompanyId = params.get("company_id")
  const companyId = rawCompanyId === "all" ? null : (rawCompanyId || (userData.employee as any)?.company_id)
  const departmentId = params.get("department_id")
  const managerId = params.get("manager_id")
  const search = params.get("search")?.trim().toLowerCase() || ""
  const year = parseInt(month.split("-")[0])

  // ── Get employees ──
  let teamEmployeeIds: string[] = []
  if (managerId) {
    const { data: teamRows } = await supa.from("employee_manager_history")
      .select("employee_id").eq("manager_id", managerId).is("effective_to", null)
    teamEmployeeIds = (teamRows ?? []).map((r: any) => r.employee_id)
  } else if (isAdmin) {
    let q = supa.from("employees").select("id, company_id").eq("is_active", true)
    if (companyId) q = q.eq("company_id", companyId)
    if (departmentId) q = q.eq("department_id", departmentId)
    const { data: emps } = await q.limit(2000)
    teamEmployeeIds = (emps ?? []).map((e: any) => e.id)
  }

  if (teamEmployeeIds.length === 0) {
    return NextResponse.json({ error: "ไม่พบพนักงาน" }, { status: 404 })
  }

  // ── Get employee details ──
  const { data: employees } = await supa.from("employees")
    .select("id, first_name_th, last_name_th, nickname, employee_code, company_id, department:departments(name), position:positions(name), company:companies(code)")
    .in("id", teamEmployeeIds)

  const empMap: Record<string, any> = {}
  for (const e of (employees ?? [])) empMap[e.id] = e

  if (search) {
    teamEmployeeIds = teamEmployeeIds.filter(id => {
      const e = empMap[id]
      if (!e) return false
      const text = `${e.first_name_th ?? ""} ${e.last_name_th ?? ""} ${e.nickname ?? ""} ${e.employee_code ?? ""}`.toLowerCase()
      return text.includes(search)
    })
  }

  // ── ดึงประเภทลาเฉพาะบริษัทที่เกี่ยวข้อง ──
  // หาว่าพนักงานที่ filter แล้วอยู่บริษัทไหนบ้าง
  const companyIds = Array.from(new Set(
    teamEmployeeIds.map(id => empMap[id]?.company_id).filter(Boolean)
  ))

  // ดึง leave_types ที่ active เฉพาะบริษัทเหล่านั้น
  const { data: leaveTypeRows } = await supa.from("leave_types")
    .select("id, name, company_id")
    .in("company_id", companyIds)
    .eq("is_active", true)
    .order("name")

  // Map: leave_type_id → { name, company_id }
  const ltMap: Record<string, { name: string; company_id: string }> = {}
  for (const lt of (leaveTypeRows ?? [])) ltMap[lt.id] = { name: lt.name, company_id: lt.company_id }

  // ── Get leave balances ──
  const { data: balances } = await supa.from("leave_balances")
    .select("employee_id, leave_type_id, entitled_days, used_days, pending_days, remaining_days, carried_over")
    .in("employee_id", teamEmployeeIds)
    .eq("year", year)

  // Group balances by employee
  const balByEmp: Record<string, any[]> = {}
  for (const b of (balances ?? []) as any[]) {
    if (!balByEmp[b.employee_id]) balByEmp[b.employee_id] = []
    balByEmp[b.employee_id].push(b)
  }

  // ── Get company codes for naming ──
  const { data: companyRows } = await supa.from("companies").select("id, code").in("id", companyIds)
  const companyCodeMap: Record<string, string> = {}
  for (const c of (companyRows ?? [])) companyCodeMap[c.id] = c.code

  // ── Build XLSX — แยก sheet ตามบริษัท ──
  const wb = XLSX.utils.book_new()

  // ถ้าเลือกบริษัทเดียว → 1 sheet, ถ้าทุกบริษัท → แยก sheet ตามบริษัท
  const companyGroups: { companyId: string; code: string; empIds: string[] }[] = []

  if (companyId) {
    // บริษัทเดียว
    companyGroups.push({
      companyId,
      code: companyCodeMap[companyId] || "ALL",
      empIds: teamEmployeeIds.filter(id => empMap[id]),
    })
  } else {
    // ทุกบริษัท → แยกตาม company
    for (const cid of companyIds) {
      const eIds = teamEmployeeIds.filter(id => empMap[id]?.company_id === cid)
      if (eIds.length > 0) {
        companyGroups.push({ companyId: cid, code: companyCodeMap[cid] || "?", empIds: eIds })
      }
    }
  }

  for (const group of companyGroups) {
    // ดึง leave types เฉพาะบริษัทนี้
    const companyLeaveTypes = (leaveTypeRows ?? [])
      .filter(lt => lt.company_id === group.companyId)
      .sort((a, b) => a.name.localeCompare(b.name, "th"))

    // กรองเฉพาะที่มีข้อมูลจริง (มีคนมีสิทธิ์หรือใช้ > 0)
    const ltWithData = companyLeaveTypes.filter(lt => {
      return (balances ?? []).some((b: any) =>
        b.leave_type_id === lt.id && ((b.entitled_days ?? 0) > 0 || (b.used_days ?? 0) > 0)
      )
    })

    // Header
    const headers = ["รหัส", "ชื่อ-สกุล", "ชื่อเล่น", "แผนก", "ตำแหน่ง"]
    for (const lt of ltWithData) {
      headers.push(`${lt.name} สิทธิ์`, `${lt.name} ใช้`, `${lt.name} เหลือ`)
    }
    headers.push("รวมสิทธิ์", "รวมใช้ไป", "รวมคงเหลือ")

    const rows: any[][] = [headers]

    // Sort employees
    const sortedIds = group.empIds.sort((a, b) => {
      const ea = empMap[a], eb = empMap[b]
      return `${ea.first_name_th} ${ea.last_name_th}`.localeCompare(`${eb.first_name_th} ${eb.last_name_th}`, "th")
    })

    for (const empId of sortedIds) {
      const e = empMap[empId]
      if (!e) continue
      const bals = balByEmp[empId] ?? []

      const fullName = `${e.first_name_th || ""} ${e.last_name_th || ""}`.trim()
      const row: any[] = [
        e.employee_code || "",
        fullName,
        e.nickname || "",
        (e.department as any)?.name || "",
        (e.position as any)?.name || "",
      ]

      let totEntitled = 0, totUsed = 0, totRemaining = 0

      for (const lt of ltWithData) {
        const b = bals.find((bl: any) => bl.leave_type_id === lt.id)
        if (b) {
          row.push(b.entitled_days ?? 0, b.used_days ?? 0, b.remaining_days ?? 0)
          totEntitled += b.entitled_days ?? 0
          totUsed += b.used_days ?? 0
          totRemaining += b.remaining_days ?? 0
        } else {
          row.push(0, 0, 0)
        }
      }

      row.push(totEntitled, totUsed, totRemaining)
      rows.push(row)
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)

    // Column widths
    const colWidths: XLSX.ColInfo[] = [
      { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 16 }, { wch: 16 },
    ]
    for (let i = 0; i < ltWithData.length; i++) {
      colWidths.push({ wch: 8 }, { wch: 6 }, { wch: 7 })
    }
    colWidths.push({ wch: 9 }, { wch: 9 }, { wch: 9 })
    ws["!cols"] = colWidths

    // Sheet name (max 31 chars for Excel)
    const sheetName = group.code.slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, sheetName)
  }

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const fileName = encodeURIComponent(`สรุปสิทธิวันลา_${month}.xlsx`)
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`,
    },
  })
}
