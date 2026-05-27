-- ════════════════════════════════════════════════════════════════════
-- เพิ่ม: ระบบ "การบ้าน / มอบหมายงาน" สำหรับประเมินสาขา
--
-- โครงสร้าง:
--   branch_eval_assignments      — การบ้าน 1 ชิ้น (หัวหน้ามอบ template + due_date)
--   branch_eval_assignment_targets — แต่ละช่อง "ลูกน้อง × สาขา" ที่ต้องทำ
--   branch_evaluations.assignment_id — link ฟอร์มที่ทำเสร็จกลับเข้า target
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) ตารางหลัก: การบ้าน ═══
CREATE TABLE IF NOT EXISTS branch_eval_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_by   uuid NOT NULL REFERENCES employees(id),
  template_id   uuid NOT NULL REFERENCES branch_eval_templates(id),
  title         text NOT NULL,
  description   text,
  due_date      date,
  status        text NOT NULL DEFAULT 'open',  -- open | cancelled
  company_id    uuid REFERENCES companies(id),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  CHECK (status IN ('open', 'cancelled'))
);

CREATE INDEX IF NOT EXISTS idx_branch_eval_assignments_by ON branch_eval_assignments(assigned_by, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_eval_assignments_status ON branch_eval_assignments(status) WHERE status = 'open';

-- ═══ 2) ตาราง target: ลูกน้อง × สาขา ที่ต้องทำ ═══
CREATE TABLE IF NOT EXISTS branch_eval_assignment_targets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   uuid NOT NULL REFERENCES branch_eval_assignments(id) ON DELETE CASCADE,
  assignee_id     uuid NOT NULL REFERENCES employees(id),
  branch_id       uuid NOT NULL REFERENCES branches(id),
  evaluation_id   uuid REFERENCES branch_evaluations(id) ON DELETE SET NULL,
  completed_at    timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (assignment_id, assignee_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_aet_assignee_pending
  ON branch_eval_assignment_targets(assignee_id) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_aet_branch ON branch_eval_assignment_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_aet_evaluation ON branch_eval_assignment_targets(evaluation_id);

-- ═══ 3) Link จาก evaluation กลับเข้า assignment ═══
ALTER TABLE branch_evaluations
  ADD COLUMN IF NOT EXISTS assignment_id uuid
    REFERENCES branch_eval_assignments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_branch_eval_assignment
  ON branch_evaluations(assignment_id) WHERE assignment_id IS NOT NULL AND deleted_at IS NULL;

-- ═══ 4) Trigger: เมื่อ branch_evaluations.status เปลี่ยนเป็น submitted/reviewed
--     → mark target completed (ถ้ามี assignment_id) ═══
CREATE OR REPLACE FUNCTION mark_assignment_target_completed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assignment_id IS NOT NULL
     AND NEW.status IN ('submitted', 'reviewed')
     AND (OLD IS NULL OR OLD.status != NEW.status OR OLD.assignment_id IS NULL) THEN
    -- update or insert target
    UPDATE branch_eval_assignment_targets
    SET evaluation_id = NEW.id,
        completed_at = COALESCE(completed_at, now())
    WHERE assignment_id = NEW.assignment_id
      AND assignee_id  = NEW.evaluator_id
      AND branch_id    = NEW.branch_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_mark_assignment_target_completed ON branch_evaluations;
CREATE TRIGGER trg_mark_assignment_target_completed
  AFTER INSERT OR UPDATE OF status, assignment_id ON branch_evaluations
  FOR EACH ROW
  EXECUTE FUNCTION mark_assignment_target_completed();

-- ═══ 5) Verify ═══
SELECT
  'branch_eval_assignments'         AS tbl,
  count(*)                          AS rows
FROM branch_eval_assignments
UNION ALL SELECT 'branch_eval_assignment_targets', count(*) FROM branch_eval_assignment_targets;
