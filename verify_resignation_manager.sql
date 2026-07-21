-- ════════════════════════════════════════════════════════════════════
-- เช็คว่า "หัวหน้าจะเห็นใบลาออกนี้ไหม" (จำลอง logic หน้าอนุมัติ production)
--   production: หัวหน้าเห็นงานของคนที่ employee_manager_history active ชี้มาหาตัวเอง
-- แก้ EMP = รหัสพนักงานที่ยื่นลาออก
-- ════════════════════════════════════════════════════════════════════

WITH t AS (SELECT '68000216'::text AS emp_code)   -- ← ศรัณพร (เปลี่ยนได้)
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  rr.status                                        AS สถานะใบลาออก,
  rr.created_at::date                              AS ยื่นเมื่อ,
  -- หัวหน้าที่ "จะเห็นงาน" (จาก history active) — production ใช้อันนี้
  hm.employee_code || ' ' || hm.first_name_th      AS หัวหน้าที่เห็นงาน_history,
  -- supervisor_id (เผื่อเทียบว่าตรงไหม)
  sup.first_name_th                                AS supervisor_id_คือ,
  CASE
    WHEN h.manager_id IS NULL THEN '❌ ไม่มีหัวหน้า → ไม่มีใครเห็น'
    WHEN e.supervisor_id IS DISTINCT FROM h.manager_id THEN '⚠️ history≠supervisor (หัวหน้าใน history เห็น แต่ supervisor ไม่เห็น)'
    ELSE '✅ ปกติ — ' || hm.first_name_th || ' เห็นงานนี้'
  END AS ผลวิเคราะห์,
  -- snapshot manager_id บนใบลาออก (ตอนยื่น) — ใช้แค่ notification ไม่เกี่ยวการมองเห็น
  snap.first_name_th                               AS snapshot_manager_บนใบ
FROM t
JOIN employees e ON e.employee_code = t.emp_code
LEFT JOIN resignation_requests rr ON rr.employee_id = e.id AND rr.status = 'pending_manager'
LEFT JOIN employee_manager_history h ON h.employee_id = e.id AND h.effective_to IS NULL
LEFT JOIN employees hm  ON hm.id = h.manager_id
LEFT JOIN employees sup ON sup.id = e.supervisor_id
LEFT JOIN employees snap ON snap.id = rr.manager_id;

-- ─── ถ้าอยากเช็คว่า "นน" (หัวหน้า) เห็นลูกทีมกี่คน + ใครยื่นลาออกค้าง ───
-- WITH mgr AS (SELECT id FROM employees WHERE first_name_th LIKE '%นน%' LIMIT 1)   -- แก้ชื่อหัวหน้า
-- SELECT e.employee_code, e.first_name_th, e.last_name_th, rr.status
-- FROM employee_manager_history h
-- JOIN mgr ON mgr.id = h.manager_id
-- JOIN employees e ON e.id = h.employee_id
-- LEFT JOIN resignation_requests rr ON rr.employee_id = e.id AND rr.status = 'pending_manager'
-- WHERE h.effective_to IS NULL
-- ORDER BY (rr.status IS NOT NULL) DESC, e.employee_code;
