-- ════════════════════════════════════════════════════════════════════
-- เพิ่มข้อมูลเงินเดือนพนักงาน 68000247 ภูมิปรมภัทร์ บุญภูงา (ไช้)
-- บริษัท: TOP ONE | ตำแหน่ง: MC Live Streaming | แผนก: ฝ่ายการตลาดออนไลน์
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══ Step 1: ตรวจสอบว่าพนักงานมีอยู่จริง ═══
DO $$
DECLARE
  v_emp_id UUID;
  v_company_id UUID;
BEGIN
  SELECT id, company_id INTO v_emp_id, v_company_id
  FROM employees
  WHERE employee_code = '68000247' AND is_active = true;

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบพนักงานรหัส 68000247 ในระบบ';
  END IF;

  RAISE NOTICE 'พบพนักงาน: % (company: %)', v_emp_id, v_company_id;
END $$;

-- ═══ Step 2: เพิ่ม salary_structure ═══
-- ฐานเงินเดือน: 30,000 | ค่าเบี้ยเลี้ยง/ค่าตำแหน่ง/ค่าเดินทาง ทั้งหมด = 0
-- ประกันสังคม: 875 | ภาษี: 165 | สุทธิ: 28,960
INSERT INTO salary_structures (
  id, employee_id,
  base_salary,
  allowance_position, allowance_transport, allowance_food,
  allowance_phone, allowance_housing,
  ot_rate_normal, ot_rate_holiday,
  effective_from
)
SELECT
  gen_random_uuid(),
  e.id,
  30000,    -- base_salary
  0,        -- allowance_position
  0,        -- allowance_transport
  0,        -- allowance_food
  0,        -- allowance_phone
  0,        -- allowance_housing
  1.5,      -- ot_rate_normal
  3.0,      -- ot_rate_holiday
  '2026-01-06'  -- effective_from (hire_date)
FROM employees e
WHERE e.employee_code = '68000247'
  AND NOT EXISTS (
    SELECT 1 FROM salary_structures ss
    WHERE ss.employee_id = e.id AND ss.effective_to IS NULL
  );

-- ═══ Step 3: ตรวจสอบผลลัพธ์ ═══
DO $$
DECLARE
  v_count INT;
  v_base NUMERIC;
BEGIN
  SELECT COUNT(*), MAX(ss.base_salary) INTO v_count, v_base
  FROM salary_structures ss
  JOIN employees e ON e.id = ss.employee_id
  WHERE e.employee_code = '68000247' AND ss.effective_to IS NULL;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'ไม่สามารถเพิ่ม salary_structure ได้';
  END IF;

  RAISE NOTICE 'สำเร็จ: พนักงาน 68000247 มี salary_structure (base_salary: %)', v_base;
END $$;

COMMIT;
