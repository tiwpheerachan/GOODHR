-- ════════════════════════════════════════════════════════════════════
-- เพิ่ม per-branch template ในการบ้าน
--
-- เดิม: assignment.template_id ใช้กับทุก target
-- ใหม่: target.template_id (nullable) override per-row → ถ้าไม่ระบุใช้ assignment.template_id เป็น default
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE branch_eval_assignment_targets
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES branch_eval_templates(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_aet_template
  ON branch_eval_assignment_targets(template_id) WHERE template_id IS NOT NULL;

-- Backfill: ตั้ง template_id ของ target ที่มีอยู่แล้ว = assignment.template_id (ใช้ default ของ assignment เดิม)
UPDATE branch_eval_assignment_targets t
SET template_id = a.template_id
FROM branch_eval_assignments a
WHERE t.assignment_id = a.id
  AND t.template_id IS NULL;

-- Verify
SELECT
  count(*) FILTER (WHERE template_id IS NOT NULL) AS targets_with_template,
  count(*) FILTER (WHERE template_id IS NULL)     AS targets_no_template,
  count(*) AS total
FROM branch_eval_assignment_targets;
