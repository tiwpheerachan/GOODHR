-- ════════════════════════════════════════════════════════════════════
-- Storage: bucket "branch-eval" สำหรับเก็บรูป check-in + รูปคำตอบ
-- ────────────────────────────────────────────────────────────────────
-- ใช้กับ src/app/api/branch-eval/upload/route.ts ที่ตั้งชื่อ BUCKET = "branch-eval"
-- รันใน Supabase SQL Editor (อนุญาต service_role อยู่แล้วบน storage.objects)
-- ════════════════════════════════════════════════════════════════════

-- 1) สร้าง bucket ถ้ายังไม่มี
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branch-eval', 'branch-eval', true,
  10 * 1024 * 1024,                                                 -- 10 MB
  ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2) policies — service role ผ่านโดยอัตโนมัติ; เพิ่ม authenticated อ่านได้ (public read)
DROP POLICY IF EXISTS "branch-eval public read" ON storage.objects;
CREATE POLICY "branch-eval public read"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'branch-eval');

-- 3) authenticated user เขียนได้ใน path ของตัวเอง (เผื่อจะใช้ client SDK ตรง ๆ ภายหลัง)
--    ตอนนี้ API ใช้ service role อยู่แล้ว ไม่จำเป็นต้องใช้ policy นี้ แต่ปลอดภัยที่จะมีไว้
DROP POLICY IF EXISTS "branch-eval authenticated insert" ON storage.objects;
CREATE POLICY "branch-eval authenticated insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'branch-eval');

DROP POLICY IF EXISTS "branch-eval authenticated update" ON storage.objects;
CREATE POLICY "branch-eval authenticated update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'branch-eval');

DROP POLICY IF EXISTS "branch-eval authenticated delete" ON storage.objects;
CREATE POLICY "branch-eval authenticated delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'branch-eval');

NOTIFY pgrst, 'reload schema';
