-- ════════════════════════════════════════════════════════════════════
-- KPI bonus (standard_amount) แบบมีวันที่มีผล (effective date)
--   ปรับ KPI ขึ้น → เลือกได้ว่ามีผลรอบไหน (ไม่ย้อนหลัง)
--   payroll เลือกแถวที่ effective_from <= สิ้นรอบ (ล่าสุด)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE kpi_bonus_settings
  ADD COLUMN IF NOT EXISTS effective_from DATE,
  ADD COLUMN IF NOT EXISTS effective_to   DATE;

-- backfill แถวเดิมให้มีผลตั้งแต่นานมาแล้ว (กันหลุดตอน payroll กรอง)
UPDATE kpi_bonus_settings
SET effective_from = COALESCE(effective_from, created_at::date, DATE '2000-01-01')
WHERE effective_from IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_bonus_eff ON kpi_bonus_settings(employee_id, effective_from DESC);

NOTIFY pgrst, 'reload schema';
