-- ============================================================
-- GOODHR Chat V2 Migration
-- Direct Messages, Group Chat, Department Channels, Online Status
-- Run this AFTER the original chat migration
-- ============================================================

-- ── 1. Add columns to chat_conversations ──
ALTER TABLE chat_conversations
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'hr'
    CHECK (type IN ('hr','direct','group','department')),
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

-- Remove the UNIQUE(employee_id) constraint so multiple conversations can exist
ALTER TABLE chat_conversations DROP CONSTRAINT IF EXISTS chat_conversations_employee_id_key;

-- Allow employee_id to be null (for group/department chats)
ALTER TABLE chat_conversations ALTER COLUMN employee_id DROP NOT NULL;

-- ── 2. Chat members table ──
CREATE TABLE IF NOT EXISTS chat_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  joined_at       TIMESTAMPTZ DEFAULT now(),
  last_read_at    TIMESTAMPTZ DEFAULT now(),
  is_muted        BOOLEAN DEFAULT false,
  UNIQUE(conversation_id, employee_id)
);

-- ── 3. Add reply_to support in messages ──
ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages(id);

-- ── 4. Online status tracking ──
CREATE TABLE IF NOT EXISTS employee_online_status (
  employee_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  is_online   BOOLEAN DEFAULT false,
  last_seen   TIMESTAMPTZ DEFAULT now()
);

-- ── 5. Indexes ──
CREATE INDEX IF NOT EXISTS idx_chat_conv_type ON chat_conversations(type);
CREATE INDEX IF NOT EXISTS idx_chat_members_conv ON chat_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_emp ON chat_members(employee_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_emp_conv ON chat_members(employee_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_employee_online ON employee_online_status(is_online) WHERE is_online = true;

-- ── 6. Migrate existing HR conversations to have members ──
INSERT INTO chat_members (conversation_id, employee_id, role)
SELECT id, employee_id, 'member'
FROM chat_conversations
WHERE employee_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM chat_members cm
    WHERE cm.conversation_id = chat_conversations.id
      AND cm.employee_id = chat_conversations.employee_id
  );

-- ── 7. Initialize online status for all employees ──
INSERT INTO employee_online_status (employee_id, is_online, last_seen)
SELECT id, false, now()
FROM employees
ON CONFLICT (employee_id) DO NOTHING;
