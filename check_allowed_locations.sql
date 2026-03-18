-- ══════════════════════════════════════════════════════════════
-- ตรวจสอบสิทธิ์เช็คอินของพนักงานทุกคน
-- ══════════════════════════════════════════════════════════════

-- 1) สรุปรวม: แต่ละคนเช็คอินได้กี่ที่
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  e.nickname,
  c.code AS company,
  d.name AS department,
  b.name AS branch_assigned,
  COUNT(eal.branch_id) AS allowed_locations,
  STRING_AGG(ab.name, ', ' ORDER BY ab.name) AS allowed_branches
FROM employees e
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN branches b ON b.id = e.branch_id
LEFT JOIN employee_allowed_locations eal ON eal.employee_id = e.id
LEFT JOIN branches ab ON ab.id = eal.branch_id
WHERE e.is_active = true
GROUP BY e.id, e.employee_code, e.first_name_th, e.last_name_th, e.nickname,
         c.code, d.name, b.name
ORDER BY c.code, e.employee_code;

-- 2) คนที่ยังไม่มี allowed_locations เลย
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  c.code AS company
FROM employees e
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN employee_allowed_locations eal ON eal.employee_id = e.id
WHERE e.is_active = true
  AND eal.employee_id IS NULL
ORDER BY c.code, e.employee_code;

-- 3) สรุปจำนวนตามบริษัท
SELECT
  c.code AS company,
  COUNT(DISTINCT e.id) AS total_employees,
  COUNT(DISTINCT CASE WHEN eal.employee_id IS NOT NULL THEN e.id END) AS has_location,
  COUNT(DISTINCT CASE WHEN eal.employee_id IS NULL THEN e.id END) AS no_location
FROM employees e
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN employee_allowed_locations eal ON eal.employee_id = e.id
WHERE e.is_active = true
GROUP BY c.code
ORDER BY c.code;
