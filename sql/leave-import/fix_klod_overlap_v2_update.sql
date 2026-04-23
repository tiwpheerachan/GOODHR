-- ═══════════════════════════════════════════════════════════
-- FIX UPDATE: ลบ old_used ที่บวกเข้าผิดใน "ลาคลอดต่อเนื่อง"
-- 65000026: ลบ 0.02 ออก
-- 68000008: ลบ 2.00 ออก
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET
  used_days = ROUND(lb.used_days - fix.wrong_added, 2),
  remaining_days = ROUND(
    lb.entitled_days - (lb.used_days - fix.wrong_added) - lb.pending_days,
    2
  )
FROM (
  VALUES
    ('65000026', 0.02),
    ('68000008', 2.00)
) AS fix(emp_code, wrong_added)
JOIN employees e ON e.employee_code = fix.emp_code
  AND e.is_active = true AND e.deleted_at IS NULL
JOIN leave_types lt ON lt.company_id = e.company_id
  AND lt.is_active = true
  AND lt.name ILIKE '%คลอด%'
WHERE lb.employee_id = e.id
  AND lb.leave_type_id = lt.id
  AND lb.year = 2026;
