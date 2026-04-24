-- ═══════════════════════════════════════════════════════════
-- เช็ค RABBIT: มี kpi_bonus_settings + kpi_forms เดือนไหนบ้าง
-- ═══════════════════════════════════════════════════════════

-- 1) RABBIT พนักงานที่มีฐาน KPI
SELECT
  e.employee_code, e.first_name_th || ' ' || e.last_name_th AS name,
  kbs.standard_amount
FROM kpi_bonus_settings kbs
JOIN employees e ON e.id = kbs.employee_id AND e.is_active = true
JOIN companies c ON c.id = e.company_id AND c.code = 'RABBIT'
WHERE kbs.is_active = true
ORDER BY e.employee_code;
