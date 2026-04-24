-- ═══════════════════════════════════════════════════════════
-- เช็ค: payroll เดือน 4 ใช้ KPI เดือนอะไรในการคำนวณ
-- ดูจาก payroll_records ที่มี bonus > 0
-- ═══════════════════════════════════════════════════════════
SELECT
  c.code AS company,
  pr.year, pr.month,
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  pr.bonus,
  pr.kpi_grade,
  pr.kpi_standard_amount
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
JOIN companies c ON c.id = pr.company_id
WHERE pr.year = 2026 AND pr.month = 4 AND pr.bonus > 0
ORDER BY c.code, pr.bonus DESC
LIMIT 30;
