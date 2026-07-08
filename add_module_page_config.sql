-- ═══════════════════════════════════════════════════════════════════
-- Page config สำหรับบทเรียนแบบหนังสือ (reading book)
--   page_config = array (อิง index หน้า) เก็บ:
--     • read_seconds : เวลาอ่านขั้นต่ำต่อหน้า (ตั้งหรือไม่ตั้งก็ได้)
--     • quiz         : ควิซคั่นหน้า (ตอบถูกก่อนไปหน้าถัดไป)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS page_config JSONB;

NOTIFY pgrst, 'reload schema';
