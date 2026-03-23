-- ============================================================
-- GOODHR Payroll: สร้างงวดมีนาคม 2026
-- Generated: 2026-03-23
--
-- วิธีใช้:
-- 1) รัน SQL นี้ใน Supabase SQL Editor → สร้างงวด + transport_claims table
-- 2) ไปที่หน้า admin เงินเดือน → เลือกงวดมีนาคม → กด "คำนวณทั้งหมด"
--    ระบบจะดึง attendance จริง + คำนวณ SSO/tax/deductions อัตโนมัติ
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 0: ลบข้อมูลเดือนมีนาคมที่มีอยู่ (ถ้ามี)
-- ============================================================

DELETE FROM payroll_records WHERE year = 2026 AND month = 3;
DELETE FROM payroll_periods WHERE year = 2026 AND month = 3;

-- ============================================================
-- STEP 1: สร้างตาราง transport_claims (ถ้ายังไม่มี)
-- ============================================================

CREATE TABLE IF NOT EXISTS transport_claims (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id),
  company_id      UUID NOT NULL REFERENCES companies(id),
  claim_date      DATE NOT NULL,
  amount          NUMERIC(12,2) NOT NULL DEFAULT 0,
  description     TEXT,
  transport_type  TEXT DEFAULT 'other',
  origin          TEXT,
  destination     TEXT,
  receipt_url     TEXT,
  receipt_name    TEXT,
  payroll_period_id UUID REFERENCES payroll_periods(id),
  year            INT,
  month           INT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by     UUID REFERENCES employees(id),
  reviewed_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_claims_employee ON transport_claims(employee_id);
CREATE INDEX IF NOT EXISTS idx_transport_claims_company_status ON transport_claims(company_id, status);
CREATE INDEX IF NOT EXISTS idx_transport_claims_period ON transport_claims(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_transport_claims_year_month ON transport_claims(year, month);

-- ============================================================
-- STEP 2: สร้าง payroll_periods สำหรับ มีนาคม 2026 (4 บริษัท)
--         งวด: 22 ก.พ. 2026 → 21 มี.ค. 2026
--         จ่าย: 25 มี.ค. 2026
-- ============================================================

-- SHD Technology Co., Ltd.
INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
VALUES (gen_random_uuid(), 'a684555a-e44d-4441-9af8-521115cd000a', 2026, 3, 'มีนาคม 2026', '2026-02-22', '2026-03-21', '2026-03-25', 'draft');

-- Top One Service Co., Ltd.
INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
VALUES (gen_random_uuid(), '3d383dcd-9544-4b38-8cff-a37b69b9db57', 2026, 3, 'มีนาคม 2026', '2026-02-22', '2026-03-21', '2026-03-25', 'draft');

-- PTC
INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
VALUES (gen_random_uuid(), 'a24d6342-8720-42c7-bb8a-5932169274bf', 2026, 3, 'มีนาคม 2026', '2026-02-22', '2026-03-21', '2026-03-25', 'draft');

-- RABBIT
INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
VALUES (gen_random_uuid(), '03d7debf-d6d9-4b6b-afde-e8e91a3758e5', 2026, 3, 'มีนาคม 2026', '2026-02-22', '2026-03-21', '2026-03-25', 'draft');

-- ============================================================
-- STEP 3: สร้าง payroll_records ตั้งต้นจาก salary_structures
--         ★ allowance_transport = 0 (ใช้ transport_claims แทน)
--         ★ deductions = 0 (ตั้งต้น — กด "คำนวณทั้งหมด" ที่หน้า admin
--           จะดึง attendance จริงมาหัก late/absent ให้อัตโนมัติ)
-- ============================================================

INSERT INTO payroll_records (
  payroll_period_id, employee_id, company_id, year, month,
  base_salary,
  allowance_position, allowance_transport, allowance_food,
  allowance_phone, allowance_housing, allowance_other,
  ot_amount, ot_hours, ot_weekday_minutes, ot_holiday_reg_minutes, ot_holiday_ot_minutes,
  bonus, commission, other_income,
  gross_income,
  deduct_absent, deduct_late, deduct_early_out, deduct_loan, deduct_other,
  social_security_base, social_security_rate, social_security_amount,
  taxable_income, monthly_tax_withheld, ytd_tax_withheld,
  total_deductions, net_salary,
  working_days, present_days, absent_days, late_count,
  leave_paid_days, leave_unpaid_days,
  status, updated_at
)
SELECT
  pp.id,
  e.id,
  e.company_id,
  2026, 3,
  -- base salary
  COALESCE(s.base_salary, 0),
  -- allowances (★ transport = 0 → ใช้ transport_claims)
  COALESCE(s.allowance_position, 0),
  0,  -- allowance_transport = 0 (จะมาจาก transport_claims เมื่ออนุมัติ)
  COALESCE(s.allowance_food, 0),
  COALESCE(s.allowance_phone, 0),
  COALESCE(s.allowance_housing, 0),
  0,
  -- OT = 0
  0, 0, 0, 0, 0,
  -- bonus/commission/other = 0
  0, 0, 0,
  -- gross = base + position + food + phone + housing (ไม่รวม transport)
  COALESCE(s.base_salary, 0) + COALESCE(s.allowance_position, 0)
    + COALESCE(s.allowance_food, 0) + COALESCE(s.allowance_phone, 0)
    + COALESCE(s.allowance_housing, 0),
  -- deductions = 0 (ตั้งต้น → กดคำนวณจะอัพเดท)
  0, 0, 0,
  COALESCE(loan_sum.total_loan, 0),
  0,
  -- SSO
  COALESCE(s.base_salary, 0),
  0.05,
  CASE WHEN COALESCE(s.base_salary, 0) <= 0 THEN 0
    ELSE LEAST(ROUND(LEAST(GREATEST(COALESCE(s.base_salary, 0), 1650), 15000) * 0.05, 2), 875)
  END,
  -- taxable / tax (simplified — กดคำนวณจะได้ค่าที่แม่นยำกว่า)
  0, 0, 0,
  -- total_deductions = SSO + loan (ตั้งต้น)
  CASE WHEN COALESCE(s.base_salary, 0) <= 0 THEN 0
    ELSE LEAST(ROUND(LEAST(GREATEST(COALESCE(s.base_salary, 0), 1650), 15000) * 0.05, 2), 875)
  END + COALESCE(loan_sum.total_loan, 0),
  -- net = gross - SSO - loan
  (COALESCE(s.base_salary, 0) + COALESCE(s.allowance_position, 0)
    + COALESCE(s.allowance_food, 0) + COALESCE(s.allowance_phone, 0)
    + COALESCE(s.allowance_housing, 0))
  - CASE WHEN COALESCE(s.base_salary, 0) <= 0 THEN 0
      ELSE LEAST(ROUND(LEAST(GREATEST(COALESCE(s.base_salary, 0), 1650), 15000) * 0.05, 2), 875)
    END
  - COALESCE(loan_sum.total_loan, 0),
  -- stats = 0
  0, 0, 0, 0, 0, 0,
  'draft',
  now()
FROM employees e
JOIN payroll_periods pp
  ON pp.company_id = e.company_id AND pp.year = 2026 AND pp.month = 3
LEFT JOIN LATERAL (
  SELECT * FROM salary_structures ss
  WHERE ss.employee_id = e.id AND ss.effective_to IS NULL
  ORDER BY ss.effective_from DESC LIMIT 1
) s ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(el.monthly_deduction), 0) AS total_loan
  FROM employee_loans el
  WHERE el.employee_id = e.id AND el.status = 'active'
) loan_sum ON true
WHERE e.is_active = true;

-- ============================================================
-- STEP 4: สรุปผลลัพธ์
-- ============================================================

SELECT
  c.code AS company,
  pp.period_name,
  pp.start_date || ' → ' || pp.end_date AS period_range,
  (SELECT COUNT(*) FROM payroll_records pr WHERE pr.payroll_period_id = pp.id) AS employees,
  (SELECT COALESCE(SUM(pr.base_salary), 0)::TEXT FROM payroll_records pr WHERE pr.payroll_period_id = pp.id) AS total_base,
  (SELECT COALESCE(SUM(pr.net_salary), 0)::TEXT FROM payroll_records pr WHERE pr.payroll_period_id = pp.id) AS total_net
FROM payroll_periods pp
JOIN companies c ON c.id = pp.company_id
WHERE pp.year = 2026 AND pp.month = 3
ORDER BY c.code;

-- ============================================================
-- ★ ขั้นตอนถัดไป: ไปที่หน้า admin เงินเดือน
--   → เลือกแต่ละบริษัท → เลือกงวดมีนาคม 2026
--   → กดปุ่ม "คำนวณทั้งหมด"
--   ระบบจะคำนวณใหม่ทั้งหมดรวม:
--   - หักสาย (late) จาก attendance จริง
--   - หักขาดงาน (absent) จาก attendance จริง
--   - SSO + ภาษี ตามสูตรที่แม่นยำ
--   - ค่าเดินทาง จาก transport_claims ที่อนุมัติแล้ว
-- ============================================================

COMMIT;
