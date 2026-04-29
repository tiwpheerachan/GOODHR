/**
 * ตรวจว่างวดเงินเดือนที่ครอบคลุมวันที่นี้ถูกล็อก (status=paid) หรือยัง
 * ใช้ตรวจก่อนอนุมัติ/ยื่นคำขอ leave, time adjustment, OT
 */
export async function isPayrollPeriodLocked(
  supa: any,
  companyId: string,
  targetDate: string,
): Promise<{ locked: boolean; periodName?: string }> {
  const { data } = await supa
    .from("payroll_periods")
    .select("id, period_name, status")
    .eq("company_id", companyId)
    .eq("status", "paid")
    .lte("start_date", targetDate)
    .gte("end_date", targetDate)
    .maybeSingle()

  if (data) {
    return { locked: true, periodName: data.period_name }
  }
  return { locked: false }
}
