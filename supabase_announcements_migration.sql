-- ══════════════════════════════════════════════════════════════
-- Announcements System
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),          -- NULL = all companies
  department_id UUID REFERENCES departments(id),      -- NULL = all departments
  title TEXT NOT NULL,
  body TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  is_pinned BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,                             -- NULL = never expires
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track who has read each announcement
CREATE TABLE IF NOT EXISTS announcement_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_ann_company ON announcements(company_id);
CREATE INDEX IF NOT EXISTS idx_ann_dept ON announcements(department_id);
CREATE INDEX IF NOT EXISTS idx_ann_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_ann_reads_emp ON announcement_reads(employee_id);
CREATE INDEX IF NOT EXISTS idx_ann_reads_ann ON announcement_reads(announcement_id);
