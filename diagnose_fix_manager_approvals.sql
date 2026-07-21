-- ════════════════════════════════════════════════════════════════════
-- ตรวจ + แก้เคส "เปลี่ยนหัวหน้าแล้วงานค้าง หัวหน้าใหม่ไม่เห็น"
--   สาเหตุ: employee_manager_history (ที่หน้า approvals ใช้) กับ
--           employees.supervisor_id ไม่ sync กัน (drift)
--   รันทีละส่วน (A → B → C) ดูผล A/B ก่อนค่อยแก้ C
-- ════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- A) ใครมี "หัวหน้าปัจจุบัน" ไม่ครบ/ไม่ตรง (ต้นเหตุงานไม่ขึ้น)
--    - no_active   = ไม่มีแถว active ใน history เลย (งานจะไม่ขึ้นใต้ใคร)
--    - multi_active= มีหลายแถว active (ข้อมูลซ้อน)
--    - mismatch    = history active ≠ employees.supervisor_id
-- ─────────────────────────────────────────────────────────────────
WITH act AS (
  SELECT employee_id, COUNT(*) AS n, MAX(manager_id::text) AS hist_mgr
  FROM employee_manager_history WHERE effective_to IS NULL GROUP BY employee_id
)
SELECT e.employee_code, e.first_name_th, e.last_name_th,
       e.supervisor_id                              AS emp_supervisor,
       a.hist_mgr                                   AS history_manager,
       COALESCE(a.n,0)                              AS active_history_rows,
       CASE
         WHEN a.n IS NULL              THEN 'no_active'
         WHEN a.n > 1                  THEN 'multi_active'
         WHEN e.supervisor_id IS DISTINCT FROM a.hist_mgr::uuid THEN 'mismatch'
         ELSE 'ok'
       END AS issue
FROM employees e
LEFT JOIN act a ON a.employee_id = e.id
WHERE e.is_active = TRUE
  AND (a.n IS NULL OR a.n > 1 OR e.supervisor_id IS DISTINCT FROM a.hist_mgr::uuid)
ORDER BY issue, e.employee_code;

-- ─────────────────────────────────────────────────────────────────
-- B) คำขอที่ "ค้าง" อยู่ของคนที่หัวหน้าปัจจุบันมีปัญหา (ใครบ้างไม่ขึ้น)
--    รวม leave / overtime / adjustment / offsite (pending) + resignation (pending_manager)
-- ─────────────────────────────────────────────────────────────────
WITH act AS (
  SELECT employee_id, COUNT(*) AS n FROM employee_manager_history
  WHERE effective_to IS NULL GROUP BY employee_id
),
pending AS (
  SELECT employee_id, 'ลา' AS typ, created_at FROM leave_requests             WHERE status='pending'
  UNION ALL SELECT employee_id, 'OT',        created_at FROM overtime_requests        WHERE status='pending'
  UNION ALL SELECT employee_id, 'ปรับเวลา',  created_at FROM time_adjustment_requests WHERE status='pending'
  UNION ALL SELECT employee_id, 'นอกสถานที่',created_at FROM offsite_checkin_requests  WHERE status='pending'
  UNION ALL SELECT employee_id, 'ลาออก',     created_at FROM resignation_requests      WHERE status='pending_manager'
)
SELECT p.typ AS request_type, e.employee_code, e.first_name_th, e.last_name_th,
       p.created_at::date AS submitted,
       CASE WHEN a.n IS NULL THEN 'ไม่มีหัวหน้าปัจจุบัน' WHEN a.n>1 THEN 'หัวหน้าซ้อน' ELSE 'ปกติ' END AS manager_state
FROM pending p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN act a ON a.employee_id = p.employee_id
WHERE a.n IS NULL OR a.n > 1          -- เฉพาะที่จะ "ไม่ขึ้น" ให้หัวหน้าเห็น
ORDER BY p.created_at;

-- ─────────────────────────────────────────────────────────────────
-- C) แก้ข้อมูล employee_manager_history ให้เหลือ active 1 แถว/คน + ตรง supervisor_id
--    ⚠️ ตรวจผล A/B ให้ชัดก่อนรัน C  ·  ทำใน transaction (ปลอดภัย ย้อนได้ถ้ายังไม่ COMMIT)
-- ─────────────────────────────────────────────────────────────────
BEGIN;

-- C1) ปิดแถว active ที่ "ซ้ำ" — เก็บแถว effective_from ล่าสุดไว้ ปิดที่เหลือ
WITH ranked AS (
  SELECT id, employee_id,
         ROW_NUMBER() OVER (PARTITION BY employee_id
           ORDER BY effective_from DESC NULLS LAST, created_at DESC NULLS LAST) AS rn
  FROM employee_manager_history WHERE effective_to IS NULL
)
UPDATE employee_manager_history h
SET effective_to = CURRENT_DATE
FROM ranked r
WHERE h.id = r.id AND r.rn > 1;

-- C2) คนที่ยังไม่มี active row เลย แต่มี supervisor_id → สร้างแถว active ให้
INSERT INTO employee_manager_history (id, employee_id, manager_id, effective_from)
SELECT gen_random_uuid(), e.id, e.supervisor_id, COALESCE(e.hire_date, CURRENT_DATE)
FROM employees e
WHERE e.is_active = TRUE AND e.supervisor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employee_manager_history h
                  WHERE h.employee_id = e.id AND h.effective_to IS NULL);

-- C3) sync supervisor_id ให้ตรง history active (เผื่อ column ค้างหัวหน้าเก่า)
UPDATE employees e
SET supervisor_id = h.manager_id
FROM employee_manager_history h
WHERE h.employee_id = e.id AND h.effective_to IS NULL
  AND e.supervisor_id IS DISTINCT FROM h.manager_id;

-- ตรวจซ้ำหลังแก้ (ควรว่าง)
-- SELECT employee_id, COUNT(*) FROM employee_manager_history WHERE effective_to IS NULL
--   GROUP BY employee_id HAVING COUNT(*) <> 1;

COMMIT;
-- ถ้าผลไม่โอเค ใช้ ROLLBACK; แทน COMMIT;
