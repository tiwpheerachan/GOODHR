-- ════════════════════════════════════════════════════════════════════
-- Training: เก็บ checkpoint ที่ตอบไปแล้ว — กันไม่ให้เด้งซ้ำเมื่อกลับมาดู
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE training_module_progress
  ADD COLUMN IF NOT EXISTS answered_checkpoints JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN training_module_progress.answered_checkpoints IS
  'Array of checkpoint IDs ที่ผู้เรียนตอบแล้ว — กันเด้งซ้ำ';

NOTIFY pgrst, 'reload schema';
