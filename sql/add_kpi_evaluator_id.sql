-- ═══════════════════════════════════════════════════════════════════
-- เพิ่มคอลัมน์ kpi_evaluator_id ในตาราง employees
-- ใช้สำหรับกำหนดผู้ประเมิน KPI แยกจากหัวหน้า
-- ค่าเริ่มต้น = NULL (ใช้หัวหน้าปัจจุบันเป็นผู้ประเมินตามเดิม)
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- เพิ่มคอลัมน์
ALTER TABLE employees ADD COLUMN IF NOT EXISTS kpi_evaluator_id UUID REFERENCES employees(id);

-- เพิ่ม index สำหรับ lookup
CREATE INDEX IF NOT EXISTS idx_employees_kpi_evaluator ON employees(kpi_evaluator_id) WHERE kpi_evaluator_id IS NOT NULL;

-- ตรวจสอบ
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'kpi_evaluator_id';
