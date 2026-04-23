-- ═══════════════════════════════════════════════════════════
-- STEP 2B: ดูรายละเอียดเทียบ — เก่า vs GOODHR vs หลัง merge
-- (เฉพาะคนที่มีการใช้ลาจากแอปเก่า)
-- ═══════════════════════════════════════════════════════════
SELECT 
  o.emp_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  o.leave_name,
  o.old_quota AS "โควต้า(เก่า)",
  o.old_used AS "ใช้(เก่า)",
  lb.entitled_days AS "โควต้า(GOODHR)",
  lb.used_days AS "ใช้(GOODHR)",
  lb.remaining_days AS "เหลือ(GOODHR)",
  GREATEST(o.old_quota, lb.entitled_days) AS "โควต้าใหม่",
  ROUND(o.old_used + lb.used_days, 2) AS "ใช้รวม",
  ROUND(GREATEST(o.old_quota, lb.entitled_days) - (o.old_used + lb.used_days), 2) AS "คงเหลือใหม่"
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
ORDER BY o.emp_code, o.leave_name
LIMIT 100;
