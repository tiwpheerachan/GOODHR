-- ═══════════════════════════════════════════════════════════
-- DIAGNOSTIC: เปรียบเทียบ approved leave_requests กับ leave_balances
-- หาคนที่มี requests approved แต่ balance used_days ยังเป็น 0
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  COUNT(lr.id) AS approved_count,
  SUM(lr.total_days) AS total_days_requested,
  lb.used_days AS balance_used_days,
  lb.remaining_days AS balance_remaining,
  lb.entitled_days AS balance_entitled
FROM leave_requests lr
JOIN employees e ON e.id = lr.employee_id
JOIN leave_types lt ON lt.id = lr.leave_type_id
LEFT JOIN leave_balances lb ON lb.employee_id = lr.employee_id
  AND lb.leave_type_id = lr.leave_type_id
  AND lb.year = 2026
WHERE lr.status = 'approved'
  AND EXTRACT(YEAR FROM lr.start_date::date) = 2026
GROUP BY e.employee_code, e.first_name_th, e.last_name_th, lt.name,
         lb.used_days, lb.remaining_days, lb.entitled_days
HAVING lb.used_days = 0 OR lb.used_days IS NULL
ORDER BY SUM(lr.total_days) DESC
LIMIT 30;
