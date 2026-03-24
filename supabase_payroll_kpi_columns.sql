-- ════════════════════════════════════════════════════════════════
-- เพิ่มคอลัมน์ KPI ใน payroll_records
-- kpi_grade: เกรด KPI (A/B/C/D) ที่ใช้คำนวณโบนัส
-- kpi_standard_amount: ฐาน KPI มาตรฐานของพนักงาน
-- ════════════════════════════════════════════════════════════════

ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS kpi_grade TEXT,
  ADD COLUMN IF NOT EXISTS kpi_standard_amount NUMERIC DEFAULT 0;

-- ── ตรวจสอบ ──
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payroll_records'
  AND column_name IN ('kpi_grade', 'kpi_standard_amount');
