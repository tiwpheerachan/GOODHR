-- ════════════════════════════════════════════════════════════════════
-- Feature: เช็คอินแนบรูปภาพ (ในรัศมีสาขาเท่านั้น)
-- ────────────────────────────────────────────────────────────────────
-- เพิ่ม column สำหรับเก็บรูปและที่อยู่ของการเช็คอิน/เอ้าท์
--   • clock_in_photo_url    — รูปตอนเช็คอิน (in-radius + selfie + stamp)
--   • clock_out_photo_url   — รูปตอนเช็คเอ้าท์
--   • clock_in_address      — ที่อยู่จาก reverse geocode (สำหรับแสดงผล)
--   • clock_out_address     — ที่อยู่ตอนเช็คเอ้าท์
--   • clock_in_with_photo   — flag บอกว่าเป็นการเช็คอินด้วยรูป
--   • clock_out_with_photo
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS clock_in_photo_url   TEXT,
  ADD COLUMN IF NOT EXISTS clock_out_photo_url  TEXT,
  ADD COLUMN IF NOT EXISTS clock_in_address     TEXT,
  ADD COLUMN IF NOT EXISTS clock_out_address    TEXT,
  ADD COLUMN IF NOT EXISTS clock_in_with_photo  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS clock_out_with_photo BOOLEAN DEFAULT false;

-- index สำหรับ filter ฟอร์มที่มีรูปแนบ
CREATE INDEX IF NOT EXISTS idx_attendance_with_photo_in
  ON attendance_records(work_date) WHERE clock_in_with_photo = true;
CREATE INDEX IF NOT EXISTS idx_attendance_with_photo_out
  ON attendance_records(work_date) WHERE clock_out_with_photo = true;

NOTIFY pgrst, 'reload schema';

-- verify
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM information_schema.columns
  WHERE table_name = 'attendance_records'
    AND column_name IN ('clock_in_photo_url', 'clock_out_photo_url', 'clock_in_address', 'clock_out_address', 'clock_in_with_photo', 'clock_out_with_photo');
  RAISE NOTICE '✓ เพิ่ม columns สำเร็จ: % / 6', n;
END $$;
