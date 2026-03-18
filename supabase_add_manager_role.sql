-- ╔════════════════════════════════════════════════════════════════════╗
-- ║  เพิ่มค่า manager / hr_admin / super_admin ลง user_role ENUM    ║
-- ║  ถ้ามีอยู่แล้วจะไม่ error                                       ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- ── 1) เพิ่มค่า ENUM ที่ยังไม่มี ──────────────────────────────────
DO $$
BEGIN
  -- เช็คและเพิ่ม 'manager'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'manager' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'manager';
  END IF;
END $$;

DO $$
BEGIN
  -- เช็คและเพิ่ม 'hr_admin'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'hr_admin' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'hr_admin';
  END IF;
END $$;

DO $$
BEGIN
  -- เช็คและเพิ่ม 'super_admin'
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'user_role'::regtype) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- ── 2) ตรวจสอบว่า ENUM มีครบ ─────────────────────────────────────
-- Run this SELECT to verify:
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role'::regtype ORDER BY enumsortorder;
-- Expected: employee, manager, hr_admin, super_admin

-- ════════════════════════════════════════════════════════════════════
-- ตัวอย่าง: ตั้ง role manager ให้พนักงานรหัส 'SHD001'
-- ════════════════════════════════════════════════════════════════════
-- UPDATE users SET role = 'manager'::user_role
-- WHERE employee_id = (SELECT id FROM employees WHERE employee_code = 'SHD001');

-- ════════════════════════════════════════════════════════════════════
-- หรือตั้ง role manager ให้หลายคนพร้อมกัน:
-- ════════════════════════════════════════════════════════════════════
-- UPDATE users SET role = 'manager'::user_role
-- WHERE employee_id IN (
--   SELECT id FROM employees
--   WHERE employee_code IN ('SHD001', 'SHD002', 'SHD003')
-- );
