/**
 * Audit Log — บันทึกว่าใครทำอะไร เมื่อไหร่
 * ใช้แบบ fire-and-forget (ไม่ block request หลัก)
 */

interface AuditEntry {
  actorId: string
  actorName?: string
  action: string          // เช่น 'approve_leave', 'reject_ot', 'update_salary'
  entityType: string      // เช่น 'leave_request', 'payroll_record', 'employee'
  entityId?: string
  description: string     // คำอธิบายภาษาไทย
  metadata?: Record<string, any>
  companyId?: string
  ip?: string
}

export function logAudit(supa: any, entry: AuditEntry) {
  // Fire-and-forget — ไม่ await, ไม่ block request
  supa.from("audit_logs").insert({
    actor_id:    entry.actorId,
    actor_name:  entry.actorName || null,
    action:      entry.action,
    entity_type: entry.entityType,
    entity_id:   entry.entityId || null,
    description: entry.description,
    metadata:    entry.metadata || {},
    company_id:  entry.companyId || null,
    ip_address:  entry.ip || null,
  }).then(() => {}).catch((e: any) => {
    console.error("Audit log failed:", e.message)
  })
}

// ── Shorthand helpers ──

export function logApproval(supa: any, opts: {
  actorId: string; actorName?: string; action: "approved" | "rejected"
  requestType: "leave" | "overtime" | "time_adjustment" | "resignation" | "shift_change"
  requestId: string; employeeName?: string; companyId?: string; details?: string
}) {
  const actionLabel = opts.action === "approved" ? "อนุมัติ" : "ปฏิเสธ"
  const typeLabel: Record<string, string> = {
    leave: "คำขอลา", overtime: "คำขอ OT", time_adjustment: "คำขอแก้เวลา",
    resignation: "คำขอลาออก", shift_change: "คำขอเปลี่ยนกะ",
  }
  const byWho = opts.actorName ? ` โดย ${opts.actorName}` : ""
  logAudit(supa, {
    actorId: opts.actorId,
    actorName: opts.actorName,
    action: `${opts.action}_${opts.requestType}`,
    entityType: `${opts.requestType}_request`,
    entityId: opts.requestId,
    description: `${actionLabel}${typeLabel[opts.requestType]}${opts.employeeName ? ` ของ ${opts.employeeName}` : ""}${byWho}${opts.details ? ` (${opts.details})` : ""}`,
    companyId: opts.companyId,
  })
}

export function logPayroll(supa: any, opts: {
  actorId: string; actorName?: string
  action: "calculate" | "bulk_calculate" | "approve" | "edit"
  periodName?: string; count?: number; companyId?: string
}) {
  const labels: Record<string, string> = {
    calculate: "คำนวณเงินเดือน", bulk_calculate: "คำนวณเงินเดือนแบบ batch",
    approve: "อนุมัติจ่ายเงินเดือน", edit: "แก้ไขเงินเดือน",
  }
  const byWho = opts.actorName ? ` โดย ${opts.actorName}` : ""
  logAudit(supa, {
    actorId: opts.actorId,
    actorName: opts.actorName,
    action: `payroll_${opts.action}`,
    entityType: "payroll",
    description: `${labels[opts.action]}${opts.periodName ? ` รอบ ${opts.periodName}` : ""}${opts.count ? ` (${opts.count} คน)` : ""}${byWho}`,
    companyId: opts.companyId,
  })
}

export function logEmployeeChange(supa: any, opts: {
  actorId: string; actorName?: string
  action: "create" | "update" | "deactivate" | "update_salary" | "update_supervisor"
  employeeId: string; employeeName?: string; companyId?: string
  changes?: Record<string, { old: any; new: any }>
}) {
  const labels: Record<string, string> = {
    create: "สร้างพนักงานใหม่", update: "แก้ไขข้อมูลพนักงาน",
    deactivate: "ปิดการใช้งานพนักงาน", update_salary: "แก้ไขเงินเดือน",
    update_supervisor: "เปลี่ยนหัวหน้า",
  }
  const byWho = opts.actorName ? ` โดย ${opts.actorName}` : ""
  logAudit(supa, {
    actorId: opts.actorId,
    actorName: opts.actorName,
    action: `employee_${opts.action}`,
    entityType: "employee",
    entityId: opts.employeeId,
    description: `${labels[opts.action]}${opts.employeeName ? `: ${opts.employeeName}` : ""}${byWho}`,
    metadata: opts.changes ? { changes: opts.changes } : {},
    companyId: opts.companyId,
  })
}
