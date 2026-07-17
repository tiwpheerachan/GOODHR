-- ════════════════════════════════════════════════════════════════════
-- training_quiz_assignments — กำหนดว่าควิซนี้ให้ "ใคร" ทำ (รายคน ข้ามบริษัทได้)
--   ควิซที่ไม่มี assignment  → ทุกคนที่ลงทะเบียนคอร์สเห็น (default เดิม)
--   ควิซที่มี assignment      → เฉพาะคนที่ถูกกำหนดเท่านั้นที่เห็น/ทำได้
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS training_quiz_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_assign_quiz ON training_quiz_assignments(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assign_emp  ON training_quiz_assignments(employee_id);

ALTER TABLE training_quiz_assignments ENABLE ROW LEVEL SECURITY;  -- อ่าน/เขียนผ่าน service role (API)

NOTIFY pgrst, 'reload schema';
