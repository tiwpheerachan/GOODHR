-- ════════════════════════════════════════════════════════════════════
-- Migration: เพิ่ม brand_allocations ใน employees
--   ใช้สำหรับเก็บ % ที่พนักงานแต่ละคนทำงานให้แต่ละแบรนด์
--   ตัวอย่าง: { "Anker": 60, "DDpai": 40 }   (รวมเป็น 100)
--
--   ─ ใช้สำหรับคำนวณต้นทุนการจ้างงานต่อแบรนด์ในหน้า Dashboard > วิเคราะห์เงินเดือน
--   ─ NULL หรือว่าง → fallback: หารเท่ากันตาม employees.brand[]
--   ─ Keys ต้องอยู่ใน BRAND_OPTIONS (validated ที่ API)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS brand_allocations jsonb DEFAULT NULL;

COMMENT ON COLUMN employees.brand_allocations IS
  'อัตราส่วน % การทำงานต่อแต่ละแบรนด์ — ตัวอย่าง: {"Anker": 60, "DDpai": 40} (รวมเป็น 100). NULL = หารเท่ากันตาม brand[]';

-- index เผื่อ filter ภายหลัง (gin บน jsonb)
CREATE INDEX IF NOT EXISTS idx_employees_brand_allocations
  ON employees USING gin (brand_allocations)
  WHERE brand_allocations IS NOT NULL;
