-- ═══════════════════════════════════════════════════════════════════
-- GOODHR: SQL สร้างพนักงานใหม่ครบจบ (Auth + Employee + Users + Salary + Leave)
-- ═══════════════════════════════════════════════════════════════════
-- วิธีใช้:
--   1. เปิด Supabase Dashboard → SQL Editor
--   2. แก้ไขข้อมูลในส่วน "ตั้งค่าข้อมูลพนักงาน" ด้านล่าง
--   3. กด Run
--   4. ระบบจะสร้าง: Auth Account → Employee → Users → Salary → Leave Balances
--
-- หมายเหตุ:
--   - รหัสผ่านจะถูก hash อัตโนมัติโดย Supabase
--   - ถ้ามีข้อผิดพลาดจะ ROLLBACK ทั้งหมดไม่มีข้อมูลค้าง
--   - สามารถ copy ไป run ซ้ำได้เลย แค่เปลี่ยนข้อมูล
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ════════════════════════════════════════════════════
  -- ★ ตั้งค่าข้อมูลพนักงาน (แก้ตรงนี้) ★
  -- ════════════════════════════════════════════════════

  -- ── 1. ข้อมูลล็อกอิน ──
  v_email           TEXT := 'example@gmail.com';          -- อีเมลล็อกอิน
  v_password        TEXT := 'P@ssw0rd123';                -- รหัสผ่าน (อย่างน้อย 6 ตัว)
  v_role            TEXT := 'employee';                   -- role: employee | manager | hr_admin | super_admin

  -- ── 2. ข้อมูลส่วนตัว ──
  v_employee_code   TEXT := '68000XXX';                   -- รหัสพนักงาน (ห้ามซ้ำ)
  v_first_name_th   TEXT := 'ชื่อ';                        -- ชื่อ (ไทย)
  v_last_name_th    TEXT := 'นามสกุล';                     -- นามสกุล (ไทย)
  v_first_name_en   TEXT := 'FirstName';                  -- ชื่อ (อังกฤษ) หรือ NULL
  v_last_name_en    TEXT := 'LastName';                   -- นามสกุล (อังกฤษ) หรือ NULL
  v_nickname        TEXT := 'ชื่อเล่น';                    -- ชื่อเล่น หรือ NULL
  v_phone           TEXT := '08XXXXXXXX';                 -- เบอร์โทร หรือ NULL
  v_national_id     TEXT := NULL;                         -- เลขบัตรประชาชน หรือ NULL
  v_gender          TEXT := NULL;                         -- male | female | other | NULL
  v_birth_date      DATE := NULL;                         -- วันเกิด เช่น '1990-05-15' หรือ NULL
  v_address         TEXT := NULL;                         -- ที่อยู่ หรือ NULL

  -- ── 3. ข้อมูลการเงิน ──
  v_bank_name       TEXT := NULL;                         -- ชื่อธนาคาร เช่น 'กสิกรไทย' หรือ NULL
  v_bank_account    TEXT := NULL;                         -- เลขบัญชี หรือ NULL
  v_tax_id          TEXT := NULL;                         -- เลข Tax ID หรือ NULL
  v_social_security TEXT := NULL;                         -- เลขประกันสังคม หรือ NULL

  -- ── 4. ข้อมูลงาน ──
  v_company_code    TEXT := 'SHD';                        -- รหัสบริษัท (SHD, TOP1, ICS ฯลฯ)
  v_department_name TEXT := 'ฝ่ายขาย';                    -- ชื่อแผนก (ต้องมีอยู่แล้วในระบบ)
  v_position_name   TEXT := 'Product Consultant (PC)';    -- ชื่อตำแหน่ง (ต้องมีอยู่แล้วในระบบ)
  v_branch_name     TEXT := NULL;                         -- ชื่อสาขา หรือ NULL (ถ้ายังไม่กำหนด)
  v_hire_date       DATE := CURRENT_DATE;                 -- วันเริ่มงาน
  v_probation_end   DATE := NULL;                         -- วันครบทดลองงาน หรือ NULL
  v_emp_type        TEXT := 'full_time';                  -- full_time | part_time | contract
  v_emp_status      TEXT := 'active';                     -- active | probation | resigned
  v_supervisor_code TEXT := NULL;                         -- รหัสหัวหน้า เช่น '68000001' หรือ NULL

  -- ── 5. เงินเดือน (ใส่ 0 หรือ NULL ถ้าไม่มี) ──
  v_base_salary     NUMERIC := 0;                         -- เงินเดือนพื้นฐาน
  v_allow_position  NUMERIC := 0;                         -- เบี้ยตำแหน่ง
  v_allow_transport NUMERIC := 0;                         -- ค่าเดินทาง
  v_allow_food      NUMERIC := 0;                         -- ค่าอาหาร
  v_allow_phone     NUMERIC := 0;                         -- ค่าโทรศัพท์
  v_allow_housing   NUMERIC := 0;                         -- ค่าที่พัก

  -- ── 6. สถานที่เช็คอิน (ชื่อสาขา, ใส่ NULL ถ้ายังไม่กำหนด) ──
  v_checkin_branch1 TEXT := NULL;                         -- สาขาเช็คอินที่ 1 เช่น 'ICS Mall'
  v_checkin_branch2 TEXT := NULL;                         -- สาขาเช็คอินที่ 2 หรือ NULL

  -- ════════════════════════════════════════════════════
  -- ★ ห้ามแก้ไขด้านล่างนี้ ★
  -- ════════════════════════════════════════════════════
  v_auth_id         UUID;
  v_emp_id          UUID;
  v_company_id      UUID;
  v_department_id   UUID;
  v_position_id     UUID;
  v_branch_id       UUID;
  v_supervisor_id   UUID;
  v_checkin_bid1    UUID;
  v_checkin_bid2    UUID;
  v_year            INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;

BEGIN

  -- ═══════════════════════════════════════
  -- STEP 0: หา ID จากชื่อ
  -- ═══════════════════════════════════════

  -- หา company_id
  SELECT id INTO v_company_id FROM companies WHERE code = v_company_code AND is_active = true LIMIT 1;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบบริษัท code = %', v_company_code;
  END IF;

  -- หา department_id
  IF v_department_name IS NOT NULL THEN
    SELECT id INTO v_department_id FROM departments WHERE name = v_department_name AND company_id = v_company_id LIMIT 1;
    IF v_department_id IS NULL THEN
      RAISE EXCEPTION 'ไม่พบแผนก "%" ในบริษัท %', v_department_name, v_company_code;
    END IF;
  END IF;

  -- หา position_id
  IF v_position_name IS NOT NULL THEN
    SELECT id INTO v_position_id FROM positions WHERE name = v_position_name AND company_id = v_company_id LIMIT 1;
    IF v_position_id IS NULL THEN
      RAISE EXCEPTION 'ไม่พบตำแหน่ง "%" ในบริษัท %', v_position_name, v_company_code;
    END IF;
  END IF;

  -- หา branch_id
  IF v_branch_name IS NOT NULL THEN
    SELECT id INTO v_branch_id FROM branches WHERE name = v_branch_name AND company_id = v_company_id LIMIT 1;
  END IF;

  -- หา supervisor_id
  IF v_supervisor_code IS NOT NULL THEN
    SELECT id INTO v_supervisor_id FROM employees WHERE employee_code = v_supervisor_code LIMIT 1;
    IF v_supervisor_id IS NULL THEN
      RAISE EXCEPTION 'ไม่พบหัวหน้ารหัส %', v_supervisor_code;
    END IF;
  END IF;

  -- หา checkin branch IDs
  IF v_checkin_branch1 IS NOT NULL THEN
    SELECT id INTO v_checkin_bid1 FROM branches WHERE name = v_checkin_branch1 AND company_id = v_company_id LIMIT 1;
  END IF;
  IF v_checkin_branch2 IS NOT NULL THEN
    SELECT id INTO v_checkin_bid2 FROM branches WHERE name = v_checkin_branch2 AND company_id = v_company_id LIMIT 1;
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 1: สร้าง Auth Account
  -- ═══════════════════════════════════════
  v_auth_id := gen_random_uuid();

  INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    v_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    LOWER(TRIM(v_email)),
    crypt(v_password, gen_salt('bf')),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object(
      'full_name', v_first_name_th || ' ' || v_last_name_th,
      'employee_code', v_employee_code,
      'nickname', COALESCE(v_nickname, '')
    ),
    NOW(),
    NOW(),
    '',
    ''
  );

  -- สร้าง identity สำหรับ email provider
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    v_auth_id,
    v_auth_id,
    LOWER(TRIM(v_email)),
    'email',
    jsonb_build_object('sub', v_auth_id::text, 'email', LOWER(TRIM(v_email))),
    NOW(),
    NOW(),
    NOW()
  );

  RAISE NOTICE '✅ STEP 1: สร้าง Auth Account สำเร็จ (id: %)', v_auth_id;

  -- ═══════════════════════════════════════
  -- STEP 2: สร้าง Employee Record
  -- ═══════════════════════════════════════
  INSERT INTO employees (
    company_id, branch_id, department_id, position_id,
    employee_code, first_name_th, last_name_th,
    first_name_en, last_name_en, nickname,
    email, phone, address,
    national_id, gender, birth_date,
    bank_name, bank_account, tax_id, social_security_no,
    hire_date, probation_end_date,
    employment_type, employment_status,
    supervisor_id, is_active
  ) VALUES (
    v_company_id, v_branch_id, v_department_id, v_position_id,
    v_employee_code, v_first_name_th, v_last_name_th,
    NULLIF(v_first_name_en, ''), NULLIF(v_last_name_en, ''), NULLIF(v_nickname, ''),
    LOWER(TRIM(v_email)), NULLIF(v_phone, ''), NULLIF(v_address, ''),
    NULLIF(v_national_id, ''), NULLIF(v_gender, ''), v_birth_date,
    NULLIF(v_bank_name, ''), NULLIF(v_bank_account, ''), NULLIF(v_tax_id, ''), NULLIF(v_social_security, ''),
    v_hire_date, v_probation_end,
    v_emp_type, v_emp_status,
    v_supervisor_id, true
  ) RETURNING id INTO v_emp_id;

  RAISE NOTICE '✅ STEP 2: สร้าง Employee สำเร็จ (id: %)', v_emp_id;

  -- ═══════════════════════════════════════
  -- STEP 3: สร้าง Users Record (เชื่อม Auth ↔ Employee)
  -- ═══════════════════════════════════════
  INSERT INTO users (id, employee_id, company_id, role, email, is_active)
  VALUES (v_auth_id, v_emp_id, v_company_id, v_role, LOWER(TRIM(v_email)), true);

  RAISE NOTICE '✅ STEP 3: สร้าง Users record สำเร็จ (เชื่อม auth → employee)';

  -- ═══════════════════════════════════════
  -- STEP 4: สร้าง Salary Structure
  -- ═══════════════════════════════════════
  IF v_base_salary > 0 THEN
    INSERT INTO salary_structures (
      employee_id, base_salary,
      allowance_position, allowance_transport,
      allowance_food, allowance_phone, allowance_housing,
      ot_rate_normal, ot_rate_holiday,
      effective_from
    ) VALUES (
      v_emp_id, v_base_salary,
      v_allow_position, v_allow_transport,
      v_allow_food, v_allow_phone, v_allow_housing,
      1.5, 3.0,
      v_hire_date
    );
    RAISE NOTICE '✅ STEP 4: สร้าง Salary Structure สำเร็จ (ฐาน: ฿%)', v_base_salary;
  ELSE
    RAISE NOTICE '⏭️  STEP 4: ข้ามเงินเดือน (base_salary = 0)';
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 5: สร้าง Leave Balances (จาก leave_types ของบริษัท)
  -- ═══════════════════════════════════════
  INSERT INTO leave_balances (employee_id, leave_type_id, year, entitled_days, used_days, pending_days, carried_over, remaining_days)
  SELECT
    v_emp_id,
    lt.id,
    v_year,
    COALESCE(lt.days_per_year, 0),
    0, 0, 0,
    COALESCE(lt.days_per_year, 0)
  FROM leave_types lt
  WHERE lt.company_id = v_company_id AND lt.is_active = true;

  RAISE NOTICE '✅ STEP 5: สร้าง Leave Balances สำเร็จ';

  -- ═══════════════════════════════════════
  -- STEP 6: สร้าง Manager History (ถ้ามีหัวหน้า)
  -- ═══════════════════════════════════════
  IF v_supervisor_id IS NOT NULL THEN
    INSERT INTO employee_manager_history (employee_id, manager_id, effective_from, created_by)
    VALUES (v_emp_id, v_supervisor_id, v_hire_date, v_auth_id);
    RAISE NOTICE '✅ STEP 6: บันทึก Manager History สำเร็จ';
  ELSE
    RAISE NOTICE '⏭️  STEP 6: ข้าม Manager History (ไม่มีหัวหน้า)';
  END IF;

  -- ═══════════════════════════════════════
  -- STEP 7: สร้างสถานที่เช็คอิน
  -- ═══════════════════════════════════════
  IF v_checkin_bid1 IS NOT NULL THEN
    INSERT INTO employee_allowed_locations (employee_id, branch_id)
    VALUES (v_emp_id, v_checkin_bid1)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ STEP 7a: เพิ่มสถานที่เช็คอิน 1 สำเร็จ';
  END IF;

  IF v_checkin_bid2 IS NOT NULL THEN
    INSERT INTO employee_allowed_locations (employee_id, branch_id)
    VALUES (v_emp_id, v_checkin_bid2)
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ STEP 7b: เพิ่มสถานที่เช็คอิน 2 สำเร็จ';
  END IF;

  -- ═══════════════════════════════════════
  -- สรุปผล
  -- ═══════════════════════════════════════
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE '✅ สร้างพนักงานใหม่สำเร็จทั้งหมด!';
  RAISE NOTICE '  📧 อีเมล:      %', v_email;
  RAISE NOTICE '  🔑 รหัสผ่าน:    %', v_password;
  RAISE NOTICE '  👤 ชื่อ:        % %', v_first_name_th, v_last_name_th;
  RAISE NOTICE '  🏢 รหัส:        %', v_employee_code;
  RAISE NOTICE '  🔗 Auth ID:    %', v_auth_id;
  RAISE NOTICE '  🔗 Employee ID: %', v_emp_id;
  RAISE NOTICE '══════════════════════════════════════════';

END $$;


-- ═══════════════════════════════════════════════════════════════════
-- 🔍 ตรวจสอบผลลัพธ์ (run หลัง script ด้านบนเสร็จ)
-- ═══════════════════════════════════════════════════════════════════

-- ดูพนักงานที่เพิ่งสร้าง
-- SELECT e.employee_code, e.first_name_th, e.last_name_th, e.email,
--        e.employment_status, d.name AS department, p.name AS position,
--        u.id AS auth_id, u.role
-- FROM employees e
-- LEFT JOIN departments d ON d.id = e.department_id
-- LEFT JOIN positions p ON p.id = e.position_id
-- LEFT JOIN users u ON u.employee_id = e.id
-- WHERE e.employee_code = '68000XXX';  -- ← แก้เป็นรหัสที่สร้าง

-- ดู salary
-- SELECT * FROM salary_structures WHERE employee_id = (
--   SELECT id FROM employees WHERE employee_code = '68000XXX'
-- );

-- ดู leave balances
-- SELECT lb.year, lt.name, lb.entitled_days, lb.remaining_days
-- FROM leave_balances lb
-- JOIN leave_types lt ON lt.id = lb.leave_type_id
-- WHERE lb.employee_id = (
--   SELECT id FROM employees WHERE employee_code = '68000XXX'
-- );
