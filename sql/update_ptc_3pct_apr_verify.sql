-- ═══════════════════════════════════════════════════════════
-- VERIFY: ตรวจสอบหลังอัปเดต
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  pr.base_salary AS "เงินเดือน",
  pr.ot_amount AS "OT",
  pr.commission AS "Commission",
  pr.other_income AS "อื่นๆ",
  pr.gross_income AS "รวมรายรับ",
  pr.deduct_absent AS "หักขาด",
  pr.monthly_tax_withheld AS "ภาษี3%",
  pr.total_deductions AS "รวมหัก",
  pr.net_salary AS "สุทธิ",
  pr.is_manual_override AS "manual"
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE e.employee_code IN ('68000064','69000063','69000077','69000066','68000200','69000022')
  AND pr.year = 2026 AND pr.month = 4
ORDER BY e.employee_code;
