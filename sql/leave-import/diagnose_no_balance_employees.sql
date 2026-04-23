-- ═══════════════════════════════════════════════════════════
-- DIAGNOSTIC: พนักงานที่ไม่มี leave_balances เลย (ปี 2026)
-- ═══════════════════════════════════════════════════════════
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  c.code AS company,
  d.name AS department,
  e.hire_date
FROM employees e
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE e.is_active = true AND e.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb WHERE lb.employee_id = e.id AND lb.year = 2026
  )
ORDER BY e.employee_code;
