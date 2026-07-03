-- ============================================================
-- GOODHR: คอลัมน์เงินเดือนสำหรับกองทุน PF + การแบ่งเงินเดือน 2 เฟส
--   provident_fund   = ยอดหักกองทุนสำรองเลี้ยงชีพในรอบนั้น
--   phase1_wage      = ค่าจ้าง Pre-Employee (ก้อนที่ลงใน other_income)
--   phase1_tax       = ภาษี 3% ของค่าจ้าง Phase 1
--   phase1_work_days = จำนวนวันทำงานจริงใน Phase 1 ของรอบนั้น
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS provident_fund   NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase1_wage      NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase1_tax       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS phase1_work_days INT     DEFAULT 0;

NOTIFY pgrst, 'reload schema';

COMMIT;
