-- Skip-level evaluator support
-- (1) Add evaluator_role to track WHO did the evaluation
ALTER TABLE kpi_forms
  ADD COLUMN IF NOT EXISTS evaluator_role text NOT NULL DEFAULT 'direct_manager'
    CHECK (evaluator_role IN ('direct_manager','skip_level','hr_admin','additional','delegated'));

ALTER TABLE probation_evaluations
  ADD COLUMN IF NOT EXISTS evaluator_role text NOT NULL DEFAULT 'direct_manager'
    CHECK (evaluator_role IN ('direct_manager','skip_level','hr_admin','additional','delegated'));

-- (2) Additional evaluators per employee (Admin assigns extra people who can evaluate/view)
CREATE TABLE IF NOT EXISTS employee_evaluators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  evaluator_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('kpi','probation','all','view_only')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES employees(id),
  UNIQUE (employee_id, evaluator_id, scope)
);

CREATE INDEX IF NOT EXISTS idx_emp_evaluators_employee ON employee_evaluators (employee_id);
CREATE INDEX IF NOT EXISTS idx_emp_evaluators_evaluator ON employee_evaluators (evaluator_id);

COMMENT ON TABLE employee_evaluators IS 'หัวหน้าเพิ่มเติม (นอกเหนือจาก employee_manager_history) ที่สามารถประเมิน/เห็นพนักงานคนนี้ได้';
COMMENT ON COLUMN employee_evaluators.scope IS 'kpi: ประเมิน KPI ได้; probation: ประเมินทดลองงาน; all: ทั้งหมด; view_only: เห็นอย่างเดียว ประเมินไม่ได้';
