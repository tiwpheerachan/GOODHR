-- ═══════════════════════════════════════════════════════════
-- ตรวจสอบการคำนวณสายในโค้ด vs ข้อมูลจริง
-- ═══════════════════════════════════════════════════════════

-- 2) สรุปสถิติสายเดือน เม.ย. แยกบริษัท
SELECT
  c.code AS company,
  COUNT(*) AS total_records,
  COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late_count,
  COUNT(CASE WHEN ar.late_minutes > 0 THEN 1 END) AS has_late_minutes,
  ROUND(AVG(CASE WHEN ar.late_minutes > 0 THEN ar.late_minutes END), 1) AS avg_late_min,
  MAX(ar.late_minutes) AS max_late_min,
  MIN(CASE WHEN ar.late_minutes > 0 THEN ar.late_minutes END) AS min_late_min
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id AND e.is_active = true
JOIN companies c ON c.id = e.company_id
WHERE ar.work_date >= '2026-03-22' AND ar.work_date <= '2026-04-21'
GROUP BY c.code
ORDER BY c.code;
