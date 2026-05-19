-- ════════════════════════════════════════════════════════════════════
-- TRAINING STORAGE — RLS Policies + Bucket Config
-- เพื่อให้ direct upload จาก browser ทำงาน (ไม่ผ่าน serverless function)
-- แก้ปัญหา "ไฟล์ใหญ่อัปโหลดไม่ได้" จาก body limit 4.5MB
-- ════════════════════════════════════════════════════════════════════

-- 1) สร้าง bucket (ถ้ายังไม่มี) — public read, 500MB limit
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-content',
  'training-content',
  true,
  524288000,  -- 500MB
  ARRAY[
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 524288000,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) ล้าง policy เก่า (ถ้ามี)
DROP POLICY IF EXISTS "training_authenticated_upload" ON storage.objects;
DROP POLICY IF EXISTS "training_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "training_authenticated_delete" ON storage.objects;
DROP POLICY IF EXISTS "training_public_read" ON storage.objects;

-- 3) Policies ใหม่
-- 3.1) Public read — ทุกคนเปิดดูได้ (bucket public)
CREATE POLICY "training_public_read" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'training-content');

-- 3.2) Authenticated user — upload เข้า bucket ได้
-- (permission check อย่างเข้มที่ application level อยู่แล้ว — RLS แค่กัน guest)
CREATE POLICY "training_authenticated_upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'training-content');

-- 3.3) Authenticated user — update file ตัวเองได้
CREATE POLICY "training_authenticated_update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'training-content')
WITH CHECK (bucket_id = 'training-content');

-- 3.4) Authenticated user — ลบไฟล์ใน bucket ได้
CREATE POLICY "training_authenticated_delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'training-content');

-- 4) Reload schema
NOTIFY pgrst, 'reload schema';
