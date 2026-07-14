-- ════════════════════════════════════════════════════════════════════
-- ระเบียบข้อบังคับการทำงาน (Work Regulations) — การรับทราบ + ลงลายเซ็นยินยอม
--   employee อ่านแบบ ebook แล้วเซ็นยินยอมหน้าสุดท้าย
--   admin ดูได้ว่าใครเซ็นแล้ว/ยังไม่เซ็น
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS regulation_acknowledgements (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id     UUID REFERENCES companies(id) ON DELETE SET NULL,
  version        TEXT NOT NULL,                 -- เวอร์ชันของเอกสารที่เซ็น (re-sign เมื่อมีเวอร์ชันใหม่)
  signature_url  TEXT,                          -- ลายเซ็น PNG ใน storage
  signed_name    TEXT,                          -- ชื่อที่พิมพ์กำกับ
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, version)
);

CREATE INDEX IF NOT EXISTS idx_reg_ack_employee ON regulation_acknowledgements(employee_id);
CREATE INDEX IF NOT EXISTS idx_reg_ack_company  ON regulation_acknowledgements(company_id);
CREATE INDEX IF NOT EXISTS idx_reg_ack_version  ON regulation_acknowledgements(version);

-- RLS: อ่าน/เขียนผ่าน service role (API) เท่านั้น
ALTER TABLE regulation_acknowledgements ENABLE ROW LEVEL SECURITY;

-- พนักงานดูของตัวเองได้ (browser client)
DROP POLICY IF EXISTS reg_ack_own_select ON regulation_acknowledgements;
CREATE POLICY reg_ack_own_select ON regulation_acknowledgements
  FOR SELECT USING (
    employee_id IN (SELECT employee_id FROM users WHERE id = auth.uid())
  );

NOTIFY pgrst, 'reload schema';
