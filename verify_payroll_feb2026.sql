-- ============================================
-- VERIFY: Payroll Import Feb 2026
-- Run this in Supabase SQL Editor to check data
-- ============================================

-- 1) จำนวน payroll_records ต่อบริษัท
SELECT
    c.name_th AS company,
    c.code,
    COUNT(pr.id) AS record_count,
    ROUND(SUM(pr.base_salary)::numeric, 2) AS total_base_salary,
    ROUND(SUM(pr.gross_income)::numeric, 2) AS total_gross,
    ROUND(SUM(pr.net_salary)::numeric, 2) AS total_net,
    ROUND(SUM(pr.social_security_amount)::numeric, 2) AS total_sso,
    ROUND(SUM(pr.monthly_tax_withheld)::numeric, 2) AS total_tax
FROM payroll_records pr
JOIN companies c ON c.id = pr.company_id
WHERE pr.year = 2026 AND pr.month = 2
GROUP BY c.name_th, c.code
ORDER BY c.name_th;

-- 2) ตรวจสอบ payroll_periods ทั้ง 4 บริษัท
SELECT
    pp.id,
    c.name_th AS company,
    c.code,
    pp.year,
    pp.month,
    pp.period_name,
    pp.start_date,
    pp.end_date,
    pp.pay_date,
    pp.status,
    (SELECT COUNT(*) FROM payroll_records pr WHERE pr.payroll_period_id = pp.id) AS record_count
FROM payroll_periods pp
JOIN companies c ON c.id = pp.company_id
WHERE pp.year = 2026 AND pp.month = 2
ORDER BY c.name_th;

-- 3) Spot check: Top 5 เงินเดือนสูงสุด
SELECT
    e.employee_code,
    e.first_name_th || ' ' || e.last_name_th AS name,
    c.code AS company,
    pr.base_salary,
    pr.gross_income,
    pr.net_salary,
    pr.social_security_amount AS sso,
    pr.monthly_tax_withheld AS tax,
    pr.deduct_late,
    pr.deduct_absent
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
JOIN companies c ON c.id = pr.company_id
WHERE pr.year = 2026 AND pr.month = 2
ORDER BY pr.base_salary DESC
LIMIT 5;

-- 4) Spot check: พนักงานที่มีหักมาสาย/ขาดงาน
SELECT
    e.employee_code,
    e.first_name_th || ' ' || e.last_name_th AS name,
    c.code AS company,
    pr.base_salary,
    pr.deduct_late,
    pr.deduct_absent,
    pr.net_salary
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
JOIN companies c ON c.id = pr.company_id
WHERE pr.year = 2026 AND pr.month = 2
  AND (pr.deduct_late > 0 OR pr.deduct_absent > 0)
ORDER BY (pr.deduct_late + pr.deduct_absent) DESC
LIMIT 10;

-- 5) รวมยอดทั้งหมด เทียบกับ Excel
SELECT
    COUNT(*) AS total_employees,
    ROUND(SUM(base_salary)::numeric, 2) AS total_base_salary,
    ROUND(SUM(gross_income)::numeric, 2) AS total_gross,
    ROUND(SUM(net_salary)::numeric, 2) AS total_net,
    ROUND(SUM(social_security_amount)::numeric, 2) AS total_sso,
    ROUND(SUM(monthly_tax_withheld)::numeric, 2) AS total_tax,
    ROUND(SUM(deduct_late)::numeric, 2) AS total_deduct_late,
    ROUND(SUM(deduct_absent)::numeric, 2) AS total_deduct_absent
FROM payroll_records
WHERE year = 2026 AND month = 2;

-- ค่าที่ควรได้ (จาก Python script):
-- total_employees: 313
-- total_base_salary: 7,452,650.00
-- total_gross: 9,500,112.59
-- total_net: 9,063,360.46
-- total_sso: 227,159.00
-- total_tax: 167,399.38
