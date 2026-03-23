-- ═══════════════════════════════════════════════════════════════
-- Chat V2 Performance Indexes
-- Run this AFTER supabase_chat_v2_migration.sql
-- These indexes optimize the most frequent query patterns
-- for thousands of concurrent users
-- ═══════════════════════════════════════════════════════════════

-- 1. Messages: Delta polling (most frequent query)
-- Covers: WHERE conversation_id = X AND created_at > Y
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created
  ON chat_messages(conversation_id, created_at DESC);

-- 2. Messages: Count by conversation (for delta delete detection)
-- Covers: SELECT count(*) WHERE conversation_id = X
-- (The index above also serves this, but a partial covering index is faster)

-- 3. Messages: Unread counting
-- Covers: WHERE conversation_id IN (...) AND is_read = false
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread
  ON chat_messages(conversation_id, is_read)
  WHERE is_read = false;

-- 4. Messages: Sender lookup for delete permission check
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender
  ON chat_messages(sender_id, id);

-- 5. Members: Conversation membership lookup (most frequent join)
-- Covers: WHERE employee_id = X, WHERE conversation_id = X
CREATE INDEX IF NOT EXISTS idx_chat_members_emp
  ON chat_members(employee_id, conversation_id);

CREATE INDEX IF NOT EXISTS idx_chat_members_conv
  ON chat_members(conversation_id, employee_id);

-- 6. Conversations: Employee's HR conversation lookup
CREATE INDEX IF NOT EXISTS idx_chat_conversations_emp_type
  ON chat_conversations(employee_id, type);

-- 7. Conversations: Company list with sort
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_lastmsg
  ON chat_conversations(company_id, last_message_at DESC NULLS LAST);

-- 8. Online status: Fast lookup
CREATE INDEX IF NOT EXISTS idx_online_status_online
  ON employee_online_status(is_online, last_seen DESC)
  WHERE is_online = true;

-- 9. Messages: Last message per conversation (for list view)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_latest
  ON chat_messages(conversation_id, created_at DESC)
  INCLUDE (message, images, sender_id, sender_role);

-- ═══════════════════════════════════════════════════════════════
-- ANALYZE tables to update query planner statistics
-- ═══════════════════════════════════════════════════════════════
ANALYZE chat_messages;
ANALYZE chat_members;
ANALYZE chat_conversations;
ANALYZE employee_online_status;
