-- ============================================================
-- GOODHR: KPI Approval Flow + Probation Evaluation System
-- Run this in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- PART 1: KPI Forms — เพิ่ม HR Approval Flow
-- ══════════════════════════════════════════════════════════════

-- 1.1 เปลี่ยน status constraint: เพิ่ม 'approved' และ 'rejected'
ALTER TABLE kpi_forms DROP CONSTRAINT IF EXISTS kpi_forms_status_check;
ALTER TABLE kpi_forms ADD CONSTRAINT kpi_forms_status_check
  CHECK (status IN ('draft','submitted','approved','rejected','acknowledged'));

-- 1.2 เพิ่ม columns สำหรับ approval
ALTER TABLE kpi_forms ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id);
ALTER TABLE kpi_forms ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE kpi_forms ADD COLUMN IF NOT EXISTS rejection_note TEXT;

-- ══════════════════════════════════════════════════════════════
-- PART 2: Probation Evaluations — ระบบประเมินทดลองงาน
-- ══════════════════════════════════════════════════════════════

-- 2.1 ตารางหลัก: probation_evaluations
CREATE TABLE IF NOT EXISTS probation_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES employees(id),
  round INT NOT NULL CHECK (round IN (1, 2, 3)),
  due_date DATE NOT NULL,
  total_score NUMERIC(6,2) DEFAULT 0,
  grade TEXT CHECK (grade IN ('A','B','C','D')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','approved','rejected')),
  evaluator_note TEXT,
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  rejection_note TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(employee_id, round)
);

-- 2.2 รายการประเมิน: probation_evaluation_items
CREATE TABLE IF NOT EXISTS probation_evaluation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES probation_evaluations(id) ON DELETE CASCADE,
  order_no INT NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  weight_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  actual_score NUMERIC(5,2) NOT NULL DEFAULT 0,
  weighted_score NUMERIC(6,2) NOT NULL DEFAULT 0,
  is_mandatory BOOLEAN DEFAULT false,
  comment TEXT DEFAULT ''
);

-- ══════════════════════════════════════════════════════════════
-- PART 3: Indexes
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_probation_eval_employee ON probation_evaluations(employee_id, round);
CREATE INDEX IF NOT EXISTS idx_probation_eval_company ON probation_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_probation_eval_status ON probation_evaluations(status);
CREATE INDEX IF NOT EXISTS idx_probation_eval_items ON probation_evaluation_items(evaluation_id);

-- KPI: index on status for approval queries
CREATE INDEX IF NOT EXISTS idx_kpi_forms_status ON kpi_forms(status);

-- ══════════════════════════════════════════════════════════════
-- PART 4: RLS Policies
-- ══════════════════════════════════════════════════════════════

ALTER TABLE probation_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE probation_evaluation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON probation_evaluations;
CREATE POLICY "Service role full access" ON probation_evaluations
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON probation_evaluation_items;
CREATE POLICY "Service role full access" ON probation_evaluation_items
  FOR ALL USING (true) WITH CHECK (true);

COMMIT;
