-- ════════════════════════════════════════════════════════════════════
-- ตรวจสอบสถานะบัญชีล็อกอินของพนักงาน
--
-- ใช้สำหรับ: เปลี่ยนอีเมลไม่ได้ บอก "ไม่พบ user"
-- ════════════════════════════════════════════════════════════════════

-- ─── เปลี่ยน employee_code ตรงนี้ ───
-- (default: 64000075 = CHEN JINBIAO)

-- ═══ 1) ดูข้อมูลพนักงาน + users row + auth ═══
SELECT
  e.id                AS employee_id,
  e.employee_code,
  e.first_name_th, e.last_name_th,
  e.email             AS employee_email,
  u.id                AS users_row_id,
  u.role,
  u.is_active         AS users_is_active,
  u.company_id        AS users_company_id,
  CASE
    WHEN u.id IS NULL THEN '❌ ไม่มี users row — ต้องสร้างบัญชีใหม่'
    ELSE '✅ มี users row'
  END AS users_status
FROM employees e
LEFT JOIN users u ON u.employee_id = e.id
WHERE e.employee_code = '64000075';

-- ═══ 2) ค้นหาใน auth.users (Supabase Auth) ด้วย email หรือ metadata ═══
-- (ดูว่า auth user มีอยู่หรือไม่ — ถ้ามี เราเชื่อม users row ได้ ไม่ต้องสร้างใหม่)
SELECT
  au.id                              AS auth_id,
  au.email                           AS auth_email,
  au.email_confirmed_at,
  au.raw_user_meta_data              AS metadata,
  au.created_at,
  CASE
    WHEN lower(au.email) = 'lina@shd-company.com' THEN '⚠️ มี auth ด้วย email เก่า — change-email จะใช้ได้'
    WHEN lower(au.email) = 'jinbiao.c@shd-technology.co.th' THEN '✅ มี auth ด้วย email ใหม่แล้ว'
    ELSE 'ℹ️ มี auth ด้วย email อื่น'
  END AS note
FROM auth.users au
WHERE lower(au.email) IN ('lina@shd-company.com', 'jinbiao.c@shd-technology.co.th')
   OR (au.raw_user_meta_data ->> 'employee_id') IN (
     SELECT id::text FROM employees WHERE employee_code = '64000075'
   );

-- ═══ 3) ถ้าผลข้อ 1 ว่า "ไม่มี users row" และข้อ 2 ว่า "ไม่มี auth" ═══
--      → ต้องสร้างบัญชีใหม่ผ่าน UI:
--        /admin/employees/64000075 → แท็บ "บทบาท" → form "สร้างบัญชีล็อกอิน"
--        กรอก email = jinbiao.c@shd-technology.co.th + รหัสผ่าน + role
--
-- ═══ ถ้าข้อ 2 มี auth แต่ข้อ 1 ไม่มี users row → เชื่อม users row ก่อน ═══
-- INSERT INTO users (id, employee_id, company_id, role, is_active)
-- SELECT
--   au.id,
--   e.id,
--   e.company_id,
--   'employee',
--   true
-- FROM auth.users au
-- CROSS JOIN employees e
-- WHERE au.email = 'lina@shd-company.com'  -- email ที่มี auth อยู่จริง
--   AND e.employee_code = '64000075'
-- ON CONFLICT (id) DO NOTHING;
--
-- (หลังเชื่อมแล้ว → กลับไปที่หน้า /admin/employees/[id] → แก้ email ได้)

-- ════════════════════════════════════════════════════════════════════
