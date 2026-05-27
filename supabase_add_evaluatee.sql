-- ════════════════════════════════════════════════════════════════════
-- เพิ่ม "ประเมินใคร" (evaluatee_id) ใน branch_evaluations
-- ─ แตกต่างจาก target_manager_id (ผู้รับฟอร์ม/หัวหน้า)
-- ─ evaluatee_id = พนักงานที่ถูกประเมิน (เช่น branch manager, store manager)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE branch_evaluations
  ADD COLUMN IF NOT EXISTS evaluatee_id uuid REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_branch_eval_evaluatee
  ON branch_evaluations(evaluatee_id) WHERE evaluatee_id IS NOT NULL;

-- Verify
SELECT
  count(*) FILTER (WHERE evaluatee_id IS NOT NULL) AS with_evaluatee,
  count(*) FILTER (WHERE evaluatee_id IS NULL) AS no_evaluatee,
  count(*) AS total
FROM branch_evaluations;
