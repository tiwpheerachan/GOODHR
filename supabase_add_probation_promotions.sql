-- ════════════════════════════════════════════════════════════════════
-- เพิ่มตาราง employee_probation_promotions
-- เก็บค่าที่จะใช้เมื่อพนักงานผ่านทดลองงาน
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS employee_probation_promotions (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id           UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id            UUID        NOT NULL,
  -- salary
  base_salary           NUMERIC,
  allowance_position    NUMERIC,
  allowance_transport   NUMERIC,
  allowance_food        NUMERIC,
  allowance_phone       NUMERIC,
  allowance_housing     NUMERIC,
  ot_rate_normal        NUMERIC,
  ot_rate_holiday       NUMERIC,
  tax_withholding_pct   NUMERIC,
  -- position change
  new_position_id       UUID        REFERENCES positions(id),
  -- kpi
  kpi_standard_amount   NUMERIC,
  -- applied status
  is_applied            BOOLEAN     DEFAULT FALSE,
  applied_at            TIMESTAMPTZ,
  applied_by            UUID        REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  created_by            UUID        REFERENCES auth.users(id)
);

ALTER TABLE employee_probation_promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_can_manage_probation_promotions"
  ON employee_probation_promotions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('super_admin', 'hr_admin', 'manager')
    )
  );

-- ตรวจสอบ
SELECT 'employee_probation_promotions created' AS status
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'employee_probation_promotions'
);
