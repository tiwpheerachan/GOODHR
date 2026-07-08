-- ═══════════════════════════════════════════════════════════════════
-- บทเรียนแบบ "อ่านเนื้อหาให้จบ" (reading lesson)
--   เพิ่มคอลัมน์ content เก็บเนื้อหาบทความ (Markdown-lite)
--   content_type: 'video' | 'document' | 'quiz' | 'mixed' | 'text'
--     - 'text'  → บทเรียนแบบอ่าน (ต้องเลื่อนอ่านจนจบ)  ← เพิ่มใหม่
--     - 'video' / 'mixed' → บทเรียนวิดีโอ (เดิม)
-- ═══════════════════════════════════════════════════════════════════

-- 1) คอลัมน์เนื้อหาบทความ
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS content TEXT;

-- 2) ขยาย CHECK ของ content_type ให้รองรับ 'text'
--    (ลบ constraint เดิมทุกตัวที่อ้างถึง content_type ไม่ว่าจะชื่ออะไร แล้วสร้างใหม่)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'training_modules'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%content_type%'
  LOOP
    EXECUTE format('ALTER TABLE training_modules DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE training_modules
  ADD CONSTRAINT training_modules_content_type_check
  CHECK (content_type IN ('video', 'document', 'quiz', 'mixed', 'text'));

NOTIFY pgrst, 'reload schema';
