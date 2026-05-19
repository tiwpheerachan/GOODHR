-- ════════════════════════════════════════════════════════════════════
-- Training: บันทึกประวัติการตอบ checkpoint quiz
-- ════════════════════════════════════════════════════════════════════
-- เก็บรายละเอียดทุกครั้งที่ผู้เรียนตอบคำถามระหว่างดูวิดีโอ
-- ใช้สำหรับ HR/Admin ดูพฤติกรรมการเรียนของพนักงาน
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_checkpoint_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  checkpoint_id UUID REFERENCES training_video_checkpoints(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,            -- snapshot ของคำถาม (กันคำถามถูกแก้ภายหลัง)
  question_type TEXT NOT NULL,
  answer JSONB,                            -- คำตอบของผู้เรียน
  correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checkpoint_answers_enrollment
  ON training_checkpoint_answers(enrollment_id, module_id);
CREATE INDEX IF NOT EXISTS idx_checkpoint_answers_checkpoint
  ON training_checkpoint_answers(checkpoint_id);

NOTIFY pgrst, 'reload schema';
