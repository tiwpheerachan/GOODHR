-- ═══════════════════════════════════════════════════════════════════
-- มอบหมายการประเมินทดลองงานหลายคน/หลายรอบ (probation eval assignments)
--   • ตั้งได้ว่า "ใคร" ประเมินพนักงานคนนี้ "รอบไหน" — เพิ่มได้ไม่จำกัด
--   • ผู้ประเมินเป็นใครก็ได้ (ไม่ต้องเป็นหัวหน้าในสาย)
--   • เพิ่ม "รอบกำหนดเอง" ได้ (label + จำนวนวัน)
--   • แต่ละใบประเมินแยกอิสระ — HR เห็นทุกใบ
-- ═══════════════════════════════════════════════════════════════════

-- 1) ตารางมอบหมาย
CREATE TABLE IF NOT EXISTS probation_evaluation_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,   -- ผู้ถูกประเมิน
  evaluator_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,  -- ผู้ประเมิน (ใครก็ได้)
  round INT NOT NULL,           -- 1=45วัน, 2=90วัน, 99=รอบกำหนดเอง
  label TEXT,                   -- ชื่อรอบกำหนดเอง (ถ้ามี)
  due_days INT,                 -- จำนวนวันนับจากวันเริ่มงาน (custom); null = ใช้ค่ามาตรฐานของ round
  due_date DATE,                -- กำหนดวันตรงๆ (optional)
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prob_assign_employee ON probation_evaluation_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_prob_assign_evaluator ON probation_evaluation_assignments(evaluator_id);

-- 2) เชื่อมใบประเมินกับ assignment
ALTER TABLE probation_evaluations
  ADD COLUMN IF NOT EXISTS assignment_id UUID;
CREATE INDEX IF NOT EXISTS idx_prob_eval_assignment ON probation_evaluations(assignment_id);

-- 3) ยกเลิก UNIQUE(employee_id, round) — ให้มีหลายใบต่อรอบได้
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'probation_evaluations'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) ILIKE '%employee_id%round%'
  LOOP
    EXECUTE format('ALTER TABLE probation_evaluations DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

-- 4) RLS (service role เท่านั้น — เหมือนตารางประเมิน)
ALTER TABLE probation_evaluation_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON probation_evaluation_assignments;
CREATE POLICY "Service role full access" ON probation_evaluation_assignments
  FOR ALL USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
