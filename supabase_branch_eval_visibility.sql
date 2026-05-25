-- ════════════════════════════════════════════════════════════════════
-- Migration: Template visibility (public / private) + viewers
-- ────────────────────────────────────────────────────────────────────
-- เพิ่มความสามารถ:
--   • visibility: 'public' = ทุกคนที่มีสิทธิ์ branch_eval เห็น
--                 'private' = เฉพาะ owner + admin + viewers
--   • owner_id: เจ้าของหลัก (default = created_by ถ้าไม่ระบุ)
--   • table branch_eval_template_viewers: คนเฉพาะที่ดู private template ได้
-- ════════════════════════════════════════════════════════════════════

-- 1) เพิ่ม columns ใน templates
ALTER TABLE branch_eval_templates
  ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public'
    CHECK (visibility IN ('public', 'private'));

ALTER TABLE branch_eval_templates
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES employees(id);

-- backfill owner_id = created_by ของ template เก่า
UPDATE branch_eval_templates SET owner_id = created_by WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_branch_eval_templates_owner
  ON branch_eval_templates(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branch_eval_templates_visibility
  ON branch_eval_templates(visibility) WHERE deleted_at IS NULL;

-- 2) ตาราง viewers สำหรับ private templates
CREATE TABLE IF NOT EXISTS branch_eval_template_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES branch_eval_templates(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES employees(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (template_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_eval_tpl_viewers_template
  ON branch_eval_template_viewers(template_id);
CREATE INDEX IF NOT EXISTS idx_branch_eval_tpl_viewers_employee
  ON branch_eval_template_viewers(employee_id);

ALTER TABLE branch_eval_template_viewers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON branch_eval_template_viewers;
CREATE POLICY "Service role full access" ON branch_eval_template_viewers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

-- ─────────── VERIFY ──────────────────────────────────────────────
DO $$
DECLARE
  v_pub INT; v_priv INT; v_viewers INT;
BEGIN
  SELECT COUNT(*) INTO v_pub  FROM branch_eval_templates WHERE visibility = 'public';
  SELECT COUNT(*) INTO v_priv FROM branch_eval_templates WHERE visibility = 'private';
  SELECT COUNT(*) INTO v_viewers FROM branch_eval_template_viewers;
  RAISE NOTICE '✓ templates — public: %, private: %', v_pub, v_priv;
  RAISE NOTICE '✓ viewers rows: %', v_viewers;
END $$;
