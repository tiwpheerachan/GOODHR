-- ═══════════════════════════════════════════════════════════
-- FIX UPDATE: แก้ไข "ลาคลอดต่อเนื่อง" ที่โดน update ผิด
-- ลบ old_used ที่บวกเข้าไปผิด แล้วคำนวณ remaining ใหม่
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET
  used_days = ROUND(lb.used_days - sub.old_used, 2),
  remaining_days = ROUND(
    lb.entitled_days - (lb.used_days - sub.old_used) - lb.pending_days,
    2
  )
FROM (
  SELECT e.id AS employee_id, lt.id AS leave_type_id, o.old_used
  FROM _old_app_leave o
  JOIN employees e ON e.employee_code = o.emp_code
    AND e.is_active = true AND e.deleted_at IS NULL
  JOIN leave_types lt ON lt.company_id = e.company_id
    AND lt.is_active = true
    AND lt.name ILIKE '%ป่วย%'
    AND lt.name ILIKE '%คลอด%'
  WHERE o.leave_name = 'ลาป่วย' AND o.old_used > 0
) sub
WHERE lb.employee_id = sub.employee_id
  AND lb.leave_type_id = sub.leave_type_id
  AND lb.year = 2026;
