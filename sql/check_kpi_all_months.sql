-- ═══════════════════════════════════════════════════════════
-- เช็ค kpi_forms ทุกเดือนของ 2026 แยกตามบริษัทและ status
-- ═══════════════════════════════════════════════════════════
SELECT
  c.code AS company,
  kf.month,
  kf.status,
  COUNT(*) AS total,
  SUM(CASE WHEN kf.grade = 'A' THEN 1 ELSE 0 END) AS "A",
  SUM(CASE WHEN kf.grade = 'B' THEN 1 ELSE 0 END) AS "B",
  SUM(CASE WHEN kf.grade = 'C' THEN 1 ELSE 0 END) AS "C",
  SUM(CASE WHEN kf.grade = 'D' THEN 1 ELSE 0 END) AS "D"
FROM kpi_forms kf
JOIN employees e ON e.id = kf.employee_id AND e.is_active = true
JOIN companies c ON c.id = e.company_id
WHERE kf.year = 2026
GROUP BY c.code, kf.month, kf.status
ORDER BY c.code, kf.month, kf.status;
