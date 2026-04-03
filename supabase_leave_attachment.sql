-- ============================================================
-- เพิ่ม column สำหรับแนบไฟล์ใบลา (ไม่บังคับ)
-- รันใน Supabase SQL Editor
-- ============================================================

ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS attachment_url  TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS attachment_name TEXT DEFAULT NULL;

-- เพิ่ม Storage bucket สำหรับไฟล์แนบใบลา (ถ้ายังไม่มี)
INSERT INTO storage.buckets (id, name, public)
VALUES ('leave-attachments', 'leave-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users สามารถอัปโหลดได้
CREATE POLICY IF NOT EXISTS "Allow authenticated upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'leave-attachments');

-- Policy: ทุกคนอ่านได้ (public bucket)
CREATE POLICY IF NOT EXISTS "Allow public read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'leave-attachments');
