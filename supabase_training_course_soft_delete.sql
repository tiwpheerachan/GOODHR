-- ════════════════════════════════════════════════════════════════════
-- Training: เพิ่ม Soft Delete (Recycle Bin) ให้กับ Course
-- ════════════════════════════════════════════════════════════════════
-- ทำให้ลบคอร์สแล้วสามารถกู้คืนได้ (เหมือนช่อง)
--
--   deleted_at IS NULL    → คอร์สใช้งานอยู่ (default)
--   deleted_at IS NOT NULL → อยู่ในถังขยะ (soft-deleted แต่ข้อมูลยังอยู่ครบ)
--
-- ผู้ดูแลสามารถกดกู้คืน (set deleted_at = NULL)
-- หรือกดลบถาวร (DELETE จริง → cascade ลบ modules/quizzes/enrollments/etc.)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE training_courses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

COMMENT ON COLUMN training_courses.deleted_at IS
  'Soft-delete timestamp — NULL = ใช้งาน, NOT NULL = อยู่ในถังขยะ (กู้คืนได้)';

-- Index เพื่อ filter หา/ซ่อน คอร์สที่ถูกลบได้เร็ว
CREATE INDEX IF NOT EXISTS idx_training_courses_deleted_at
  ON training_courses(deleted_at)
  WHERE deleted_at IS NOT NULL;

NOTIFY pgrst, 'reload schema';
