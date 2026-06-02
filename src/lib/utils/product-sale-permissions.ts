// ════════════════════════════════════════════════════════════════════
// Permission helper สำหรับระบบ Product Sales
//   - super_admin / hr_admin → admin (auto)
//   - อื่นๆ → ดูจาก product_sale_permissions table
//   - ไม่มี entry → no access
// ════════════════════════════════════════════════════════════════════
export type ProductSaleAccess = "admin" | "manager" | "staff" | "none"

export async function getProductSaleAccess(svc: any, userId: string): Promise<{
  access: ProductSaleAccess
  role: string
  employeeId: string | null
  companyId: string | null
}> {
  const { data: me } = await svc.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", userId).single()
  if (!me) return { access: "none", role: "", employeeId: null, companyId: null }

  const role = me.role as string
  const empId = me.employee_id as string | null
  const companyId = (me.employee as any)?.company_id ?? null

  // Super admin / HR admin always have admin access
  if (role === "super_admin" || role === "hr_admin") {
    return { access: "admin", role, employeeId: empId, companyId }
  }

  if (!empId) return { access: "none", role, employeeId: null, companyId }

  // ดู permission table
  const { data: perm } = await svc.from("product_sale_permissions")
    .select("access_level").eq("employee_id", empId).maybeSingle()
  if (!perm) return { access: "none", role, employeeId: empId, companyId }

  return { access: perm.access_level as ProductSaleAccess, role, employeeId: empId, companyId }
}

export function canManageProducts(access: ProductSaleAccess) {
  return access === "admin" || access === "manager"
}
export function canManagePermissions(access: ProductSaleAccess) {
  return access === "admin"
}
export function canSeeAllSales(access: ProductSaleAccess) {
  return access === "admin"
}
export function canSeeTeamSales(access: ProductSaleAccess) {
  return access === "admin" || access === "manager"
}
export function canRecordSale(access: ProductSaleAccess) {
  return access !== "none"
}
