-- ═══════════════════════════════════════════════════════════
-- เช็ค KPI ของ TOP1: มีฐาน KPI ตั้งไว้ไหม + มีผลประเมินหรือยัง
-- ═══════════════════════════════════════════════════════════

-- 1) kpi_bonus_settings: มีกี่คนที่ตั้งฐาน KPI ไว้
SELECT
  c.code AS company,
  COUNT(DISTINCT kbs.employee_id) AS "พนง.มีฐาน_KPI",
  SUM(kbs.standard_amount) AS "รวมฐาน_KPI"
FROM kpi_bonus_settings kbs
JOIN employees e ON e.id = kbs.employee_id AND e.is_active = true
JOIN companies c ON c.id = e.company_id
WHERE kbs.is_active = true
GROUP BY c.code
ORDER BY c.code;
