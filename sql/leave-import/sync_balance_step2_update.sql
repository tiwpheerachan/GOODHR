-- ═══════════════════════════════════════════════════════════
-- SYNC STEP 2: อัปเดต leave_balances ให้ตรงกับ approved requests
-- ใช้ GREATEST เพื่อรักษาข้อมูลจากแอปเก่าที่ import มา
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET
  used_days = GREATEST(lb.used_days, COALESCE(sub.total_approved, 0)),
  remaining_days = ROUND(
    lb.entitled_days
    - GREATEST(lb.used_days, COALESCE(sub.total_approved, 0))
    - lb.pending_days,
    2
  )
FROM (
  SELECT
    employee_id,
    leave_type_id,
    SUM(total_days) AS total_approved
  FROM leave_requests
  WHERE status = 'approved'
    AND EXTRACT(YEAR FROM start_date::date) = 2026
  GROUP BY employee_id, leave_type_id
) sub
WHERE sub.employee_id = lb.employee_id
  AND sub.leave_type_id = lb.leave_type_id
  AND lb.year = 2026
  AND COALESCE(sub.total_approved, 0) > lb.used_days;
