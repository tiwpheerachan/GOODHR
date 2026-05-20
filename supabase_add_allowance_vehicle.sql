-- ════════════════════════════════════════════════════════════════════
-- เพิ่มช่อง "ค่าเสื่อมรถยนต์" (allowance_vehicle)
--   - salary_structures: ค่าเริ่มต้นของพนักงาน
--   - payroll_records:  ค่าจ่ายในแต่ละรอบ
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE salary_structures
  ADD COLUMN IF NOT EXISTS allowance_vehicle NUMERIC(12,2) DEFAULT 0;

ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS allowance_vehicle NUMERIC(12,2) DEFAULT 0;

COMMENT ON COLUMN salary_structures.allowance_vehicle IS
  'ค่าเสื่อมรถยนต์ — เงินช่วยเหลือสำหรับรถยนต์ส่วนตัวที่ใช้ในงาน';
COMMENT ON COLUMN payroll_records.allowance_vehicle IS
  'ค่าเสื่อมรถยนต์ที่จ่ายในรอบเงินเดือนนี้';

NOTIFY pgrst, 'reload schema';
