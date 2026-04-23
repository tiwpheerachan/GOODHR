-- ═══════════════════════════════════════════════════════════
-- STEP 3B: อัปเดต used_days + remaining_days
-- used_days = ใช้(GOODHR เดิม) + ใช้(แอปเก่า)
-- remaining_days = entitled_days - used_days - pending_days
-- (เฉพาะคนที่มีการใช้จริงจากแอปเก่า)
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET 
  used_days = ROUND(lb.used_days + sub.old_used, 2),
  remaining_days = ROUND(
    lb.entitled_days - (lb.used_days + sub.old_used) - lb.pending_days, 
    2
  )
FROM (
  SELECT e.id AS employee_id, lt.id AS leave_type_id, o.old_used
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
  WHERE o.old_used > 0
) sub
WHERE lb.employee_id = sub.employee_id 
  AND lb.leave_type_id = sub.leave_type_id 
  AND lb.year = 2026;
