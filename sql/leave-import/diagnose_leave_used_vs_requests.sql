-- ═══════════════════════════════════════════════════════════
-- DIAGNOSTIC: เปรียบเทียบ used_days ใน leave_balances กับ leave_requests จริง
-- เพื่อดูว่าข้อมูลตรงกันไหม
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.used_days AS "used_in_balance",
  COALESCE(SUM(lr.total_days), 0) AS "used_in_requests",
  lb.used_days - COALESCE(SUM(lr.total_days), 0) AS "diff (balance - requests)",
  lb.entitled_days AS "โควต้า",
  lb.remaining_days AS "คงเหลือ"
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
LEFT JOIN leave_requests lr ON lr.employee_id = lb.employee_id
  AND lr.leave_type_id = lb.leave_type_id
  AND lr.status = 'approved'
  AND EXTRACT(YEAR FROM lr.start_date::date) = lb.year
WHERE lb.year = 2026
  AND lb.used_days > 0
GROUP BY e.employee_code, e.first_name_th, e.last_name_th, lt.name,
         lb.used_days, lb.entitled_days, lb.remaining_days
HAVING lb.used_days <> COALESCE(SUM(lr.total_days), 0)
ORDER BY ABS(lb.used_days - COALESCE(SUM(lr.total_days), 0)) DESC
LIMIT 50;
