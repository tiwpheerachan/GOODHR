-- ═══════════════════════════════════════════════════════════
-- VERIFY: ตรวจสอบความถูกต้องของ leave_balances หลัง sync
-- เปรียบเทียบ used_days กับ approved requests + old app import
-- ═══════════════════════════════════════════════════════════

-- 1) สรุปภาพรวม: used_days ตรงกับ approved requests กี่ record
SELECT
  CASE
    WHEN lb.used_days = COALESCE(req.total_approved, 0) THEN 'ตรงกัน (GOODHR only)'
    WHEN lb.used_days > COALESCE(req.total_approved, 0) THEN 'มากกว่า (มีจากแอปเก่า)'
    WHEN lb.used_days < COALESCE(req.total_approved, 0) THEN 'น้อยกว่า (ผิดปกติ!)'
  END AS status,
  COUNT(*) AS records
FROM leave_balances lb
LEFT JOIN (
  SELECT employee_id, leave_type_id, SUM(total_days) AS total_approved
  FROM leave_requests
  WHERE status = 'approved' AND EXTRACT(YEAR FROM start_date::date) = 2026
  GROUP BY employee_id, leave_type_id
) req ON req.employee_id = lb.employee_id AND req.leave_type_id = lb.leave_type_id
WHERE lb.year = 2026 AND (lb.used_days > 0 OR COALESCE(req.total_approved, 0) > 0)
GROUP BY 1
ORDER BY 1;
