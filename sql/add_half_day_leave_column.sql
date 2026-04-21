-- ================================================================
-- Migration: เพิ่มคอลัมน์ half_day_leave ใน attendance_records
-- วัตถุประสงค์: บันทึกสถานะลาครึ่งวัน (morning/afternoon) ไว้ใน attendance
--              เพื่อให้ระบบไม่หักสาย/ออกก่อนเมื่อมีลาครึ่งวัน
-- วันที่: 2026-04-21
-- ================================================================

-- 1. เพิ่มคอลัมน์ half_day_leave (nullable, ค่า: 'morning' หรือ 'afternoon')
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS half_day_leave TEXT DEFAULT NULL;

-- 2. เพิ่ม check constraint เพื่อจำกัดค่า
ALTER TABLE attendance_records
ADD CONSTRAINT chk_half_day_leave_value
CHECK (half_day_leave IS NULL OR half_day_leave IN ('morning', 'afternoon'));

-- 3. เพิ่ม comment อธิบายคอลัมน์
COMMENT ON COLUMN attendance_records.half_day_leave IS
  'ลาครึ่งวัน: morning = ลาเช้า (ไม่หักสาย), afternoon = ลาบ่าย (ไม่หักออกก่อน). NULL = ไม่มีลาครึ่งวัน';

-- 4. สร้าง index สำหรับ query ที่ filter half_day_leave
CREATE INDEX IF NOT EXISTS idx_attendance_half_day_leave
ON attendance_records (half_day_leave)
WHERE half_day_leave IS NOT NULL;
