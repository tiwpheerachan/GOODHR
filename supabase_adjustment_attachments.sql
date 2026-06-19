-- ════════════════════════════════════════════════════════════════════
-- Feature: แนบไฟล์/รูปภาพในคำขอแก้ไขเวลา (time_adjustment_requests)
--   • รองรับหลายไฟล์ (array) — ไม่จำกัดจำนวน (ใช้ limit 10 ที่ client)
--   • หัวหน้า + HR เห็นไฟล์แนบเหมือนใบลา
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE time_adjustment_requests
  ADD COLUMN IF NOT EXISTS attachment_url   TEXT DEFAULT NULL,        -- backward compat (ไฟล์เดี่ยว)
  ADD COLUMN IF NOT EXISTS attachment_name  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_urls  TEXT[] DEFAULT NULL,      -- หลายไฟล์
  ADD COLUMN IF NOT EXISTS attachment_names TEXT[] DEFAULT NULL;

NOTIFY pgrst, 'reload schema';

-- ── ใช้ bucket "leave-attachments" เดิม (มี policy public read แล้ว) ──

-- verify
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM information_schema.columns
  WHERE table_name = 'time_adjustment_requests'
    AND column_name IN ('attachment_url', 'attachment_name', 'attachment_urls', 'attachment_names');
  RAISE NOTICE '✓ เพิ่ม columns สำเร็จ: % / 4', n;
END $$;
