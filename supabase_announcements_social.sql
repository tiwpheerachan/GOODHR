-- ══════════════════════════════════════════════════════════════
-- Announcements Social Features: Image + Reactions
-- Run AFTER supabase_announcements_migration.sql
-- ══════════════════════════════════════════════════════════════

-- Add image_url column
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Reactions table
CREATE TABLE IF NOT EXISTS announcement_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE NOT NULL,
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like','love','laugh','wow','sad')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(announcement_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_ann_react_ann ON announcement_reactions(announcement_id);
CREATE INDEX IF NOT EXISTS idx_ann_react_emp ON announcement_reactions(employee_id);

-- Storage bucket for announcement images (run in Supabase Dashboard > Storage)
-- CREATE BUCKET: announcement-images (public)
