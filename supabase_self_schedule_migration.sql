-- ═══════════════════════════════════════════════════════════════════
-- Self-Schedule Migration
-- ให้พนักงานที่ได้รับสิทธิ์สามารถวางกะเองได้
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. เพิ่ม column ใน employees (simple flag) ──────────────────
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS can_self_schedule BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN employees.can_self_schedule IS 'เปิดสิทธิ์ให้พนักงานวางกะเอง';

-- ── 2. เพิ่ม column ใน monthly_shift_assignments ────────────────
ALTER TABLE monthly_shift_assignments
  ADD COLUMN IF NOT EXISTS submitted_by UUID,
  ADD COLUMN IF NOT EXISTS has_pending_change BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN monthly_shift_assignments.submitted_by IS 'ใครเป็นคนวาง (employee / manager / system)';
COMMENT ON COLUMN monthly_shift_assignments.has_pending_change IS 'มีคำขอเปลี่ยนแปลงรออยู่';

-- ── 3. สร้างตาราง shift_change_requests ─────────────────────────
CREATE TABLE IF NOT EXISTS shift_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id),
  work_date DATE NOT NULL,

  -- กะปัจจุบัน (ก่อนเปลี่ยน)
  current_shift_id UUID REFERENCES shift_templates(id),
  current_assignment_type TEXT,

  -- กะที่ขอเปลี่ยน
  requested_shift_id UUID REFERENCES shift_templates(id),
  requested_assignment_type TEXT NOT NULL CHECK (requested_assignment_type IN ('work', 'dayoff')),

  reason TEXT,

  -- สถานะ
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn', 'auto_rejected')),

  -- timestamps
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- ป้องกัน duplicate: 1 คน 1 วัน มีได้เฉพาะ pending เดียว
  -- (ใช้ partial unique index แทน เพราะ UNIQUE ธรรมดาจะ block ประวัติเก่า)
  CONSTRAINT shift_change_requests_employee_date_unique
    EXCLUDE USING btree (employee_id WITH =, work_date WITH =)
    WHERE (status = 'pending')
);

-- Index สำหรับ query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_shift_change_req_employee
  ON shift_change_requests(employee_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_change_req_company_status
  ON shift_change_requests(company_id, status, work_date);
CREATE INDEX IF NOT EXISTS idx_shift_change_req_pending
  ON shift_change_requests(status, work_date)
  WHERE status = 'pending';

-- ── 4. RLS Policies ─────────────────────────────────────────────
ALTER TABLE shift_change_requests ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS → API ใช้ service client อยู่แล้ว
-- แต่เพิ่ม policy สำหรับ anon/user ไว้ด้วย
CREATE POLICY "Employees can view own requests"
  ON shift_change_requests FOR SELECT
  USING (employee_id IN (
    SELECT e.id FROM employees e
    JOIN users u ON u.employee_id = e.id
    WHERE u.id = auth.uid()
  ));

CREATE POLICY "Admins can view all requests"
  ON shift_change_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = auth.uid()
    AND u.role IN ('super_admin', 'hr_admin')
  ));

-- ── 5. Trigger: auto update updated_at ──────────────────────────
CREATE OR REPLACE FUNCTION update_shift_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_shift_change_requests_updated_at ON shift_change_requests;
CREATE TRIGGER trg_shift_change_requests_updated_at
  BEFORE UPDATE ON shift_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_shift_change_requests_updated_at();

-- ═══════════════════════════════════════════════════════════════════
DO $$
BEGIN
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ Self-Schedule Migration สำเร็จ';
  RAISE NOTICE '   - employees.can_self_schedule';
  RAISE NOTICE '   - monthly_shift_assignments.submitted_by + has_pending_change';
  RAISE NOTICE '   - shift_change_requests table + indexes + RLS';
  RAISE NOTICE '══════════════════════════════════════';
END $$;
