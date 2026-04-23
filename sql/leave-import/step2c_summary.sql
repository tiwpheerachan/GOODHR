-- ═══════════════════════════════════════════════════════════
-- STEP 2C: สรุปยอดรวมที่จะเปลี่ยน (แยกตามประเภทลา)
-- ═══════════════════════════════════════════════════════════
SELECT 
  o.leave_name,
  COUNT(*) AS records,
  ROUND(SUM(o.old_used), 2) AS "รวมใช้(เก่า)",
  ROUND(SUM(lb.used_days), 2) AS "รวมใช้(GOODHR)",
  ROUND(SUM(o.old_used + lb.used_days), 2) AS "รวมใช้หลัง merge"
FROM _old_app_leave o
JOIN employees e ON e.employee_code = o.emp_code 
  AND e.is_active = true AND e.deleted_at IS NULL
JOIN leave_types lt ON lt.company_id = e.company_id 
  AND lt.is_active = true
  AND (
    (o.leave_name = 'ลากิจ'     AND lt.name ILIKE '%กิจ%' AND lt.name NOT ILIKE '%ไม่รับ%')
    OR (o.leave_name = 'ลาป่วย'    AND lt.name ILIKE '%ป่วย%')
    OR (o.leave_name = 'ลาพักร้อน' AND lt.name ILIKE '%พักร้อน%')
  )
JOIN leave_balances lb ON lb.employee_id = e.id 
  AND lb.leave_type_id = lt.id 
  AND lb.year = 2026
WHERE o.old_used > 0
GROUP BY o.leave_name
ORDER BY o.leave_name;
