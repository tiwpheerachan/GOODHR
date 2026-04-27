-- ตรวจสอบการหักสายจริง — ดูตัวอย่างคนที่สาย 1-20 นาที
-- เพื่อเช็คว่า grace period ทำงานถูก
SELECT
  e.employee_code,
  e.first_name_th,
  c.code AS company,
  d.name AS dept,
  ar.work_date,
  ar.clock_in,
  ar.expected_start,
  ar.late_minutes,
  ar.status
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
JOIN companies c ON c.id = e.company_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE ar.work_date >= '2026-04-01' AND ar.work_date <= '2026-04-21'
  AND ar.late_minutes > 0 AND ar.late_minutes <= 20
ORDER BY c.code, ar.late_minutes
LIMIT 20;
