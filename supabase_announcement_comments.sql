-- Announcement Comments (Facebook-style)
-- Run this in Supabase SQL Editor

-- Drop and recreate if needed (only if no data)
DROP TABLE IF EXISTS announcement_comments;

CREATE TABLE announcement_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES announcement_comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ann_comments_ann ON announcement_comments(announcement_id, created_at);
CREATE INDEX idx_ann_comments_parent ON announcement_comments(parent_id);
