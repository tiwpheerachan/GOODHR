-- ════════════════════════════════════════════════════════════════════
-- TRAINING / LMS SYSTEM x GoodHR
-- ════════════════════════════════════════════════════════════════════
-- Channels (per brand / supervisor) → Courses → Modules + Quizzes
-- Plus: Question Bank, Video Checkpoints, Enrollments, Progress,
-- Quiz Attempts, Feedback, KPI Links, Permissions
-- ════════════════════════════════════════════════════════════════════

-- 1) Channels — ช่อง (แยกตาม brand หรือหัวหน้า)
CREATE TABLE IF NOT EXISTS training_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  brand TEXT,
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  owner_id UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_channels_company ON training_channels(company_id);
CREATE INDEX IF NOT EXISTS idx_training_channels_owner ON training_channels(owner_id);

-- 2) Courses — หลักสูตร
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES training_channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  open_date DATE,
  close_date DATE,
  passing_score NUMERIC(5,2) DEFAULT 70,
  max_retries INT DEFAULT 3,
  affect_kpi BOOLEAN DEFAULT false,
  kpi_weight NUMERIC(5,2) DEFAULT 0,
  version INT DEFAULT 1,
  parent_course_id UUID REFERENCES training_courses(id),
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_courses_channel ON training_courses(channel_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_status ON training_courses(status);

-- 3) Modules / Lessons — บทเรียน
CREATE TABLE IF NOT EXISTS training_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  order_no INT NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT,
  content_type TEXT DEFAULT 'mixed' CHECK (content_type IN ('video', 'document', 'quiz', 'mixed')),
  video_url TEXT,
  video_duration_sec INT,
  required_watch_pct NUMERIC(5,2) DEFAULT 80,
  documents JSONB DEFAULT '[]'::jsonb,
  estimated_minutes INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_modules_course ON training_modules(course_id, order_no);

-- 4) Question Bank — คลังคำถาม (รวมทั้ง channel)
CREATE TABLE IF NOT EXISTS training_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES training_channels(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mc', 'tf', 'fill', 'match', 'essay')),
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  points NUMERIC(5,2) DEFAULT 1,
  image_url TEXT,
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_qbank_channel ON training_question_bank(channel_id);
CREATE INDEX IF NOT EXISTS idx_training_qbank_tags ON training_question_bank USING gin (tags);

-- 5) Quizzes — ควิซ (อาจอยู่ใน module หรือ final)
CREATE TABLE IF NOT EXISTS training_quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  module_id UUID REFERENCES training_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_sec INT,
  passing_score NUMERIC(5,2) DEFAULT 70,
  max_retries INT DEFAULT 3,
  question_count INT DEFAULT 10,
  randomize BOOLEAN DEFAULT true,
  show_correct_after BOOLEAN DEFAULT true,
  use_question_bank BOOLEAN DEFAULT false,
  bank_tag_filter TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_quizzes_course ON training_quizzes(course_id);

-- 6) Questions — คำถามใน quiz (อาจอ้างอิงจาก bank หรือเฉพาะ quiz)
CREATE TABLE IF NOT EXISTS training_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES training_quizzes(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES training_question_bank(id) ON DELETE SET NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mc', 'tf', 'fill', 'match', 'essay')),
  options JSONB,
  correct_answer JSONB NOT NULL,
  explanation TEXT,
  points NUMERIC(5,2) DEFAULT 1,
  image_url TEXT,
  order_no INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_questions_quiz ON training_questions(quiz_id);

-- 7) Video Checkpoints — คำถามเด้งระหว่างวิดีโอ
CREATE TABLE IF NOT EXISTS training_video_checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  trigger_at_sec INT NOT NULL,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'mc' CHECK (question_type IN ('mc', 'tf', 'fill')),
  options JSONB,
  correct_answer JSONB NOT NULL,
  blocks_progress BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_checkpoints_module ON training_video_checkpoints(module_id, trigger_at_sec);

-- 8) Enrollments — ใครเรียนคอร์สไหน
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  enrolled_by UUID REFERENCES employees(id),
  enrolled_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'failed')),
  progress_pct NUMERIC(5,2) DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  final_score NUMERIC(5,2),
  UNIQUE (course_id, employee_id)
);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_employee ON training_enrollments(employee_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_course ON training_enrollments(course_id);

-- 9) Module Progress — % การดูแต่ละบท
CREATE TABLE IF NOT EXISTS training_module_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  watched_pct NUMERIC(5,2) DEFAULT 0,
  watch_time_sec INT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  last_position_sec INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (enrollment_id, module_id)
);

-- 10) Quiz Attempts — ครั้งที่ทำควิซ + คะแนน + tab switches
CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID NOT NULL REFERENCES training_enrollments(id) ON DELETE CASCADE,
  quiz_id UUID NOT NULL REFERENCES training_quizzes(id) ON DELETE CASCADE,
  attempt_no INT NOT NULL DEFAULT 1,
  started_at TIMESTAMPTZ DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  time_used_sec INT,
  score NUMERIC(5,2),
  passed BOOLEAN,
  tab_switches INT DEFAULT 0,
  questions JSONB,
  answers JSONB,
  graded_answers JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_training_attempts_enrollment ON training_quiz_attempts(enrollment_id);

-- 11) Feedback — ฟีดแบ็ก trainer
CREATE TABLE IF NOT EXISTS training_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  trainer_id UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (course_id, employee_id)
);

-- 12) KPI Links — เชื่อมคอร์สกับ KPI
CREATE TABLE IF NOT EXISTS training_kpi_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  kpi_item_id UUID,
  weight_pct NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 13) Permissions — สิทธิ์ admin/supervisor
CREATE TABLE IF NOT EXISTS training_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('training_admin', 'training_supervisor')),
  channel_id UUID REFERENCES training_channels(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES employees(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, role, channel_id)
);
CREATE INDEX IF NOT EXISTS idx_training_perm_employee ON training_permissions(employee_id);

-- 14) Course Versions — snapshot สำหรับ version control
CREATE TABLE IF NOT EXISTS training_course_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  version INT NOT NULL,
  snapshot JSONB NOT NULL,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 15) Tab Switch Events — บันทึกการสลับแท็บแต่ละครั้ง
CREATE TABLE IF NOT EXISTS training_tab_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES training_quiz_attempts(id) ON DELETE CASCADE,
  module_progress_id UUID REFERENCES training_module_progress(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('blur', 'focus', 'fullscreen_exit')),
  occurred_at TIMESTAMPTZ DEFAULT now()
);

-- ════════════════════════════════════════════════════════════════════
-- Storage Bucket (run separately in Storage UI หรือ via dashboard):
-- ════════════════════════════════════════════════════════════════════
-- Bucket name: training-content
-- Public: true
-- File size limit: 500 MB (สำหรับ video)
-- Allowed MIME: video/*, application/pdf, application/msword,
--               application/vnd.openxmlformats-officedocument.*, image/*
--
-- หรือใช้ SQL:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit)
-- VALUES ('training-content', 'training-content', true, 524288000)
-- ON CONFLICT (id) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════
-- Force PostgREST schema reload
-- ════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
