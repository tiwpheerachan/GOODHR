-- ═══════════════════════════════════════════════════════════
-- FIX UPDATE: Reset deduct_other ที่สูงผิดปกติ (> base_salary)
-- คำนวณใหม่ = unpaid leave deduct เท่านั้น (deduction_extras ส่วนใหญ่ = {})
-- แล้วคำนวณ total_deductions + net_salary ใหม่
-- ═══════════════════════════════════════════════════════════
UPDATE payroll_records pr
SET
  deduct_other = ROUND(pr.base_salary / 30.0 * pr.leave_unpaid_days, 2),
  total_deductions = COALESCE(pr.deduct_late, 0) + COALESCE(pr.deduct_early_out, 0) + COALESCE(pr.deduct_absent, 0)
    + COALESCE(pr.deduct_loan, 0) + ROUND(pr.base_salary / 30.0 * pr.leave_unpaid_days, 2)
    + COALESCE(pr.social_security_amount, 0) + COALESCE(pr.monthly_tax_withheld, 0),
  net_salary = GREATEST(
    COALESCE(pr.gross_income, 0)
    - (COALESCE(pr.deduct_late, 0) + COALESCE(pr.deduct_early_out, 0) + COALESCE(pr.deduct_absent, 0)
       + COALESCE(pr.deduct_loan, 0) + ROUND(pr.base_salary / 30.0 * pr.leave_unpaid_days, 2)
       + COALESCE(pr.social_security_amount, 0) + COALESCE(pr.monthly_tax_withheld, 0)),
    0
  )
WHERE pr.year = 2026 AND pr.month = 4
  AND pr.deduct_other > pr.base_salary;
