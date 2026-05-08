-- Add evaluation_type and incentive/bonus fields to kpi_forms
-- Backward compatible: defaults preserve existing 'standard' behavior

ALTER TABLE kpi_forms
  ADD COLUMN IF NOT EXISTS evaluation_type text NOT NULL DEFAULT 'standard'
    CHECK (evaluation_type IN ('standard','money_only','grade_incentive')),
  ADD COLUMN IF NOT EXISTS incentive_amount numeric(10,2),
  ADD COLUMN IF NOT EXISTS bonus_amount     numeric(10,2),
  ADD COLUMN IF NOT EXISTS bonus_reason     text,
  ADD COLUMN IF NOT EXISTS money_reason     text;

-- Helpful index for HR queries by mode
CREATE INDEX IF NOT EXISTS idx_kpi_forms_evaluation_type ON kpi_forms (evaluation_type);
