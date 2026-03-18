-- ╔════════════════════════════════════════════════════════════════════╗
-- ║  SHIFT SCHEDULING SYSTEM — Migration                              ║
-- ║  ระบบจัดกะการทำงาน: จัดตารางกะรายเดือนสำหรับพนักงานกะไม่แน่นอน    ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- ────────────────────────────────────────────────────────────────────
-- 1) employee_schedule_profiles
--    กำหนดว่าพนักงานแต่ละคนเป็นตารางคงที่หรือไม่แน่นอน
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employee_schedule_profiles (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  schedule_type   TEXT NOT NULL DEFAULT 'fixed' CHECK (schedule_type IN ('fixed', 'variable')),
  default_shift_id UUID REFERENCES shift_templates(id) ON DELETE SET NULL,
  fixed_dayoffs   TEXT[] DEFAULT '{}',   -- e.g. {'sat','sun'} or {'sun'} or {'wed'}
  work_code       TEXT,                  -- e.g. '9' or '11' (reference code from Excel)
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_esp_employee ON employee_schedule_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_esp_company  ON employee_schedule_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_esp_type     ON employee_schedule_profiles(schedule_type);

-- ────────────────────────────────────────────────────────────────────
-- 2) monthly_shift_assignments
--    ตารางกะรายวันของพนักงาน (ทั้ง fixed และ variable)
--    1 คน 1 วัน = 1 record เท่านั้น
-- ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS monthly_shift_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  work_date       DATE NOT NULL,
  shift_id        UUID REFERENCES shift_templates(id) ON DELETE SET NULL,  -- NULL = dayoff
  assignment_type TEXT NOT NULL DEFAULT 'work' CHECK (assignment_type IN ('work', 'dayoff', 'leave', 'holiday')),
  leave_type      TEXT,          -- พักร้อน, ลากิจ, ลาป่วย etc. (only when assignment_type = 'leave')
  note            TEXT,
  assigned_by     UUID REFERENCES users(id) ON DELETE SET NULL,  -- หัวหน้าที่จัด (NULL = auto-generated)
  is_locked       BOOLEAN DEFAULT false,  -- เมื่อ lock แล้วแก้ไม่ได้
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, work_date)
);

-- Indexes for monthly queries
CREATE INDEX IF NOT EXISTS idx_msa_emp_date    ON monthly_shift_assignments(employee_id, work_date);
CREATE INDEX IF NOT EXISTS idx_msa_company     ON monthly_shift_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_msa_work_date   ON monthly_shift_assignments(work_date);
CREATE INDEX IF NOT EXISTS idx_msa_assigned_by ON monthly_shift_assignments(assigned_by);

-- ────────────────────────────────────────────────────────────────────
-- 3) Add more shift_templates for the various start times
--    (Only insert if not already present for each company)
-- ────────────────────────────────────────────────────────────────────

-- SHD company — เพิ่มกะใหม่ทีละรายการ (shift_type เป็น ENUM ต้อง cast)
-- กะ 09:00 มีอยู่แล้ว — เพิ่มเฉพาะที่ยังไม่มี
DO $$
DECLARE
  v_company_id UUID := 'a684555a-e44d-4441-9af8-521115cd000a';
BEGIN
  -- 10:00-19:00
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 10:00-19:00', 'normal'::shift_type, '10:00', '19:00', false, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 10:00-19:00');

  -- 10:30-19:30
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 10:30-19:30', 'normal'::shift_type, '10:30', '19:30', false, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 10:30-19:30');

  -- 11:00-20:00
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 11:00-20:00', 'normal'::shift_type, '11:00', '20:00', false, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 11:00-20:00');

  -- 12:00-21:00
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 12:00-21:00', 'normal'::shift_type, '12:00', '21:00', false, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 12:00-21:00');

  -- 12:30-21:30
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 12:30-21:30', 'normal'::shift_type, '12:30', '21:30', false, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 12:30-21:30');

  -- 13:00-22:00
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 13:00-22:00', 'normal'::shift_type, '13:00', '22:00', false, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 13:00-22:00');

  -- 15:30-00:30 (ข้ามคืน)
  INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, is_overnight, break_minutes, ot_start_after_minutes)
  SELECT v_company_id, 'กะ 15:30-00:30', 'normal'::shift_type, '15:30', '00:30', true, 60, 0
  WHERE NOT EXISTS (SELECT 1 FROM shift_templates WHERE company_id = v_company_id AND name = 'กะ 15:30-00:30');
END $$;

-- ────────────────────────────────────────────────────────────────────
-- 4) RLS Policies
-- ────────────────────────────────────────────────────────────────────
ALTER TABLE employee_schedule_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_shift_assignments ENABLE ROW LEVEL SECURITY;

-- Allow service role to bypass (for API)
-- Employee can read own profile
CREATE POLICY "esp_select_own" ON employee_schedule_profiles
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN users u ON u.employee_id = e.id
      WHERE u.id = auth.uid()
    )
  );

-- HR/Manager can manage all in their company
CREATE POLICY "esp_manage_company" ON employee_schedule_profiles
  FOR ALL USING (
    company_id IN (
      SELECT e.company_id FROM employees e
      JOIN users u ON u.employee_id = e.id
      WHERE u.id = auth.uid()
    )
  );

-- Employee can read own assignments
CREATE POLICY "msa_select_own" ON monthly_shift_assignments
  FOR SELECT USING (
    employee_id IN (
      SELECT e.id FROM employees e
      JOIN users u ON u.employee_id = e.id
      WHERE u.id = auth.uid()
    )
  );

-- HR/Manager can manage all in their company
CREATE POLICY "msa_manage_company" ON monthly_shift_assignments
  FOR ALL USING (
    company_id IN (
      SELECT e.company_id FROM employees e
      JOIN users u ON u.employee_id = e.id
      WHERE u.id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────
-- 5) Updated_at trigger
-- ────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS esp_updated_at ON employee_schedule_profiles;
CREATE TRIGGER esp_updated_at
  BEFORE UPDATE ON employee_schedule_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS msa_updated_at ON monthly_shift_assignments;
CREATE TRIGGER msa_updated_at
  BEFORE UPDATE ON monthly_shift_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════
-- DONE! Run this migration in Supabase SQL Editor.
-- ════════════════════════════════════════════════════════════════════
