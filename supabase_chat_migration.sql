-- ============================================================
-- GOODHR Chat System Migration
-- User ↔ HR messaging with multi-image support
-- ============================================================

-- 1. Conversations table (1 per employee)
CREATE TABLE IF NOT EXISTS chat_conversations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id   UUID REFERENCES companies(id),
  subject      TEXT DEFAULT 'สนทนากับ HR',
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed','archived')),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id)
);

-- 2. Messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  sender_role     TEXT NOT NULL DEFAULT 'user' CHECK (sender_role IN ('user','hr_admin','super_admin')),
  message         TEXT,
  images          JSONB DEFAULT '[]'::jsonb,  -- array of image URLs
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conv_employee    ON chat_conversations(employee_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_company     ON chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_last_msg    ON chat_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv         ON chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_msg_sender       ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_unread       ON chat_messages(conversation_id, is_read) WHERE NOT is_read;

-- 4. Storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Storage policy (allow authenticated uploads)
CREATE POLICY "Allow authenticated chat image uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-images');

CREATE POLICY "Allow public chat image reads" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'chat-images');
