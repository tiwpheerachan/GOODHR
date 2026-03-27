-- ═══════════════════════════════════════════════════════════════════
-- สร้างบัญชีล็อกอินให้พนักงาน: ศิราม ทับทองคำ (69000039)
-- พนักงานมีอยู่แล้ว — เพิ่มเฉพาะ auth user + users record + อัพเดทอีเมล
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_auth_id    uuid := gen_random_uuid();
  v_emp_id     uuid := '25a33616-f1df-53c2-ab39-7f72e7be05e4';
  v_company_id uuid := 'a24d6342-8720-42c7-bb8a-5932169274bf';
  v_email      text := 'toystorie85@gmail.com';
BEGIN

  -- ─── 1. ตรวจสอบว่ายังไม่มี auth user สำหรับ email นี้ ───
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION '❌ มี auth user สำหรับ % อยู่แล้ว — ไม่ต้องสร้างซ้ำ', v_email;
  END IF;

  -- ─── 2. ตรวจสอบว่ายังไม่มี users record สำหรับพนักงานนี้ ───
  IF EXISTS (SELECT 1 FROM users WHERE employee_id = v_emp_id) THEN
    RAISE EXCEPTION '❌ มี users record สำหรับ employee_id % อยู่แล้ว', v_emp_id;
  END IF;

  -- ─── 3. สร้าง auth user ───
  INSERT INTO auth.users (
    id, instance_id,
    email, encrypted_password,
    aud, role,
    email_confirmed_at,
    raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token,
    email_change_token_new, email_change
  ) VALUES (
    v_auth_id,
    '00000000-0000-0000-0000-000000000000',
    v_email,
    crypt('GoodHR2026!', gen_salt('bf')),
    'authenticated', 'authenticated',
    now(),
    jsonb_build_object('full_name', 'ศิราม ทับทองคำ'),
    now(), now(),
    '', '', '', ''
  );
  RAISE NOTICE '✓ สร้าง auth user: % (รหัสผ่าน: GoodHR2026!)', v_email;

  -- ─── 4. สร้าง identity สำหรับ email login ───
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data, last_sign_in_at,
    created_at, updated_at
  ) VALUES (
    v_auth_id, v_auth_id, v_email, 'email',
    jsonb_build_object(
      'sub', v_auth_id::text,
      'email', v_email,
      'email_verified', true,
      'provider', 'email'
    ),
    now(), now(), now()
  );
  RAISE NOTICE '✓ สร้าง identity สำหรับ email login';

  -- ─── 5. สร้าง users record (เชื่อม auth ↔ employee) ───
  INSERT INTO users (id, employee_id, company_id, role)
  VALUES (v_auth_id, v_emp_id, v_company_id, 'employee');
  RAISE NOTICE '✓ สร้าง users record (role: employee)';

  -- ─── 6. อัพเดทอีเมลในตาราง employees ───
  UPDATE employees
  SET email = v_email,
      first_name_en = 'Siram',
      last_name_en = 'Thubthongkum',
      nickname = 'ทอย',
      phone = '0956784028',
      updated_at = now()
  WHERE id = v_emp_id;
  RAISE NOTICE '✓ อัพเดทอีเมล + ข้อมูลที่ขาดในตาราง employees';

  -- ─── สรุป ───
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ สร้างบัญชีล็อกอินสำเร็จ!';
  RAISE NOTICE '   พนักงาน: 69000039 ศิราม ทับทองคำ';
  RAISE NOTICE '   อีเมล: %', v_email;
  RAISE NOTICE '   รหัสผ่าน: GoodHR2026!';
  RAISE NOTICE '══════════════════════════════════════';

END $$;
