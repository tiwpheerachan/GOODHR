-- ═══════════════════════════════════════════════════════════
-- เช็ค: ตาราง monthly_shift_assignments วันที่ 13-15 เม.ย. ของ SHD
-- แสดงเป็น work หรือ holiday?
-- ═══════════════════════════════════════════════════════════
SELECT
  msa.work_date,
  msa.assignment_type,
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  c.code AS company
FROM monthly_shift_assignments msa
JOIN employees e ON e.id = msa.employee_id
JOIN companies c ON c.id = msa.company_id
WHERE msa.work_date IN ('2026-04-13', '2026-04-14', '2026-04-15')
  AND c.code = 'SHD'
  AND msa.assignment_type <> 'holiday'
ORDER BY msa.work_date, e.employee_code
LIMIT 20;
