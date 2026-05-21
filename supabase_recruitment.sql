-- ════════════════════════════════════════════════════════════════════
-- ระบบรับสมัครงาน (Recruitment) — โครงสร้าง DB หลัก
-- ════════════════════════════════════════════════════════════════════

-- 1) ตำแหน่งงานที่เปิดรับสมัคร ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,          -- ใช้ใน URL careers/jobs/<slug>
  -- ── ชื่อ + คำอธิบาย 3 ภาษา (เก็บเป็น JSONB { th, en, zh }) ──
  title JSONB NOT NULL,               -- { "th": "นักพัฒนาธุรกิจ", "en": "BDA", "zh": "..." }
  description JSONB,                  -- รายละเอียดงาน (rich text/markdown)
  responsibilities JSONB,             -- หน้าที่ (array per language)
  qualifications JSONB,               -- คุณสมบัติ
  benefits JSONB,                     -- สวัสดิการ
  -- ── ข้อมูลตำแหน่ง ──
  department_id UUID REFERENCES departments(id),
  branch_id UUID REFERENCES branches(id),
  position_id UUID REFERENCES positions(id),
  employment_type TEXT DEFAULT 'full_time'
    CHECK (employment_type IN ('full_time','part_time','contract','intern','freelance')),
  location_country TEXT DEFAULT 'TH',
  location_city TEXT,
  salary_min NUMERIC(12,2),
  salary_max NUMERIC(12,2),
  salary_currency TEXT DEFAULT 'THB',
  salary_hidden BOOLEAN DEFAULT false,
  vacancies INT DEFAULT 1,
  experience_required TEXT,           -- "0-2 ปี"
  -- ── การแสดง ──
  cover_image_url TEXT,
  -- ── สถานะ ──
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed','archived')),
  open_date DATE,
  close_date DATE,
  -- ── สถิติ (auto-update) ──
  views_count INT DEFAULT 0,
  applications_count INT DEFAULT 0,
  -- ── audit ──
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_positions_status ON job_positions(status);
CREATE INDEX IF NOT EXISTS idx_job_positions_slug   ON job_positions(slug);
CREATE INDEX IF NOT EXISTS idx_job_positions_company ON job_positions(company_id);

COMMENT ON TABLE job_positions IS 'ตำแหน่งงานที่เปิดรับสมัคร — ใช้ทั้งฝั่ง admin (สร้าง/แก้) และ public (แสดงผล)';

-- 2) ใบสมัครงาน ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_code TEXT NOT NULL UNIQUE,  -- "APP-2026-00001"
  position_id UUID NOT NULL REFERENCES job_positions(id) ON DELETE CASCADE,

  -- ── Personal Information ──
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,                           -- e.g. "+66812345678"
  phone_country_code TEXT DEFAULT 'TH',
  current_country TEXT DEFAULT 'TH',
  address_detail TEXT,

  -- ── Education (JSONB array, สูงสุด 5 entries) ──
  -- [{ level, school, from, to }]
  education JSONB DEFAULT '[]'::JSONB,

  -- ── Experience (สูงสุด 20 entries) ──
  -- [{ company, title, from, to }]
  experience JSONB DEFAULT '[]'::JSONB,

  -- ── Skills (สูงสุด 8) ──
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- ── Other information ──
  visa_support TEXT,                    -- 'yes' / 'no'
  available_start_date DATE,
  website_url TEXT,
  source TEXT,                          -- "How did you hear about this role?"

  -- ── Files ──
  resume_url TEXT,
  resume_filename TEXT,
  attachments JSONB DEFAULT '[]'::JSONB, -- [{ url, filename, size }]

  -- ── Status pipeline ──
  status TEXT DEFAULT 'new'
    CHECK (status IN ('new','screening','interview','offered','hired','rejected','withdrawn')),
  rating NUMERIC(2,1),                  -- 0.0 - 5.0
  internal_notes TEXT,                  -- HR-only

  -- ── Conversion ──
  hired_employee_id UUID REFERENCES employees(id),

  -- ── Anti-spam ──
  submit_ip TEXT,
  submit_user_agent TEXT,

  -- ── audit ──
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_job_applications_position ON job_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status   ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_applied  ON job_applications(applied_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_email    ON job_applications(LOWER(email));

COMMENT ON TABLE job_applications IS 'ใบสมัครงานจากผู้สมัครภายนอก (public form) + จัดการโดย HR';

-- 3) ประวัติการเปลี่ยน status (audit trail) ─────────────────────────
CREATE TABLE IF NOT EXISTS application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES employees(id),
  from_status TEXT,
  to_status TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_application_history_app ON application_history(application_id);

-- 4) Sequence + function สำหรับสร้าง application_code ───────────────
CREATE SEQUENCE IF NOT EXISTS application_code_seq START 1;

CREATE OR REPLACE FUNCTION gen_application_code() RETURNS TEXT AS $$
DECLARE
  yyyy TEXT := to_char(now(), 'YYYY');
  seq INT := nextval('application_code_seq');
BEGIN
  RETURN 'APP-' || yyyy || '-' || LPAD(seq::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- 5) Trigger: อัปเดต applications_count ของ job_positions อัตโนมัติ ──
CREATE OR REPLACE FUNCTION sync_applications_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE job_positions SET applications_count = applications_count + 1
      WHERE id = NEW.position_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE job_positions SET applications_count = GREATEST(applications_count - 1, 0)
      WHERE id = OLD.position_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_app_count ON job_applications;
CREATE TRIGGER trg_sync_app_count
  AFTER INSERT OR DELETE ON job_applications
  FOR EACH ROW EXECUTE FUNCTION sync_applications_count();

-- 6) RLS Policies — public อ่านได้ตำแหน่ง status=open, submit ได้ใบสมัคร
ALTER TABLE job_positions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;

-- Public: อ่านตำแหน่ง status=open ได้
DROP POLICY IF EXISTS "Public read open positions" ON job_positions;
CREATE POLICY "Public read open positions" ON job_positions
  FOR SELECT USING (status = 'open');

-- Public: insert ใบสมัครใหม่ได้ (ผ่าน API ใช้ service client อยู่แล้ว — RLS เป็น defense in depth)
DROP POLICY IF EXISTS "Public insert applications" ON job_applications;
CREATE POLICY "Public insert applications" ON job_applications
  FOR INSERT WITH CHECK (true);

-- Admin: เห็นทุกอย่าง (ใช้ service client → bypass RLS อยู่แล้ว)
-- ไม่ต้องสร้าง policy ฝั่ง admin

-- 7) Storage bucket สำหรับ resume + attachments ────────────────────
-- รัน manually ใน Supabase Storage หน้า web หรือ:
INSERT INTO storage.buckets (id, name, public)
  VALUES ('recruitment', 'recruitment', false)
  ON CONFLICT DO NOTHING;

-- Public can upload to recruitment/resumes/* (anonymous)
-- Admin can read all via signed URL through API
-- (รัน policy ผ่าน Supabase Studio ถ้าต้องการ — หรือใช้ service client ใน API)

NOTIFY pgrst, 'reload schema';
