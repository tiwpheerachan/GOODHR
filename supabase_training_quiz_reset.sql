-- ════════════════════════════════════════════════════════════════════
-- Training: รองรับ "เรียนใหม่" หลังจากใช้สิทธิ์ควิซหมด
-- ════════════════════════════════════════════════════════════════════
-- เพิ่ม timestamp `quiz_reset_at` ใน module_progress
-- เมื่อผู้เรียนกด "เริ่มเรียนใหม่" → ตั้ง quiz_reset_at = now()
-- การนับ attempts ของ quiz จะนับเฉพาะ attempts หลัง quiz_reset_at
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE training_module_progress
  ADD COLUMN IF NOT EXISTS quiz_reset_at TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN training_module_progress.quiz_reset_at IS
  'เวลาที่ผู้เรียนกด "เริ่มเรียนใหม่" — quiz attempts ก่อนหน้านี้จะถูก ignore';

NOTIFY pgrst, 'reload schema';
