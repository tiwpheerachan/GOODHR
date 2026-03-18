-- ═══════════════════════════════════════════════════════════════════════
-- Storage Bucket: checkin-photos
-- รันใน Supabase SQL Editor (ถ้ายังไม่ได้สร้าง bucket)
-- ═══════════════════════════════════════════════════════════════════════

-- 1. สร้าง bucket (ถ้ายังไม่มี)
INSERT INTO storage.buckets (id, name, public)
VALUES ('checkin-photos', 'checkin-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Policy: authenticated users สามารถ upload ได้
CREATE POLICY "Authenticated users can upload checkin photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'checkin-photos');

-- 3. Policy: ทุกคนดูรูปได้ (public bucket)
CREATE POLICY "Public read access for checkin photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'checkin-photos');

-- 4. Policy: เจ้าของรูปหรือ service role ลบได้
CREATE POLICY "Users can delete own checkin photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'checkin-photos' AND auth.uid()::text = (storage.foldername(name))[2]);
