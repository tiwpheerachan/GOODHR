-- ═══════════════════════════════════════════════════════════════════
-- เพิ่มพนักงาน: ศิราม ทับทองคำ (69000039)
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_auth_id      uuid := gen_random_uuid();
  v_emp_id       uuid := gen_random_uuid();
  v_company_id   uuid;
  v_position_id  uuid;
  v_department_id uuid;
  v_branch_id    uuid;
  v_supervisor_id uuid;
  v_lt           RECORD;
BEGIN

  -- ─── 1. หาผู้อนุมัติ (คุณชัชวาลย์ เสริมสุขประเสริฐ) เพื่อหา company_id ───
  SELECT id, company_id INTO v_supervisor_id, v_company_id
  FROM employees
  WHERE first_name_th ILIKE '%ชัชวาลย์%'
    AND last_name_th  ILIKE '%เสริมสุขประเสริฐ%'
    AND is_active = true
  LIMIT 1;

  IF v_supervisor_id IS NULL THEN
    RAISE EXCEPTION '❌ ไม่พบผู้อนุมัติ: ชัชวาลย์ เสริมสุขประเสริฐ — กรุณาตรวจสอบชื่อ';
  END IF;

  RAISE NOTICE '✓ พบผู้อนุมัติ: ชัชวาลย์ เสริมสุขประเสริฐ (company_id: %)', v_company_id;

  -- ─── 2. หาหรือสร้าง department: PC Sale offline ───
  SELECT id INTO v_department_id
  FROM departments
  WHERE company_id = v_company_id
    AND name ILIKE '%PC Sale offline%'
  LIMIT 1;

  IF v_department_id IS NULL THEN
    v_department_id := gen_random_uuid();
    INSERT INTO departments (id, company_id, name, code, is_active)
    VALUES (v_department_id, v_company_id, 'PC Sale offline', 'PC_SALE_OFFLINE', true);
    RAISE NOTICE '  + สร้างแผนกใหม่: PC Sale offline';
  ELSE
    RAISE NOTICE '  ✓ พบแผนก: PC Sale offline';
  END IF;

  -- ─── 3. หาหรือสร้าง position: PC Terminal 21 Pattaya ───
  SELECT id INTO v_position_id
  FROM positions
  WHERE company_id = v_company_id
    AND name ILIKE '%PC Terminal 21 Pattaya%'
  LIMIT 1;

  IF v_position_id IS NULL THEN
    v_position_id := gen_random_uuid();
    INSERT INTO positions (id, company_id, name, code, is_flex_time, is_active)
    VALUES (v_position_id, v_company_id, 'PC Terminal 21 Pattaya', 'PC_T21_PATTAYA', false, true);
    RAISE NOTICE '  + สร้างตำแหน่งใหม่: PC Terminal 21 Pattaya';
  ELSE
    RAISE NOTICE '  ✓ พบตำแหน่ง: PC Terminal 21 Pattaya';
  END IF;

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
    'toystorie85@gmail.com',
    crypt('GoodHR2026!', gen_salt('bf')),
    'authenticated', 'authenticated',
    now(),
    jsonb_build_object('full_name', 'ศิราม ทับทองคำ'),
    now(), now(),
    '', '', '', ''
  );
  RAISE NOTICE '✓ สร้าง auth user: toystorie85@gmail.com (รหัสผ่าน: GoodHR2026!)';

  -- ─── 5. สร้าง identity สำหรับ email login ───
  INSERT INTO auth.identities (
    id, user_id, provider_id, provider,
    identity_data, last_sign_in_at,
    created_at, updated_at
  ) VALUES (
    v_auth_id, v_auth_id, 'toystorie85@gmail.com', 'email',
    jsonb_build_object(
      'sub', v_auth_id::text,
      'email', 'toystorie85@gmail.com',
      'email_verified', true,
      'provider', 'email'
    ),
    now(), now(), now()
  );

  -- ─── 6. สร้าง employee record ───
  INSERT INTO employees (
    id, company_id, department_id, position_id, branch_id,
    employee_code,
    first_name_th, last_name_th,
    first_name_en, last_name_en,
    nickname, phone, email,
    national_id,
    supervisor_id,
    hire_date, probation_end_date,
    employment_type, employment_status,
    is_active
  ) VALUES (
    v_emp_id, v_company_id, v_department_id, v_position_id, NULL,
    '69000039',
    'ศิราม', 'ทับทองคำ',
    'Siram', 'Thubthongkum',
    'ทอย', '0956784028', 'toystorie85@gmail.com',
    '3349900795212',
    v_supervisor_id,
    '2026-03-02', '2026-06-29',
    'full_time', 'active',
    true
  );
  RAISE NOTICE '✓ สร้าง employee: 69000039 ศิราม ทับทองคำ (ทอย)';

  -- ─── 7. สร้าง users record (เชื่อม auth ↔ employee) ───
  INSERT INTO users (id, employee_id, company_id, role)
  VALUES (v_auth_id, v_emp_id, v_company_id, 'employee');
  RAISE NOTICE '✓ สร้าง users record (role: employee)';

  -- ─── 8. บันทึกประวัติผู้อนุมัติ ───
  INSERT INTO employee_manager_history (
    employee_id, manager_id, effective_from, created_by
  ) VALUES (
    v_emp_id, v_supervisor_id, '2026-03-02', NULL
  );
  RAISE NOTICE '✓ บันทึกผู้อนุมัติ: ชัชวาลย์ เสริมสุขประเสริฐ';

  -- ─── 9. สร้าง leave_balances ปี 2026 ───
  FOR v_lt IN
    SELECT id, days_per_year, name
    FROM leave_types
    WHERE company_id = v_company_id AND is_active = true
  LOOP
    INSERT INTO leave_balances (
      id, employee_id, leave_type_id, year,
      entitled_days, used_days, pending_days, carried_over, remaining_days
    ) VALUES (
      gen_random_uuid(), v_emp_id, v_lt.id, 2026,
      COALESCE(v_lt.days_per_year, 0), 0, 0, 0, COALESCE(v_lt.days_per_year, 0)
    );
  END LOOP;
  RAISE NOTICE '✓ สร้าง leave_balances ปี 2026 ครบทุกประเภท';

  -- ─── สรุป ───
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ เพิ่มพนักงานสำเร็จ!';
  RAISE NOTICE '   รหัส: 69000039';
  RAISE NOTICE '   ชื่อ: ศิราม ทับทองคำ (ทอย)';
  RAISE NOTICE '   อีเมล: toystorie85@gmail.com';
  RAISE NOTICE '   รหัสผ่าน: GoodHR2026!';
  RAISE NOTICE '   ผู้อนุมัติ: ชัชวาลย์ เสริมสุขประเสริฐ';
  RAISE NOTICE '══════════════════════════════════════';

END $$;
