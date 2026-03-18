-- ============================================================
-- Migration: เพิ่มช่องรายรับ/รายหักเพิ่มเติมใน payroll_records
-- รองรับ: KPI, Commission, Incentive, ค่าบริการ, ค่าน้ำมัน,
--         กรมบังคับคดี, กยศ., สินค้าพนักงาน ฯลฯ
-- ============================================================

-- income_extras: เก็บรายรับเพิ่มเติมที่ไม่ได้อยู่ใน column หลัก
-- เช่น { "kpi": 5000, "commission": 3000, "incentive": 2000 }
ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS income_extras  JSONB DEFAULT '{}'::jsonb;

-- deduction_extras: เก็บรายหักเพิ่มเติมที่ไม่ได้อยู่ใน column หลัก
-- เช่น { "card_lost": 200, "student_loan": 1500 }
ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS deduction_extras JSONB DEFAULT '{}'::jsonb;

-- เพิ่ม brand ใน employees (ถ้ายังไม่มี)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS brand TEXT DEFAULT NULL;

-- ============================================================
-- INDEX สำหรับ query
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_payroll_income_extras  ON payroll_records USING gin (income_extras);
CREATE INDEX IF NOT EXISTS idx_payroll_deduction_extras ON payroll_records USING gin (deduction_extras);

-- ============================================================
-- Key mapping (อ้างอิง)
-- ============================================================
-- income_extras keys:
--   kpi, commission, incentive, performance_bonus,
--   service_fee, depreciation, expressway, fuel,
--   campaign, retirement_fund, per_diem,
--   diligence_bonus, referral_bonus
--
-- deduction_extras keys:
--   suspension, card_lost, uniform, parking,
--   employee_products, legal_enforcement, student_loan
-- ============================================================
