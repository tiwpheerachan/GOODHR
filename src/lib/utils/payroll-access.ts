// ── สิทธิ์ดูข้อมูลเงินเดือน (payroll_access) ─────────────────────────────────
// "เหนือกว่า super_admin" — เฉพาะ user ที่อยู่ในตาราง payroll_access เท่านั้น
// รองรับสิทธิ์รายบริษัท:
//   company_id = NULL → เห็นทุกบริษัท (all)
//   company_id = <id> → เห็นเฉพาะบริษัทนั้น (1 user มีได้หลายแถว)
// ใช้ในทุก API route ที่คืนข้อมูลเงินเดือน + middleware gate หน้า /admin/payroll
//
// svc = service-role Supabase client (bypass RLS)

export type PayrollScope = {
  any: boolean          // มีสิทธิ์อย่างน้อย 1 บริษัท (สำหรับ gate หน้า/เมนู)
  all: boolean          // เห็นทุกบริษัท (มีแถว company_id = NULL)
  companyIds: string[]  // รายการบริษัทที่เห็นได้ (เมื่อ all=false)
}

export async function getPayrollScope(svc: any, userId: string | null | undefined): Promise<PayrollScope> {
  if (!userId) return { any: false, all: false, companyIds: [] }
  try {
    const { data } = await svc.from("payroll_access").select("company_id").eq("user_id", userId)
    const rows = data ?? []
    if (rows.length === 0) return { any: false, all: false, companyIds: [] }
    if (rows.some((r: any) => r.company_id == null)) return { any: true, all: true, companyIds: [] }
    const ids = Array.from(new Set(rows.map((r: any) => r.company_id).filter(Boolean))) as string[]
    return { any: ids.length > 0, all: false, companyIds: ids }
  } catch {
    return { any: false, all: false, companyIds: [] }
  }
}

// scope อนุญาตให้เห็นบริษัทนี้ไหม (pure)
export function scopeAllows(scope: PayrollScope, companyId: string | null | undefined): boolean {
  if (scope.all) return true
  if (!companyId) return false
  return scope.companyIds.includes(companyId)
}

/**
 * มีสิทธิ์ดูเงินเดือนไหม
 *   - ไม่ระบุ companyId → มีสิทธิ์อย่างน้อย 1 บริษัท (page/menu gate) — backward compatible
 *   - ระบุ companyId    → มีสิทธิ์บริษัทนั้นโดยเฉพาะ (data-level gate)
 */
export async function hasPayrollAccess(
  svc: any,
  userId: string | null | undefined,
  companyId?: string | null,
): Promise<boolean> {
  const scope = await getPayrollScope(svc, userId)
  if (companyId === undefined) return scope.any
  return scopeAllows(scope, companyId)
}
