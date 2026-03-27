-- ═══════════════════════════════════════════════════════════════════
-- แก้อีเมล + สร้างบัญชีล็อกอินให้: วิชัย เขียวไข่กา (68000008)
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_auth_id    uuid := gen_random_uuid();
  v_emp_id     uuid := 'ea90425f-ca79-50fc-b7ac-9a29f649f225';
  v_company_id uuid := 'a684555a-e44d-4441-9af8-521115cd000a';
  v_email      text := 'wichai.k.oat@hotmail.com';
BEGIN

  -- ─── 1. ตรวจสอบว่ายังไม่มี auth user สำหรับ email นี้ ───
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
    RAISE EXCEPTION '❌ มี auth user สำหรับ % อยู่แล้ว', v_email;
  END IF;

  -- ─── 2. ลบ users record เก่า (ถ้ามี) ───
  DELETE FROM users WHERE employee_id = v_emp_id;

  -- ─── 3. อัพเดทอีเมลในตาราง employees ───
  UPDATE employees
  SET email = v_email,
      updated_at = now()
  WHERE id = v_emp_id;
  RAISE NOTICE '✓ อัพเดทอีเมล: Wichai Khieawkhaika → %', v_email;

  -- ─── 4. สร้าง auth user ───
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
    jsonb_build_object('full_name', 'วิชัย เขียวไข่กา'),
    now(), now(),
    '', '', '', ''
  );
  RAISE NOTICE '✓ สร้าง auth user: %', v_email;

  -- ─── 5. สร้าง identity สำหรับ email login ───
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

  -- ─── 6. สร้าง users record (เชื่อม auth ↔ employee) ───
  INSERT INTO users (id, employee_id, company_id, role)
  VALUES (v_auth_id, v_emp_id, v_company_id, 'employee');
  RAISE NOTICE '✓ สร้าง users record (role: employee)';

  -- ─── 7. สร้าง leave_balances ปี 2026 (ถ้ายังไม่มี) ───
  INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days, carried_over, remaining_days)
  SELECT gen_random_uuid(), v_emp_id, lt.id, 2026,
         COALESCE(lt.days_per_year, 0), 0, 0, 0, COALESCE(lt.days_per_year, 0)
  FROM leave_types lt
  WHERE lt.company_id = v_company_id AND lt.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM leave_balances lb
      WHERE lb.employee_id = v_emp_id AND lb.leave_type_id = lt.id AND lb.year = 2026
    );
  RAISE NOTICE '✓ เช็ค leave_balances ปี 2026';

  -- ─── สรุป ───
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ สำเร็จ!';
  RAISE NOTICE '   พนักงาน: 68000008 วิชัย เขียวไข่กา (โอ๊ต)';
  RAISE NOTICE '   อีเมลใหม่: %', v_email;
  RAISE NOTICE '   รหัสผ่าน: GoodHR2026!';
  RAISE NOTICE '══════════════════════════════════════';

END $$;
