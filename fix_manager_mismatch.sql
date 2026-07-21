-- ════════════════════════════════════════════════════════════════════
-- เคส: history active ≠ employees.supervisor_id (หัวหน้าไม่ตรงกัน)
--   → หน้า approvals (ใช้ history) โชว์ให้ "หัวหน้าเก่า"/ไม่มีใคร
--     ส่วนหัวหน้าจริง (supervisor_id) ไม่เห็น
--   วิธีแก้: sync history active ให้ตรง supervisor_id (แหล่งที่ HR ตั้งล่าสุด)
-- ════════════════════════════════════════════════════════════════════

-- ─── STEP 0: ตรวจเฉพาะราย (ปริบุญญา 66000110) ───
SELECT e.employee_code, e.first_name_th, e.last_name_th,
       sup.employee_code || ' ' || sup.first_name_th AS supervisor_id_คือ,
       hm.employee_code  || ' ' || hm.first_name_th  AS history_active_คือ
FROM employees e
LEFT JOIN employees sup ON sup.id = e.supervisor_id
LEFT JOIN employee_manager_history h ON h.employee_id = e.id AND h.effective_to IS NULL
LEFT JOIN employees hm ON hm.id = h.manager_id
WHERE e.employee_code = '66000110';

-- ─── STEP 1: หา "ทุกคน" ที่ history active ≠ supervisor_id (mismatch) ───
--   คนกลุ่มนี้ = หัวหน้าจริงไม่เห็นงาน (โดยเฉพาะที่มีคำขอค้าง)
SELECT e.employee_code, e.first_name_th, e.last_name_th, d.name AS dept,
       sup.first_name_th AS supervisor_id_name,
       hm.first_name_th  AS history_name
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN employees sup ON sup.id = e.supervisor_id
JOIN employee_manager_history h ON h.employee_id = e.id AND h.effective_to IS NULL
LEFT JOIN employees hm ON hm.id = h.manager_id
WHERE e.is_active = TRUE
  AND e.supervisor_id IS NOT NULL
  AND e.supervisor_id IS DISTINCT FROM h.manager_id
ORDER BY e.employee_code;

-- ─── STEP 2: ซ่อม — ปิด history active เก่า + เปิดใหม่ให้ตรง supervisor_id ───
--   ⚠️ ตรวจผล STEP 1 ให้ชัดว่า supervisor_id ถูกจริงก่อนรัน  ·  reversible (BEGIN/COMMIT)
BEGIN;

-- 2a) ปิดแถว active ที่ไม่ตรง supervisor_id
UPDATE employee_manager_history h
SET effective_to = CURRENT_DATE
FROM employees e
WHERE h.employee_id = e.id AND h.effective_to IS NULL
  AND e.is_active = TRUE AND e.supervisor_id IS NOT NULL
  AND e.supervisor_id IS DISTINCT FROM h.manager_id;

-- 2b) เปิดแถวใหม่ให้ตรง supervisor_id (เฉพาะคนที่ตอนนี้ไม่มี active แล้ว)
INSERT INTO employee_manager_history (id, employee_id, manager_id, effective_from)
SELECT gen_random_uuid(), e.id, e.supervisor_id, CURRENT_DATE
FROM employees e
WHERE e.is_active = TRUE AND e.supervisor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employee_manager_history h
                  WHERE h.employee_id = e.id AND h.effective_to IS NULL);

-- 2c) โยน snapshot คำขอลาออกที่ค้าง ไปหัวหน้าใหม่ = supervisor_id
--   (มีเฉพาะ resignation_requests เท่านั้นที่มีคอลัมน์ manager_id
--    ส่วน ลา/OT/ปรับเวลา/นอกสถานที่ route ตามทีม dynamic → ย้ายเองเมื่อ history ตรง)
UPDATE resignation_requests rr SET manager_id = e.supervisor_id
FROM employees e WHERE rr.employee_id = e.id AND rr.status = 'pending_manager' AND e.supervisor_id IS NOT NULL;

-- ตรวจซ้ำ (ควรว่าง = ไม่มี mismatch แล้ว)
-- SELECT e.employee_code FROM employees e
--   JOIN employee_manager_history h ON h.employee_id=e.id AND h.effective_to IS NULL
--   WHERE e.supervisor_id IS DISTINCT FROM h.manager_id;

COMMIT;   -- ถ้าผลไม่โอเค ใช้ ROLLBACK;
