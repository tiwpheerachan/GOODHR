-- ============================================================
-- GOODHR: ตรวจสอบข้อมูลซ้ำ (READ-ONLY - ปลอดภัย ไม่แก้ไขอะไร)
-- วิธีใช้: รัน SQL นี้ใน Supabase SQL Editor
-- ============================================================

-- ============================================================
-- QUERY 1: นับสรุปทั้งหมด
-- ============================================================
SELECT
  (SELECT COUNT(*) FROM employees WHERE is_active = true AND deleted_at IS NULL) as "พนักงาน_active",
  (SELECT COUNT(*) FROM employees) as "พนักงาน_ทั้งหมด",
  (SELECT COUNT(*) FROM salary_structures WHERE effective_to IS NULL) as "salary_active",
  (SELECT COUNT(*) FROM salary_structures) as "salary_ทั้งหมด";

-- ============================================================
-- QUERY 2: หา employee_code ซ้ำ (คนเดียวกัน แต่มีหลาย record)
-- นี่คือ KEY QUERY - ถ้าเจอ = มีปัญหาแน่นอน
-- ============================================================
SELECT
  employee_code,
  COUNT(*) as "จำนวน_records",
  array_agg(id::text) as "all_ids",
  array_agg(first_name_th || ' ' || last_name_th) as "ชื่อ",
  array_agg(is_active::text) as "active_status",
  array_agg(created_at::text) as "วันที่สร้าง"
FROM employees
GROUP BY employee_code
HAVING COUNT(*) > 1
ORDER BY employee_code;

-- ============================================================
-- QUERY 3: salary_structures ที่ active ซ้ำ (1 คนมีมากกว่า 1 record)
-- ============================================================
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th as "ชื่อ",
  COUNT(s.id) as "จำนวน_salary",
  array_agg(s.base_salary) as "เงินเดือน",
  array_agg(s.effective_from::text) as "effective_from",
  array_agg(s.id::text) as "salary_ids"
FROM salary_structures s
JOIN employees e ON e.id = s.employee_id
WHERE s.effective_to IS NULL
GROUP BY e.employee_code, e.first_name_th, e.last_name_th
HAVING COUNT(s.id) > 1
ORDER BY e.employee_code;

-- ============================================================
-- QUERY 4: หาพนักงานที่มี employee_code ซ้ำ
--          พร้อมดูว่าแต่ละ record มี related data อะไรบ้าง
--          (ช่วยตัดสินใจว่า record ไหนเป็นของจริง)
-- ============================================================
SELECT
  e.id,
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th as "ชื่อ",
  e.is_active,
  e.created_at,
  e.updated_at,
  (SELECT COUNT(*) FROM attendance_records a WHERE a.employee_id = e.id) as "attendance",
  (SELECT COUNT(*) FROM leave_requests l WHERE l.employee_id = e.id) as "leave",
  (SELECT COUNT(*) FROM payroll_records p WHERE p.employee_id = e.id) as "payroll",
  (SELECT COUNT(*) FROM salary_structures s WHERE s.employee_id = e.id) as "salary",
  (SELECT COUNT(*) FROM monthly_shift_assignments m WHERE m.employee_id = e.id) as "shifts",
  (SELECT COUNT(*) FROM users u WHERE u.employee_id = e.id) as "user_login"
FROM employees e
WHERE e.employee_code IN (
  SELECT employee_code FROM employees
  GROUP BY employee_code HAVING COUNT(*) > 1
)
ORDER BY e.employee_code, e.created_at;

-- ============================================================
-- QUERY 5: salary_structures ที่ employee_id ไม่มีใน employees
-- (orphaned records - ข้อมูลเงินเดือนที่เจ้าของถูกลบไปแล้ว)
-- ============================================================
SELECT s.id, s.employee_id, s.base_salary, s.effective_from
FROM salary_structures s
LEFT JOIN employees e ON e.id = s.employee_id
WHERE e.id IS NULL;
