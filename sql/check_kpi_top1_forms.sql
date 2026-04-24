-- ═══════════════════════════════════════════════════════════
-- เช็ค kpi_forms: มีผลประเมินเดือน เม.ย. 2026 หรือยัง
-- ═══════════════════════════════════════════════════════════
SELECT
  c.code AS company,
  kf.status,
  kf.grade,
  COUNT(*) AS total
FROM kpi_forms kf
JOIN employees e ON e.id = kf.employee_id AND e.is_active = true
JOIN companies c ON c.id = e.company_id
WHERE kf.year = 2026 AND kf.month = 4
GROUP BY c.code, kf.status, kf.grade
ORDER BY c.code, kf.status, kf.grade;
