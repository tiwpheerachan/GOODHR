-- ═══════════════════════════════════════════════════════════
-- เพิ่ม 2 fields ใน salary_structures:
-- 1. is_sso_exempt (boolean) — ไม่หักประกันสังคม
-- 2. is_tax_3pct (boolean) — หักภาษี ณ ที่จ่าย 3% แทนขั้นบันได
-- ═══════════════════════════════════════════════════════════
ALTER TABLE salary_structures
  ADD COLUMN IF NOT EXISTS is_sso_exempt BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_tax_3pct BOOLEAN DEFAULT false;

-- ดูผลลัพธ์
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'salary_structures'
  AND column_name IN ('is_sso_exempt', 'is_tax_3pct');
