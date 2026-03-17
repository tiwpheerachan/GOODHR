-- ═══════════════════════════════════════════════════════════════════════════
-- Off-site Check-in Migration
-- ระบบเช็คอินนอกสถานที่ด้วยรูปถ่าย + ระบบอนุมัติ
-- ═══════════════════════════════════════════════════════════════════════════

-- 1) สร้างตาราง offsite_checkin_requests
CREATE TABLE IF NOT EXISTS offsite_checkin_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  attendance_id   UUID REFERENCES attendance_records(id) ON DELETE SET NULL,

  -- ข้อมูลตำแหน่ง
  latitude        DECIMAL(10,7) NOT NULL,
  longitude       DECIMAL(10,7) NOT NULL,
  location_name   TEXT,              -- ชื่อสถานที่ (พนักงานกรอก)

  -- รูปถ่าย
  photo_url       TEXT NOT NULL,     -- URL ใน Supabase Storage
  photo_stamped_url TEXT,            -- URL รูปที่ stamp วันที่เวลาแล้ว

  -- เวลา
  check_type      TEXT NOT NULL CHECK (check_type IN ('clock_in', 'clock_out')),
  checked_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  work_date       DATE NOT NULL,

  -- หมายเหตุ
  note            TEXT,

  -- สถานะอนุมัติ
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  reject_reason   TEXT,

  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_offsite_checkin_employee ON offsite_checkin_requests(employee_id, work_date);
CREATE INDEX idx_offsite_checkin_status ON offsite_checkin_requests(status, company_id);
CREATE INDEX idx_offsite_checkin_date ON offsite_checkin_requests(work_date, company_id);

-- 2) เพิ่มคอลัมน์ใน attendance_records สำหรับ flag off-site
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS is_offsite_in  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_offsite_out BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS offsite_in_request_id  UUID REFERENCES offsite_checkin_requests(id),
  ADD COLUMN IF NOT EXISTS offsite_out_request_id UUID REFERENCES offsite_checkin_requests(id),
  ADD COLUMN IF NOT EXISTS offsite_in_status  TEXT DEFAULT NULL CHECK (offsite_in_status  IS NULL OR offsite_in_status  IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS offsite_out_status TEXT DEFAULT NULL CHECK (offsite_out_status IS NULL OR offsite_out_status IN ('pending', 'approved', 'rejected'));

-- 3) สร้าง Supabase Storage bucket สำหรับรูปเช็คอิน
-- (ต้องรันใน Supabase Dashboard หรือใช้ supabase CLI)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('checkin-photos', 'checkin-photos', true);

-- 4) RLS policies สำหรับ offsite_checkin_requests
ALTER TABLE offsite_checkin_requests ENABLE ROW LEVEL SECURITY;

-- พนักงานดูได้เฉพาะของตัวเอง
CREATE POLICY "employees_view_own_offsite" ON offsite_checkin_requests
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

-- พนักงานสร้างได้เฉพาะของตัวเอง
CREATE POLICY "employees_insert_own_offsite" ON offsite_checkin_requests
  FOR INSERT WITH CHECK (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

-- HR/Admin/Manager ดูได้ทั้งบริษัท
CREATE POLICY "admin_view_offsite" ON offsite_checkin_requests
  FOR SELECT USING (
    company_id IN (
      SELECT e.company_id FROM users u JOIN employees e ON u.employee_id = e.id
      WHERE u.id = auth.uid() AND u.role IN ('manager'::user_role)
    )
  );

-- HR/Admin/Manager อัปเดตได้ (approve/reject)
CREATE POLICY "admin_update_offsite" ON offsite_checkin_requests
  FOR UPDATE USING (
    company_id IN (
      SELECT e.company_id FROM users u JOIN employees e ON u.employee_id = e.id
      WHERE u.id = auth.uid() AND u.role IN ('manager'::user_role)
    )
  );
