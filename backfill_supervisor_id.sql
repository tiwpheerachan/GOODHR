-- ════════════════════════════════════════════════════════════════════
-- Backfill: sync employees.supervisor_id ให้ตรงกับ employee_manager_history
--   bug เดิม: เปลี่ยนหัวหน้าผ่าน /admin/employees/[id] → manager_history อัปเดต
--             แต่ employees.supervisor_id ค้างเป็นคนเดิม
--   ผลกระทบ: หน้า /admin/approvals/supervisors + /admin/org เด้งหาหัวหน้าเก่า
--
--   SQL นี้ใช้ครั้งเดียวเพื่อ sync ข้อมูลย้อนหลัง
--   หลังจาก fix API แล้วทุกการเปลี่ยนหัวหน้าใหม่จะ sync เองอัตโนมัติ
-- ════════════════════════════════════════════════════════════════════

-- ── 1) ตรวจดูก่อนว่ามีกี่ row ที่ไม่ตรง ──
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS employee_name,
  m_old.first_name_th || ' ' || m_old.last_name_th AS supervisor_id_เดิม,
  m_new.first_name_th || ' ' || m_new.last_name_th AS history_ปัจจุบัน,
  CASE WHEN e.supervisor_id IS DISTINCT FROM h.manager_id THEN '⚠ ไม่ตรง' ELSE 'OK' END AS สถานะ
FROM employees e
LEFT JOIN employee_manager_history h
       ON h.employee_id = e.id AND h.effective_to IS NULL
LEFT JOIN employees m_old ON m_old.id = e.supervisor_id
LEFT JOIN employees m_new ON m_new.id = h.manager_id
WHERE e.is_active = TRUE
  AND e.supervisor_id IS DISTINCT FROM h.manager_id
ORDER BY e.employee_code;


-- ── 2) Backfill: update supervisor_id ตาม history (active) ──
DO $$
DECLARE
  v_updated INT := 0;
  v_cleared INT := 0;
BEGIN
  -- (A) คนที่มี history active → set supervisor_id = manager_id
  UPDATE employees e
  SET    supervisor_id = h.manager_id,
         updated_at    = now()
  FROM   employee_manager_history h
  WHERE  h.employee_id  = e.id
    AND  h.effective_to IS NULL
    AND  e.supervisor_id IS DISTINCT FROM h.manager_id
    AND  e.is_active = TRUE;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  -- (B) คนที่ไม่มี history active แต่ supervisor_id ยังค้าง → clear เป็น NULL
  UPDATE employees e
  SET    supervisor_id = NULL,
         updated_at    = now()
  WHERE  e.is_active = TRUE
    AND  e.supervisor_id IS NOT NULL
    AND  NOT EXISTS (
      SELECT 1 FROM employee_manager_history h
      WHERE h.employee_id = e.id AND h.effective_to IS NULL
    );
  GET DIAGNOSTICS v_cleared = ROW_COUNT;

  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE ' Sync จาก history: % คน', v_updated;
  RAISE NOTICE ' Clear (ไม่มี history): % คน', v_cleared;
  RAISE NOTICE ' รวม: % คน', v_updated + v_cleared;
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;


-- ── 3) ตรวจสอบหลัง sync — ควรไม่มี '⚠ ไม่ตรง' เหลือ ──
SELECT
  COUNT(*) FILTER (WHERE e.supervisor_id IS DISTINCT FROM h.manager_id) AS still_mismatch,
  COUNT(*) AS total_active
FROM employees e
LEFT JOIN employee_manager_history h
       ON h.employee_id = e.id AND h.effective_to IS NULL
WHERE e.is_active = TRUE;
