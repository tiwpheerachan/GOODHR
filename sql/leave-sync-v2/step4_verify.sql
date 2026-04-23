-- ═══════════════════════════════════════════════════════════
-- SYNC V2 STEP 4: ตรวจสอบความถูกต้อง
-- ═══════════════════════════════════════════════════════════

-- 4A) สรุปภาพรวม
SELECT
  CASE
    WHEN lb.used_days = GREATEST(COALESCE(s.used_days, 0), COALESCE(req.goodhr_used, 0))
      THEN 'ตรงกัน'
    WHEN lb.used_days > GREATEST(COALESCE(s.used_days, 0), COALESCE(req.goodhr_used, 0))
      THEN 'มากกว่าที่ควร'
    ELSE 'น้อยกว่าที่ควร'
  END AS status,
  COUNT(*) AS records
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
LEFT JOIN _leave_summary_new s ON s.emp_code = e.employee_code
  AND (
    (s.leave_name = 'ลาป่วย'    AND EXISTS (SELECT 1 FROM leave_types lt WHERE lt.id = lb.leave_type_id AND lt.name = 'ลาป่วย'))
    OR (s.leave_name = 'ลากิจ'     AND EXISTS (SELECT 1 FROM leave_types lt WHERE lt.id = lb.leave_type_id AND lt.name = 'ลากิจ'))
    OR (s.leave_name = 'ลาพักร้อน' AND EXISTS (SELECT 1 FROM leave_types lt WHERE lt.id = lb.leave_type_id AND lt.name = 'ลาพักร้อน'))
    OR (s.leave_name = 'ลากิจไม่รับค่าจ้าง' AND EXISTS (SELECT 1 FROM leave_types lt WHERE lt.id = lb.leave_type_id AND lt.name = 'ลากิจไม่รับค่าจ้าง'))
  )
LEFT JOIN (
  SELECT employee_id, leave_type_id, SUM(total_days) AS goodhr_used
  FROM leave_requests
  WHERE status = 'approved' AND EXTRACT(YEAR FROM start_date::date) = 2026
  GROUP BY employee_id, leave_type_id
) req ON req.employee_id = lb.employee_id AND req.leave_type_id = lb.leave_type_id
WHERE lb.year = 2026
  AND (lb.used_days > 0 OR COALESCE(s.used_days, 0) > 0 OR COALESCE(req.goodhr_used, 0) > 0)
GROUP BY 1;
