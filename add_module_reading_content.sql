-- ═══════════════════════════════════════════════════════════════════
-- บทเรียนแบบ "อ่านเนื้อหาให้จบ" (reading lesson)
--   เพิ่มคอลัมน์ content เก็บเนื้อหาบทความ (Markdown-lite)
--   content_type มีอยู่แล้ว: 'video' | 'text' | 'mixed'
--     - 'text'  → บทเรียนแบบอ่าน (ต้องเลื่อนอ่านจนจบ)
--     - 'video' / 'mixed' → บทเรียนวิดีโอ (เดิม)
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS content TEXT;

NOTIFY pgrst, 'reload schema';
