-- ═══════════════════════════════════════════════════════════════
-- เพิ่มคอลัมน์ is_attendance_exempt ในตาราง employees
-- พนักงานที่ exempt = true จะไม่ต้องเช็คอิน/เช็คเอาท์
-- ระบบจะไม่หักเงินมาสาย/ขาดงาน/ออกก่อน ทั้งสิ้น
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- STEP 1: เพิ่มคอลัมน์
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS is_attendance_exempt boolean NOT NULL DEFAULT false;

-- STEP 2: คอมเมนต์อธิบาย
COMMENT ON COLUMN employees.is_attendance_exempt IS
  'true = ไม่ต้องเช็คอิน ระบบจะไม่หักเงินมาสาย/ขาดงาน/ออกก่อน';

-- STEP 3: กำหนดให้ กันตา วรเพียรกุล (68000140) เป็น exempt
UPDATE employees
SET is_attendance_exempt = true
WHERE id = 'bd592ab4-f6a5-56da-8c9f-e16855727c08';

-- ตรวจสอบ
SELECT employee_code, first_name_th, last_name_th, is_attendance_exempt
FROM employees
WHERE id = 'bd592ab4-f6a5-56da-8c9f-e16855727c08';
