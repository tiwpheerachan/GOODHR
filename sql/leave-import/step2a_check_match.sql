-- ═══════════════════════════════════════════════════════════
-- STEP 2A: ตรวจสอบว่า match ได้กี่คน
-- ═══════════════════════════════════════════════════════════
SELECT 
  'MATCHED' AS status,
  COUNT(DISTINCT o.emp_code) AS employees,
  COUNT(*) AS records
FROM _old_app_leave o
JOIN employees e ON e.employee_code = o.emp_code 
  AND e.is_active = true 
  AND e.deleted_at IS NULL

UNION ALL

SELECT 
  'NOT IN GOODHR' AS status,
  COUNT(DISTINCT o.emp_code),
  COUNT(*)
FROM _old_app_leave o
LEFT JOIN employees e ON e.employee_code = o.emp_code 
  AND e.is_active = true 
  AND e.deleted_at IS NULL
WHERE e.id IS NULL;
