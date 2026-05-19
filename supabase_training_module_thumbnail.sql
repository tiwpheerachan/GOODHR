-- ════════════════════════════════════════════════════════════════════
-- Training: เพิ่มภาพปกบทเรียน (Module Thumbnail)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

COMMENT ON COLUMN training_modules.thumbnail_url IS
  'URL ภาพปกของบทเรียน — แสดงในการ์ดและ video player background';

NOTIFY pgrst, 'reload schema';
