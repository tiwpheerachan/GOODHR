-- ═══════════════════════════════════════════════════════════
-- เช็ค payroll_records: bonus กับ kpi_grade ของ TOP1 เดือน เม.ย.
-- ═══════════════════════════════════════════════════════════
SELECT
  c.code AS company,
  COUNT(*) AS total_records,
  COUNT(CASE WHEN pr.bonus > 0 THEN 1 END) AS "มี_bonus",
  COUNT(CASE WHEN pr.kpi_grade IS NOT NULL AND pr.kpi_grade <> 'pending' THEN 1 END) AS "มี_grade",
  SUM(pr.bonus) AS "รวม_bonus"
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
JOIN companies c ON c.id = pr.company_id
WHERE pr.year = 2026 AND pr.month = 4
GROUP BY c.code
ORDER BY c.code;
