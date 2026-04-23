-- ═══════════════════════════════════════════════════════════
-- STEP 3A: อัปเดต entitled_days (โควต้า)
-- ใช้ค่าที่มากกว่าระหว่างแอปเก่ากับ GOODHR
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET entitled_days = GREATEST(sub.old_quota, lb.entitled_days)
FROM (
  SELECT e.id AS employee_id, lt.id AS leave_type_id, o.old_quota
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
) sub
WHERE lb.employee_id = sub.employee_id 
  AND lb.leave_type_id = sub.leave_type_id 
  AND lb.year = 2026;
