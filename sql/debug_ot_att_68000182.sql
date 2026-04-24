-- DEBUG: ดู attendance_records ที่มี OT ของ 68000182
SELECT
  ar.work_date,
  ar.clock_in,
  ar.clock_out,
  ar.status,
  ar.ot_minutes,
  ar.work_minutes
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
WHERE e.employee_code = '68000182'
  AND ar.work_date >= '2026-03-22'
  AND ar.work_date <= '2026-04-21'
  AND (ar.ot_minutes > 0 OR ar.work_minutes > 480)
ORDER BY ar.work_date;
