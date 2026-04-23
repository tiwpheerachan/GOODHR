-- ═══════════════════════════════════════════════════════════
-- SYNC STEP 1: ดูตัวอย่างก่อนว่าจะ update อะไรบ้าง (SELECT เฉยๆ)
-- คำนวณ used_days จาก approved leave_requests จริง
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.entitled_days AS "โควต้า",
  lb.used_days AS "used_เดิม",
  COALESCE(req.total_approved, 0) AS "approved_จริง",
  -- ค่าใหม่: ใช้ค่าที่มากกว่า (เพื่อรักษาข้อมูลจากแอปเก่าที่ import มา)
  GREATEST(lb.used_days, COALESCE(req.total_approved, 0)) AS "used_ใหม่",
  lb.pending_days AS "pending",
  lb.entitled_days - GREATEST(lb.used_days, COALESCE(req.total_approved, 0)) - lb.pending_days AS "remaining_ใหม่"
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
LEFT JOIN (
  SELECT
    employee_id,
    leave_type_id,
    SUM(total_days) AS total_approved
  FROM leave_requests
  WHERE status = 'approved'
    AND EXTRACT(YEAR FROM start_date::date) = 2026
  GROUP BY employee_id, leave_type_id
) req ON req.employee_id = lb.employee_id AND req.leave_type_id = lb.leave_type_id
WHERE lb.year = 2026
  AND COALESCE(req.total_approved, 0) > lb.used_days
ORDER BY COALESCE(req.total_approved, 0) - lb.used_days DESC
LIMIT 50;
