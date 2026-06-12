-- ════════════════════════════════════════════════════════════════════
-- Migration: เพิ่ม attachments column สำหรับการประเมิน
--   - kpi_forms.attachments: jsonb — หลักฐาน/รูปประกอบของการประเมิน KPI
--                             (เพิ่มจาก money_reason_attachments ที่เคยมี — เก็บแยกเพราะ
--                              money_reason_attachments ใช้สำหรับ money_only เท่านั้น)
--   - probation_evaluations.attachments: jsonb — หลักฐาน/รูปประกอบของการประเมินทดลองงาน
--
-- รูปแบบข้อมูล:
--   [
--     { "url": "https://...", "name": "screenshot.png", "size": 12345 },
--     ...
--   ]
-- ════════════════════════════════════════════════════════════════════

-- KPI
ALTER TABLE kpi_forms
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN kpi_forms.attachments IS
  'หลักฐาน/รูปประกอบการประเมิน KPI (เห็นได้ทั้ง manager และ employee). Array of {url, name, size?}';

-- Probation
ALTER TABLE probation_evaluations
  ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN probation_evaluations.attachments IS
  'หลักฐาน/รูปประกอบการประเมินทดลองงาน (เห็นได้ทั้ง manager และ employee). Array of {url, name, size?}';
