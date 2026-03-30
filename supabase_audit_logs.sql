-- Audit Logs — ใครทำอะไร เมื่อไหร่
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,              -- employee_id ของคนที่ทำ
  actor_name text,                     -- ชื่อ-สกุล (cache ไว้ ไม่ต้อง join)
  action text NOT NULL,                -- เช่น 'approve_leave', 'update_salary', 'calculate_payroll'
  entity_type text NOT NULL,           -- เช่น 'leave_request', 'payroll_record', 'employee'
  entity_id text,                      -- ID ของ record ที่ถูกแก้ไข
  description text,                    -- คำอธิบายสิ่งที่ทำ (ภาษาไทย)
  metadata jsonb DEFAULT '{}',         -- ข้อมูลเพิ่มเติม (old_value, new_value ฯลฯ)
  company_id uuid,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);
