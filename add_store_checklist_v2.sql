-- ════════════════════════════════════════════════════════════════════
-- เช็คลิสต์ร้านค้า v2 — แนบไฟล์ทุกชนิด + ถังขยะ (soft-delete)
--   ต้องรัน add_store_checklist.sql (v1) มาก่อน
-- ════════════════════════════════════════════════════════════════════

-- 1) คอลัมน์ใหม่บน submissions
ALTER TABLE store_checklist_submissions
  ADD COLUMN IF NOT EXISTS files      JSONB       NOT NULL DEFAULT '[]'::jsonb,  -- ไฟล์แนบอื่น [{url, storage_path, name, mime, size}]
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;                                -- ถังขยะ (NULL = ปกติ)
CREATE INDEX IF NOT EXISTS idx_sc_sub_deleted ON store_checklist_submissions(deleted_at);

-- 2) bucket เฉพาะเช็คลิสต์ (รับทุกชนิดไฟล์ + สูงสุด 100 MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('store-checklist', 'store-checklist', true, 104857600, NULL)   -- 100 MB · NULL = ทุก mime
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- public read
DROP POLICY IF EXISTS "store-checklist public read" ON storage.objects;
CREATE POLICY "store-checklist public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'store-checklist');

-- authenticated upload/update/delete (จริงๆ อัปผ่าน service role ใน API อยู่แล้ว)
DROP POLICY IF EXISTS "store-checklist auth write" ON storage.objects;
CREATE POLICY "store-checklist auth write" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-checklist');
DROP POLICY IF EXISTS "store-checklist auth update" ON storage.objects;
CREATE POLICY "store-checklist auth update" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'store-checklist');

NOTIFY pgrst, 'reload schema';
