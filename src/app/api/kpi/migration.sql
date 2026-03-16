-- ============================================================
-- KPI System Migration for GOODHR
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. KPI Forms (1 form = 1 employee per month)
CREATE TABLE IF NOT EXISTS kpi_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  evaluator_id UUID NOT NULL REFERENCES employees(id),
  year INT NOT NULL,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  total_score NUMERIC(6,2) DEFAULT 0,
  grade TEXT CHECK (grade IN ('A','B','C','D')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','acknowledged')),
  evaluator_note TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(employee_id, year, month)
);

-- 2. KPI Items (rows within a form)
CREATE TABLE IF NOT EXISTS kpi_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_form_id UUID NOT NULL REFERENCES kpi_forms(id) ON DELETE CASCADE,
  order_no INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  weight_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  actual_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  weighted_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT false,
  comment TEXT DEFAULT ''
);

-- 3. KPI Templates (optional: company-level default items)
CREATE TABLE IF NOT EXISTS kpi_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  item_order INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  default_weight NUMERIC(5,2) DEFAULT 20,
  is_mandatory BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_kpi_forms_employee ON kpi_forms(employee_id, year, month);
CREATE INDEX IF NOT EXISTS idx_kpi_forms_evaluator ON kpi_forms(evaluator_id, year, month);
CREATE INDEX IF NOT EXISTS idx_kpi_forms_company ON kpi_forms(company_id, year, month);
CREATE INDEX IF NOT EXISTS idx_kpi_items_form ON kpi_items(kpi_form_id);

-- ============================================================
-- RLS Policies (enable RLS first)
-- ============================================================
ALTER TABLE kpi_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_templates ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (used by API)
CREATE POLICY "Service role full access" ON kpi_forms
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON kpi_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON kpi_templates
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Insert default mandatory templates (run once per company)
-- Replace 'YOUR_COMPANY_ID' with actual company UUID
-- ============================================================
-- INSERT INTO kpi_templates (company_id, item_order, category, description, default_weight, is_mandatory) VALUES
-- ('YOUR_COMPANY_ID', 1, 'ความประพฤติ (พนักงาน)', '1. ไม่ขาดงาน/ลางาน/มาสาย\n2. ให้ความร่วมมือในกิจกรรมต่างๆที่บริษัทจัดขึ้น\n3. มีความประพฤติส่วนตัวที่เหมาะสม', 20, true),
-- ('YOUR_COMPANY_ID', 2, 'ความประพฤติ (หัวหน้างาน)', '4. ประพฤติตนตามระเบียบวินัย และคำสั่งของผู้บังคับบัญชา\n5. ไม่มีพฤติกรรมสร้างความแตกแยกในองค์กร\n6. ซื่อสัตย์สุจริตต่อหน้าที่ และรักษาผลประโยชน์ของบริษัท\n7. ไม่ทำให้บริษัทเสียหาย และหรือเสื่อมเสียชื่อเสียง', 20, true);
