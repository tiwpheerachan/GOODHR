-- ═══════════════════════════════════════════════════════════
-- VERIFY: ดู records ที่ used_days มากกว่า approved requests
-- เพื่อยืนยันว่าส่วนต่างมาจากแอปเก่าจริง
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.entitled_days AS "โควต้า",
  lb.used_days AS "used_total",
  COALESCE(req.total_approved, 0) AS "from_GOODHR",
  lb.used_days - COALESCE(req.total_approved, 0) AS "from_old_app",
  lb.remaining_days AS "คงเหลือ",
  lb.entitled_days - lb.used_days - lb.pending_days AS "remaining_คำนวณ",
  CASE WHEN lb.remaining_days = lb.entitled_days - lb.used_days - lb.pending_days
    THEN 'ถูกต้อง' ELSE 'ไม่ตรง!' END AS "remaining_check"
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
LEFT JOIN (
  SELECT employee_id, leave_type_id, SUM(total_days) AS total_approved
  FROM leave_requests
  WHERE status = 'approved' AND EXTRACT(YEAR FROM start_date::date) = 2026
  GROUP BY employee_id, leave_type_id
) req ON req.employee_id = lb.employee_id AND req.leave_type_id = lb.leave_type_id
WHERE lb.year = 2026
  AND lb.used_days > 0
ORDER BY lb.used_days - COALESCE(req.total_approved, 0) DESC, lb.used_days DESC;
