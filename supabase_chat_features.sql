-- Chat Features: Typing indicator + Message reactions
-- Run this in Supabase SQL Editor

-- 1. Add typing fields to employee_online_status
ALTER TABLE employee_online_status
  ADD COLUMN IF NOT EXISTS typing_in uuid,
  ADD COLUMN IF NOT EXISTS typing_at timestamptz;

-- 2. Message reactions table
CREATE TABLE IF NOT EXISTS chat_message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  employee_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_msg ON chat_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_reactions_emp ON chat_message_reactions(employee_id);
