-- ═══════════════════════════════════════════════════════════════════
-- เพิ่ม column checkin_anywhere ให้ employees
-- พนักงานที่เปิด flag นี้จะเช็คอินที่ไหนก็ได้ ไม่ต้องอิงพิกัด GPS
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS checkin_anywhere BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN employees.checkin_anywhere
IS 'เมื่อเป็น true พนักงานสามารถเช็คอิน/เช็คเอ้าท์ที่ไหนก็ได้ ไม่ตรวจสอบพิกัด GPS';
