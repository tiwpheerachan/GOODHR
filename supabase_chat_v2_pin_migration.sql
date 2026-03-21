-- Migration: Add pinned_message_id to chat_conversations
-- Run this in Supabase SQL Editor

ALTER TABLE chat_conversations
ADD COLUMN IF NOT EXISTS pinned_message_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL;

-- Index for faster lookup
CREATE INDEX IF NOT EXISTS idx_chat_conversations_pinned ON chat_conversations(pinned_message_id) WHERE pinned_message_id IS NOT NULL;
