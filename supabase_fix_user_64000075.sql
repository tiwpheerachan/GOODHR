-- ════════════════════════════════════════════════════════════════════
-- Fix: ล้าง orphan users row ของ CHEN JINBIAO (64000075)
--
-- ปัญหา:
--   - users.id = de0d1c12-...  (linked to employee_id ของ CHEN JINBIAO)
--   - auth.users ที่มี id นี้ → "ไม่มี" (User not found)
--   - email lina@shd-company.com → ชี้ไปคนอื่น (employee_id ca2dc357...)
--
-- วิธีแก้:
--   1) ดูว่า ca2dc357... เป็นใคร (เจ้าของ lina ตัวจริง)
--   2) ลบ orphan users row ของ CHEN JINBIAO
--   3) เคลียร์ employees.email ของ CHEN JINBIAO (ไว้ใช้ email ใหม่)
--   4) ไปสร้างบัญชีใหม่ผ่าน UI: /admin/employees/64000075 → แท็บ "บทบาท"
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) ดูว่าเจ้าของจริงของ lina@shd-company.com เป็นใคร ═══
SELECT
  'ใคร owns lina@shd-company.com?' AS check,
  e.id, e.employee_code, e.first_name_th, e.last_name_th,
  e.email AS employee_email,
  u.id    AS users_id, u.role,
  CASE WHEN u.id IS NULL THEN '❌ ไม่มี users row' ELSE '✅ มี users row' END AS users_status
FROM employees e
LEFT JOIN users u ON u.employee_id = e.id
WHERE e.id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff';

-- ═══ 2) Preview: orphan users row ของ CHEN JINBIAO ═══
SELECT
  'orphan users row ของ CHEN JINBIAO' AS check,
  u.id, u.employee_id, u.role,
  e.employee_code, e.first_name_th, e.last_name_th,
  CASE WHEN au.id IS NULL THEN '❌ orphan — auth user หาย' ELSE 'ok' END AS auth_status
FROM users u
LEFT JOIN employees e ON e.id = u.employee_id
LEFT JOIN auth.users au ON au.id = u.id
WHERE u.employee_id = (SELECT id FROM employees WHERE employee_code = '64000075');

-- ═══ 3) ลบ orphan users row ของ CHEN JINBIAO ═══
-- ⚠️ รันหลังจาก preview แล้วเท่านั้น
-- ⚠️ ใช้ alias เพื่อกัน ambiguity ระหว่าง public.users กับ auth.users
DELETE FROM public.users AS pu
WHERE pu.id = 'de0d1c12-2f42-4f07-b598-40a28a18f18e'
  AND pu.employee_id = (SELECT id FROM employees WHERE employee_code = '64000075')
  AND NOT EXISTS (SELECT 1 FROM auth.users au WHERE au.id = pu.id);

-- ═══ 4) เคลียร์ employees.email ของ CHEN JINBIAO (ป้องกัน conflict กับเจ้าของ lina จริง) ═══
UPDATE employees
SET email = NULL,
    updated_at = now()
WHERE employee_code = '64000075';

-- ═══ 5) Verify หลัง clean ═══
SELECT
  e.employee_code, e.first_name_th, e.last_name_th, e.email,
  u.id AS users_id,
  CASE
    WHEN u.id IS NULL THEN '✅ พร้อมสร้างบัญชีใหม่ผ่าน UI แท็บ "บทบาท"'
    ELSE '❌ ยังมี users row — ต้องตรวจสอบ'
  END AS status
FROM employees e
LEFT JOIN users u ON u.employee_id = e.id
WHERE e.employee_code = '64000075';

-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรันแล้ว:
--   ไปที่ /admin/employees/<id ของ CHEN JINBIAO> → แท็บ "บทบาท"
--   จะเห็น banner "พนักงานนี้ยังไม่มีบัญชีล็อกอิน" + form สร้างบัญชี
--   กรอก:
--     - อีเมล: jinbiao.c@shd-technology.co.th
--     - รหัสผ่าน: <กำหนดเอง>
--     - บทบาท: manager (ของเดิม) หรือเลือกใหม่
--   กด "สร้างบัญชีล็อกอิน"
-- ════════════════════════════════════════════════════════════════════
