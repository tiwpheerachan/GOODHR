-- เช็คว่า payroll_records เดือน เม.ย. มี ot_amount เท่าไหร่
SELECT
  c.code AS company,
  COUNT(*) AS total,
  COUNT(CASE WHEN pr.ot_amount > 0 THEN 1 END) AS "มี_OT",
  SUM(pr.ot_amount) AS "รวม_OT",
  COUNT(CASE WHEN pr.is_manual_override THEN 1 END) AS "manual"
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
JOIN companies c ON c.id = pr.company_id
WHERE pr.year = 2026 AND pr.month = 4
GROUP BY c.code
ORDER BY c.code;
