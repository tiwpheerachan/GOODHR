-- ════════════════════════════════════════════════════════════════════
-- เพิ่ม columns ข้อมูลส่วนตัวพนักงาน
--   • title_th                   — คำนำหน้าชื่อ (นาย/นาง/นางสาว/อื่นๆ)
--   • nationality                — สัญชาติ (ไทย, ลาว, อเมริกัน, ...)
--   • religion                   — ศาสนา (พุทธ/อิสลาม/คริสต์/ฮินดู/อื่นๆ)
--   • emergency_contact_name     — ชื่อผู้ติดต่อกรณีฉุกเฉิน
--   • emergency_contact_phone    — เบอร์ผู้ติดต่อกรณีฉุกเฉิน
--   • emergency_contact_relation — ความสัมพันธ์ (พ่อ/แม่/พี่/น้อง/สามี/ภรรยา/...)
--
--   หมายเหตุ: birth_date, gender มีอยู่แล้ว — อายุคำนวณจาก birth_date ใน UI
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS title_th                   TEXT,
  ADD COLUMN IF NOT EXISTS nationality                TEXT DEFAULT 'ไทย',
  ADD COLUMN IF NOT EXISTS religion                   TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_name     TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone    TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact_relation TEXT;

NOTIFY pgrst, 'reload schema';

-- verify
DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM information_schema.columns
  WHERE table_name = 'employees'
    AND column_name IN ('title_th', 'nationality', 'religion',
                        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation');
  RAISE NOTICE '✓ เพิ่ม columns สำเร็จ: % / 6', n;
END $$;
