-- ═══════════════════════════════════════════════════════════
-- SYNC V2 STEP 2: UPDATE leave_balances ด้วยข้อมูลจาก leave_summary_6
-- สูตร: used_days = GREATEST(ไฟล์ใหม่, GOODHR approved requests)
-- เพื่อเอาค่าที่มากกว่า (ข้อมูลจริง) มาใช้
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET
  used_days = sub.new_used,
  remaining_days = ROUND(lb.entitled_days - sub.new_used - lb.pending_days, 2)
FROM (
  SELECT
    e.id AS employee_id,
    lt.id AS leave_type_id,
    GREATEST(s.used_days, COALESCE(req.goodhr_used, 0)) AS new_used
  FROM _leave_summary_new s
  JOIN employees e ON e.employee_code = s.emp_code
    AND e.is_active = true AND e.deleted_at IS NULL
  JOIN leave_types lt ON lt.company_id = e.company_id AND lt.is_active = true
    AND (
      (s.leave_name = 'ลาป่วย'    AND lt.name = 'ลาป่วย')
      OR (s.leave_name = 'ลากิจ'     AND lt.name = 'ลากิจ')
      OR (s.leave_name = 'ลาพักร้อน' AND lt.name = 'ลาพักร้อน')
      OR (s.leave_name = 'ลากิจไม่รับค่าจ้าง' AND lt.name = 'ลากิจไม่รับค่าจ้าง')
    )
  LEFT JOIN (
    SELECT employee_id, leave_type_id, SUM(total_days) AS goodhr_used
    FROM leave_requests
    WHERE status = 'approved' AND EXTRACT(YEAR FROM start_date::date) = 2026
    GROUP BY employee_id, leave_type_id
  ) req ON req.employee_id = e.id AND req.leave_type_id = lt.id
) sub
WHERE lb.employee_id = sub.employee_id
  AND lb.leave_type_id = sub.leave_type_id
  AND lb.year = 2026
  AND lb.used_days <> sub.new_used;
