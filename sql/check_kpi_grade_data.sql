-- เช็คข้อมูล kpi_grade ใน payroll_records เดือน 4
SELECT
  kpi_grade,
  COUNT(*) AS total,
  SUM(bonus) AS total_bonus
FROM payroll_records
WHERE year = 2026 AND month = 4
GROUP BY kpi_grade
ORDER BY kpi_grade;
