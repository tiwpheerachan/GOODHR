-- ════════════════════════════════════════════════════════════════════
-- Training: เพิ่ม Metadata ของคอร์ส (สำหรับการเรียนการสอนที่ดีขึ้น)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE training_courses
  ADD COLUMN IF NOT EXISTS learning_objectives TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS target_audience TEXT,
  ADD COLUMN IF NOT EXISTS prerequisites TEXT,
  ADD COLUMN IF NOT EXISTS estimated_minutes INT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS difficulty TEXT
    CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')) DEFAULT 'beginner';

COMMENT ON COLUMN training_courses.learning_objectives IS
  'รายการสิ่งที่ผู้เรียนจะได้รู้/ทำได้หลังเรียนจบ — bullet points';
COMMENT ON COLUMN training_courses.target_audience IS
  'กลุ่มเป้าหมายของคอร์ส (เช่น พนักงานขายใหม่)';
COMMENT ON COLUMN training_courses.prerequisites IS
  'พื้นฐานที่ควรมีก่อนเรียน';
COMMENT ON COLUMN training_courses.estimated_minutes IS
  'เวลาเรียนโดยประมาณ (นาที)';
COMMENT ON COLUMN training_courses.tags IS
  'แท็ก — ใช้สำหรับ filter / ค้นหา';
COMMENT ON COLUMN training_courses.difficulty IS
  'ระดับความยาก: beginner / intermediate / advanced';

CREATE INDEX IF NOT EXISTS idx_training_courses_tags ON training_courses USING GIN (tags);

NOTIFY pgrst, 'reload schema';
