-- ============================================================
-- GOODHR: ระบบจ้างงาน 2 เฟส สำหรับพนักงาน PC (Pre-Employee + Employee)
--   Phase 1 (Pre-Employee) = 7 วันแรก จ่ายค่าจ้าง/วัน (default 500) → ลงช่อง "ค่าอื่นๆ"
--            หักภาษี 3% เท่านั้น (ไม่หัก SSO/PF)
--   Phase 2 (Employee) = พนักงานจริง เริ่มนับทดลองงาน + หัก SSO/PF ปกติ
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS pre_employment_enabled    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_employment_from       DATE,     -- วันเริ่ม Phase 1 (โดยปกติ = hire_date)
  ADD COLUMN IF NOT EXISTS pre_employment_to         DATE,     -- วันสิ้นสุด Phase 1 (7 วันปฏิทินแรก)
  ADD COLUMN IF NOT EXISTS pre_employment_daily_rate NUMERIC DEFAULT 500,  -- ค่าจ้าง Phase 1 ต่อวัน
  ADD COLUMN IF NOT EXISTS phase2_start_date         DATE;     -- วันเริ่มงานจริง (Phase 2) = anchor การนับทดลองงาน

-- กองทุนสำรองเลี้ยงชีพ (PF) — % ต่อคน (0 = ไม่หัก)
ALTER TABLE salary_structures
  ADD COLUMN IF NOT EXISTS provident_fund_pct NUMERIC DEFAULT 0;

NOTIFY pgrst, 'reload schema';

COMMIT;
