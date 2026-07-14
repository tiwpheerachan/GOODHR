"use client"
import { useEffect, useState, useCallback } from "react"

// ── สิทธิ์ดูเงินเดือน (payroll_access) ฝั่ง client ──
// เรียก /api/admin/payroll-access → { hasAccess, scope }
// scope = { any, all, companyIds } — รองรับสิทธิ์รายบริษัท
// ใช้ซ่อน/แสดง เมนูเงินเดือน + แท็บเงินเดือนในหน้าพนักงาน
// (การบังคับจริงอยู่ที่ middleware + API — hook นี้แค่ UX)
export type PayrollScope = { any: boolean; all: boolean; companyIds: string[] }

const EMPTY: PayrollScope = { any: false, all: false, companyIds: [] }

export function usePayrollAccess() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [scope, setScope] = useState<PayrollScope>(EMPTY)
  useEffect(() => {
    let alive = true
    fetch("/api/admin/payroll-access")
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        setHasAccess(!!d.hasAccess)
        setScope(d.scope ?? EMPTY)
      })
      .catch(() => { if (alive) { setHasAccess(false); setScope(EMPTY) } })
    return () => { alive = false }
  }, [])

  // เห็นเงินเดือนบริษัทนี้ไหม (สำหรับ gate รายบริษัท)
  const canCompany = useCallback(
    (companyId: string | null | undefined) => scope.all || (!!companyId && scope.companyIds.includes(companyId)),
    [scope],
  )

  return { hasAccess: hasAccess === true, loading: hasAccess === null, scope, canCompany }
}
