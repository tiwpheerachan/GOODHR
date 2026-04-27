-- ═══════════════════════════════════════════════════════════
-- ตรวจสอบกะการทำงาน + เกณฑ์สายของแต่ละบริษัท
-- ═══════════════════════════════════════════════════════════

-- 1) กะทำงานทั้งหมด แยกตามบริษัท
SELECT
  c.code AS company,
  st.name AS shift_name,
  st.work_start,
  st.work_end,
  st.break_minutes,
  st.late_threshold_minutes,
  st.is_active,
  (SELECT COUNT(*) FROM work_schedules ws
   JOIN employees e2 ON e2.id = ws.employee_id AND e2.is_active = true
   WHERE ws.shift_id = st.id AND ws.effective_to IS NULL) AS employee_count
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start;
