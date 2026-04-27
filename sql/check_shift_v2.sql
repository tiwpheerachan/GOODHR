-- กะทำงานทั้งหมดแยกตามบริษัท
SELECT
  c.code AS company,
  st.name AS shift_name,
  st.work_start,
  st.work_end,
  st.break_minutes,
  st.*
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start
LIMIT 20;
