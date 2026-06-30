-- ============================================================
-- GOODHR: ผู้ประเมินทดลองงานแบบกำหนดเอง (designated probation evaluator)
-- เพิ่มคอลัมน์ employees.probation_evaluator_id — ทำงานเหมือน kpi_evaluator_id
-- ถ้ากำหนด → ใช้แทนหัวหน้าตรงในการประเมินทดลองงาน (scope = probation)
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS probation_evaluator_id UUID REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_employees_probation_evaluator
  ON employees(probation_evaluator_id)
  WHERE probation_evaluator_id IS NOT NULL;

COMMIT;
