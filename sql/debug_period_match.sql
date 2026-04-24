-- DEBUG: เช็คว่า payroll_records ของ 68000182 มี payroll_period_id อะไร
-- และ payroll_periods ของ SHD เดือน 4 มี id อะไร
SELECT
  'record' AS source,
  pr.id,
  pr.payroll_period_id,
  pr.ot_amount,
  pr.is_manual_override
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE e.employee_code = '68000182' AND pr.year = 2026 AND pr.month = 4

UNION ALL

SELECT
  'period' AS source,
  pp.id,
  pp.id AS payroll_period_id,
  0 AS ot_amount,
  false AS is_manual_override
FROM payroll_periods pp
JOIN companies c ON c.id = pp.company_id AND c.code = 'SHD'
WHERE pp.year = 2026 AND pp.month = 4;
