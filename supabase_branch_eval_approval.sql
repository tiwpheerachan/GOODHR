-- ════════════════════════════════════════════════════════════════════
-- Branch Eval Approval workflow
--   เพิ่ม status: 'approved', 'rejected'
--   ใช้ reviewer_notes / reviewed_by / reviewed_at เดิม
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE branch_evaluations DROP CONSTRAINT IF EXISTS branch_evaluations_status_check;
ALTER TABLE branch_evaluations
  ADD CONSTRAINT branch_evaluations_status_check
  CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected'));

-- Index สำหรับ list หน้า pending approval
CREATE INDEX IF NOT EXISTS idx_branch_evals_submitted
  ON branch_evaluations(status, submitted_at DESC)
  WHERE deleted_at IS NULL AND status = 'submitted';
