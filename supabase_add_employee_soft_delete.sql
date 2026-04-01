-- ════════════════════════════════════════════════════════════════════
-- เพิ่มฟีเจอร์ Soft Delete พนักงาน
-- Run this in Supabase SQL Editor before deploying the code changes
-- ════════════════════════════════════════════════════════════════════

-- Step 1: เพิ่มคอลัมน์ deleted_at และ deleted_by ในตาราง employees
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Step 2: สร้างตาราง employee_deletion_log เก็บประวัติการลบ/กู้คืน
CREATE TABLE IF NOT EXISTS employee_deletion_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID        NOT NULL REFERENCES employees(id),
  company_id   UUID        NOT NULL,
  action       TEXT        NOT NULL CHECK (action IN ('delete', 'restore')),
  reason       TEXT,
  previous_employment_status TEXT,
  performed_by UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: RLS สำหรับตาราง employee_deletion_log
ALTER TABLE employee_deletion_log ENABLE ROW LEVEL SECURITY;

-- super_admin และ hr_admin เท่านั้นที่เข้าถึงได้
CREATE POLICY "admin_can_manage_deletion_log"
  ON employee_deletion_log
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'hr_admin')
    )
  );

-- Step 4: ตรวจสอบผลลัพธ์
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees'
  AND column_name IN ('deleted_at', 'deleted_by');

SELECT 'employee_deletion_log table created' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'employee_deletion_log'
);
