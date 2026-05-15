-- ──────────────────────────────────────────────────────────────────────────
-- Migration: เพิ่ม prorated salary + multi-brand
--   1) เพิ่มคอลัมน์ prorate_days ใน payroll_records (default null = ทำเต็มเดือน)
--      เมื่อกรอก: เงินเดือนและ KPI bonus จะถูกคูณด้วย (prorate_days / 30)
--   2) เปลี่ยน employees.brand จาก TEXT → TEXT[] รองรับหลายแบรนด์ต่อคน
-- ──────────────────────────────────────────────────────────────────────────

-- ═══ 1) prorate_days ใน payroll_records ═══
ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS prorate_days INTEGER DEFAULT NULL;

COMMENT ON COLUMN payroll_records.prorate_days IS 'จำนวนวันทำงานจริงในงวด (สำหรับพนักงานเข้า/ออกกลางงวด). NULL หรือ 30 = ไม่ prorate (ทำเต็มเดือน). ถ้ากรอกค่า: base_salary และ bonus จะถูกคูณด้วย (prorate_days / 30) ตอนคำนวณ';

-- ═══ 2) แปลง employees.brand จาก TEXT → TEXT[] ═══
-- ตรวจสอบก่อนว่ายังเป็น TEXT อยู่ (idempotent)
DO $$
DECLARE
  col_type TEXT;
BEGIN
  SELECT data_type INTO col_type
  FROM information_schema.columns
  WHERE table_name = 'employees' AND column_name = 'brand';

  IF col_type = 'text' THEN
    -- แปลงค่าเดิม: "" หรือ NULL → NULL array, ค่าเดี่ยว → array of 1
    ALTER TABLE employees
      ALTER COLUMN brand TYPE TEXT[]
      USING (
        CASE
          WHEN brand IS NULL OR trim(brand) = '' THEN NULL
          ELSE ARRAY[trim(brand)]
        END
      );
    RAISE NOTICE 'employees.brand converted from TEXT to TEXT[]';
  ELSE
    RAISE NOTICE 'employees.brand is already %, skipping conversion', col_type;
  END IF;
END $$;

COMMENT ON COLUMN employees.brand IS
  'รายชื่อแบรนด์ที่พนักงานดูแล (เลือกได้หลายแบรนด์). ตัวอย่าง: 70mai, Xiaomi MG, Soundcore';
