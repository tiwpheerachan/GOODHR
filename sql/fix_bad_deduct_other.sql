-- ═══════════════════════════════════════════════════════════
-- FIX: แก้ deduct_other ที่สะสมผิดปกติ เดือน เม.ย.
-- Reset ให้ = unpaid_leave_deduct + deduction_extras จริง
-- ═══════════════════════════════════════════════════════════

-- ดูก่อน
SELECT
  e.employee_code,
  pr.deduct_other AS "เดิม",
  ROUND(pr.base_salary / 30.0 * pr.leave_unpaid_days, 2) AS "unpaid_calc",
  pr.deduct_other - ROUND(pr.base_salary / 30.0 * pr.leave_unpaid_days, 2) AS "ส่วนเกิน"
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE pr.year = 2026 AND pr.month = 4
  AND pr.deduct_other > pr.base_salary
ORDER BY pr.deduct_other DESC;
