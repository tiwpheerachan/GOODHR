-- ============================================
-- CHECK: พนักงานที่ยังไม่มี salary_structures
-- ============================================

-- 1) พนักงาน active ที่ไม่มี salary_structures เลย
SELECT
    e.employee_code,
    e.first_name_th || ' ' || e.last_name_th AS name,
    c.code AS company,
    e.is_active
FROM employees e
JOIN companies c ON c.id = e.company_id
LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.effective_to IS NULL
WHERE e.is_active = true
  AND ss.id IS NULL
ORDER BY c.code, e.employee_code;

-- 2) สรุปจำนวนต่อบริษัท
SELECT
    c.code AS company,
    c.name_th,
    COUNT(e.id) AS total_active_employees,
    COUNT(ss.id) AS has_salary_structure,
    COUNT(e.id) - COUNT(ss.id) AS missing_salary_structure
FROM employees e
JOIN companies c ON c.id = e.company_id
LEFT JOIN salary_structures ss ON ss.employee_id = e.id AND ss.effective_to IS NULL
WHERE e.is_active = true
GROUP BY c.code, c.name_th
ORDER BY c.code;

-- 3) ตรวจสอบ payroll_periods ที่มีอยู่
SELECT
    pp.id,
    c.code AS company,
    pp.year,
    pp.month,
    pp.period_name,
    pp.start_date,
    pp.end_date,
    pp.status,
    (SELECT COUNT(*) FROM payroll_records pr WHERE pr.payroll_period_id = pp.id) AS record_count
FROM payroll_periods pp
JOIN companies c ON c.id = pp.company_id
ORDER BY pp.year DESC, pp.month DESC, c.code;
