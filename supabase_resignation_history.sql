-- ════════════════════════════════════════════════════════════════
-- Resignation History Table
-- บันทึกประวัติการลาออก / ดึงกลับ ของพนักงาน
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS resignation_history (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  action          TEXT NOT NULL CHECK (action IN ('resign', 'reinstate')),
  resign_date     DATE,
  reason          TEXT,
  previous_status TEXT,
  performed_by    UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_resign_history_emp ON resignation_history(employee_id, created_at DESC);

-- RLS
ALTER TABLE resignation_history ENABLE ROW LEVEL SECURITY;

-- Admin/HR สามารถอ่านและเขียนได้
CREATE POLICY "Service role full access" ON resignation_history
  FOR ALL USING (true) WITH CHECK (true);
