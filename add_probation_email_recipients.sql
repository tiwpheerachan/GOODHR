-- ============================================================
-- GOODHR: อีเมลผู้รับแจ้งเตือนประเมินทดลองงาน
-- เมื่อหัวหน้ากดส่งประเมินทดลองงาน → ส่งอีเมลไปยังทุกอีเมลในตารางนี้ (ตามบริษัท)
-- ตั้งค่าได้ในหน้า /admin/probation-eval
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS probation_email_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  label TEXT,                         -- ชื่อ/หมายเหตุของผู้รับ (ไม่บังคับ)
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_probation_email_recipients_company
  ON probation_email_recipients(company_id) WHERE is_active = true;

ALTER TABLE probation_email_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON probation_email_recipients;
CREATE POLICY "Service role full access" ON probation_email_recipients
  FOR ALL USING (true) WITH CHECK (true);

COMMIT;
