-- ============================================================
-- Transport Claims (ค่าเดินทาง) Table
-- ============================================================

-- สร้างตาราง transport_claims
CREATE TABLE IF NOT EXISTS transport_claims (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  company_id      UUID NOT NULL REFERENCES companies(id),

  -- ข้อมูลการเบิก
  claim_date      DATE NOT NULL,                          -- วันที่เดินทาง
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,       -- จำนวนเงิน
  description     TEXT,                                    -- รายละเอียด (เช่น เดินทางไปพบลูกค้า จ.ชลบุรี)
  transport_type  TEXT DEFAULT 'other',                    -- ประเภท: taxi, grab, personal_car, motorcycle, bus, bts_mrt, other
  origin          TEXT,                                    -- จุดเริ่มต้น
  destination     TEXT,                                    -- จุดหมาย

  -- หลักฐาน
  receipt_url     TEXT,                                    -- URL รูปสลิป/ใบเสร็จ
  receipt_name    TEXT,                                    -- ชื่อไฟล์เดิม

  -- Payroll period (เชื่อมกับงวดเงินเดือน)
  payroll_period_id UUID REFERENCES payroll_periods(id),  -- งวดเงินเดือนที่เบิก (auto-match)
  year            INT,
  month           INT,

  -- สถานะ
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES employees(id),          -- HR ที่อนุมัติ/ปฏิเสธ
  reviewed_at     TIMESTAMPTZ,
  reject_reason   TEXT,                                   -- เหตุผลที่ปฏิเสธ

  -- Timestamps
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Index สำหรับ query ที่ใช้บ่อย
CREATE INDEX IF NOT EXISTS idx_transport_claims_employee ON transport_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_transport_claims_company_status ON transport_claims(company_id, status);
CREATE INDEX IF NOT EXISTS idx_transport_claims_period ON transport_claims(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_transport_claims_year_month ON transport_claims(year, month);

-- Storage bucket สำหรับเก็บ receipts
-- (ให้รันใน Supabase Dashboard > Storage > Create bucket)
-- bucket name: transport-receipts
-- public: true

-- RLS policies (ถ้าเปิด RLS)
-- ALTER TABLE transport_claims ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Employees can view own claims" ON transport_claims FOR SELECT USING (employee_id = auth.uid());
-- CREATE POLICY "Employees can insert own claims" ON transport_claims FOR INSERT WITH CHECK (employee_id = auth.uid());
