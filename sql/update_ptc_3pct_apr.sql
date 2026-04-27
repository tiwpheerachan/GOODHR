-- ═══════════════════════════════════════════════════════════
-- อัปเดต payroll_records ของ 6 คน PTC กลุ่มหัก ณ ที่จ่าย 3%
-- อิงตามชีท: 04.ค่าจ้างกลุ่มหัก ณ ที่จ่าย 3% ประจำเดือนเมษายน 2026
-- ═══════════════════════════════════════════════════════════

-- ดูก่อน: payroll_records ปัจจุบันของ 6 คนนี้
SELECT e.employee_code, e.first_name_th,
  pr.base_salary, pr.ot_amount, pr.commission, pr.other_income,
  pr.deduct_late, pr.deduct_absent, pr.deduct_other,
  pr.social_security_amount, pr.monthly_tax_withheld,
  pr.gross_income, pr.total_deductions, pr.net_salary
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE e.employee_code IN ('68000064','69000063','69000077','69000066','68000200','69000022')
  AND pr.year = 2026 AND pr.month = 4
ORDER BY e.employee_code;
