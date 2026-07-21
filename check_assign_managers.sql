-- ════════════════════════════════════════════════════════════════════
-- คนที่ "ไม่มีหัวหน้าปัจจุบัน" (งานค้างไม่ขึ้นให้ใครเห็น)
--   STEP 1  ดูสถานะ + หัวหน้าที่แนะนำ
--   STEP 2  ซ่อมอัตโนมัติ (คนที่มี supervisor_id)
--   STEP 3  ดูคนที่ยังเหลือ (ต้องตั้งหัวหน้าเอง) + วิธีตั้ง
-- ════════════════════════════════════════════════════════════════════

-- ─── STEP 1: สถานะแต่ละคน + หัวหน้าที่แนะนำ (จากเพื่อนแผนกเดียวกัน) ───
WITH no_mgr AS (          -- คนที่ไม่มี active manager
  SELECT e.id, e.employee_code, e.first_name_th, e.last_name_th,
         e.supervisor_id, e.company_id, e.department_id,
         d.name AS dept, c.name_th AS company
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN companies  c ON c.id = e.company_id
  WHERE e.is_active = TRUE
    AND NOT EXISTS (SELECT 1 FROM employee_manager_history h
                    WHERE h.employee_id = e.id AND h.effective_to IS NULL)
),
dept_mgr AS (             -- หัวหน้าที่พบบ่อยสุดของคนในแผนก+บริษัทเดียวกัน (ที่มีหัวหน้าปกติ)
  SELECT e.department_id, e.company_id, h.manager_id,
         COUNT(*) AS n,
         ROW_NUMBER() OVER (PARTITION BY e.department_id, e.company_id ORDER BY COUNT(*) DESC) AS rk
  FROM employees e
  JOIN employee_manager_history h ON h.employee_id = e.id AND h.effective_to IS NULL
  WHERE e.is_active = TRUE
  GROUP BY e.department_id, e.company_id, h.manager_id
)
SELECT n.employee_code, n.first_name_th, n.last_name_th, n.dept, n.company,
       CASE WHEN n.supervisor_id IS NULL THEN '❌ ไม่มี' ELSE '✅ มี' END AS has_supervisor_id,
       sup.employee_code || ' ' || sup.first_name_th || ' ' || sup.last_name_th AS supervisor_name,
       sm.employee_code || ' ' || sm.first_name_th || ' ' || sm.last_name_th AS suggested_manager_from_dept
FROM no_mgr n
LEFT JOIN employees sup ON sup.id = n.supervisor_id
LEFT JOIN dept_mgr dm ON dm.department_id = n.department_id AND dm.company_id = n.company_id AND dm.rk = 1
LEFT JOIN employees sm ON sm.id = dm.manager_id
ORDER BY has_supervisor_id, n.employee_code;

-- ─── STEP 2: ซ่อมอัตโนมัติ — คนที่มี supervisor_id → สร้าง active history ───
--   (ปลอดภัย: เพิ่มเฉพาะคนที่ยังไม่มี active row)
INSERT INTO employee_manager_history (id, employee_id, manager_id, effective_from)
SELECT gen_random_uuid(), e.id, e.supervisor_id, COALESCE(e.hire_date, CURRENT_DATE)
FROM employees e
WHERE e.is_active = TRUE AND e.supervisor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM employee_manager_history h
                  WHERE h.employee_id = e.id AND h.effective_to IS NULL);

-- ─── STEP 3: ดูคนที่ยังเหลือ (ไม่มีทั้ง history และ supervisor_id) — ต้องตั้งหัวหน้าเอง ───
SELECT e.employee_code, e.first_name_th, e.last_name_th, d.name AS dept, c.name_th AS company
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN companies  c ON c.id = e.company_id
WHERE e.is_active = TRUE
  AND NOT EXISTS (SELECT 1 FROM employee_manager_history h
                  WHERE h.employee_id = e.id AND h.effective_to IS NULL)
ORDER BY e.employee_code;

-- ─── ตั้งหัวหน้าให้คนที่เหลือ (แก้ EMP_CODE / MGR_CODE ตามจริง) ───
-- INSERT INTO employee_manager_history (id, employee_id, manager_id, effective_from)
-- SELECT gen_random_uuid(), e.id, m.id, CURRENT_DATE
-- FROM employees e, employees m
-- WHERE e.employee_code = 'EMP_CODE' AND m.employee_code = 'MGR_CODE';
-- UPDATE employees SET supervisor_id = (SELECT id FROM employees WHERE employee_code='MGR_CODE')
--   WHERE employee_code = 'EMP_CODE';
