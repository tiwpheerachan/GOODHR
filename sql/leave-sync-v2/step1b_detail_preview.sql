-- ═══════════════════════════════════════════════════════════
-- SYNC V2 STEP 1B: ดูรายละเอียดว่าจะ update อะไรบ้าง
-- เปรียบเทียบ: ข้อมูลใหม่ (leave_summary) + GOODHR requests vs leave_balances ปัจจุบัน
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.entitled_days AS "โควต้า",
  lb.used_days AS "used_ปัจจุบัน",
  s.used_days AS "used_จากไฟล์",
  COALESCE(req.goodhr_used, 0) AS "used_GOODHR",
  -- ยอดใหม่ = MAX(ไฟล์, GOODHR requests) เพื่อเอาค่าที่ถูกต้องที่สุด
  GREATEST(s.used_days, COALESCE(req.goodhr_used, 0)) AS "used_ใหม่",
  lb.entitled_days - GREATEST(s.used_days, COALESCE(req.goodhr_used, 0)) - lb.pending_days AS "remaining_ใหม่"
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
JOIN leave_balances lb ON lb.employee_id = e.id AND lb.leave_type_id = lt.id AND lb.year = 2026
LEFT JOIN (
  SELECT employee_id, leave_type_id, SUM(total_days) AS goodhr_used
  FROM leave_requests
  WHERE status = 'approved' AND EXTRACT(YEAR FROM start_date::date) = 2026
  GROUP BY employee_id, leave_type_id
) req ON req.employee_id = e.id AND req.leave_type_id = lt.id
WHERE GREATEST(s.used_days, COALESCE(req.goodhr_used, 0)) <> lb.used_days
ORDER BY ABS(GREATEST(s.used_days, COALESCE(req.goodhr_used, 0)) - lb.used_days) DESC
LIMIT 50;
