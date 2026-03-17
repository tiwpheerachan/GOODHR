-- ═══════════════════════════════════════════════════
-- Set Manager Roles
-- อัปเดต users ที่เป็นหัวหน้าให้มี role = 'manager'
-- โดยดูจาก employee_manager_history ว่าใครถูกอ้างเป็น manager_id
-- ═══════════════════════════════════════════════════

-- 1) ดูก่อนว่ามี managers กี่คน (preview)
SELECT
  e.employee_code,
  e.first_name_th,
  e.last_name_th,
  u.role AS current_role,
  'manager' AS new_role
FROM users u
JOIN employees e ON e.id = u.employee_id
WHERE u.employee_id IN (
  SELECT DISTINCT manager_id
  FROM employee_manager_history
  WHERE manager_id IS NOT NULL
    AND effective_to IS NULL  -- เฉพาะที่ยังมีผลอยู่
)
AND u.role = 'employee'::user_role
ORDER BY e.employee_code;

-- 2) อัปเดต role เป็น manager
UPDATE users
SET role = 'manager'::user_role,
    updated_at = now()
WHERE employee_id IN (
  SELECT DISTINCT manager_id
  FROM employee_manager_history
  WHERE manager_id IS NOT NULL
    AND effective_to IS NULL
)
AND role = 'employee'::user_role;
