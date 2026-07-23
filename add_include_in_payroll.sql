-- ═══════════════════════════════════════════════════════════════════
-- เพิ่มสวิตช์ "คิดในเงินเดือนไหม" ต่อพนักงาน
--   include_in_payroll = true  → คิด/แสดงในหน้าเงินเดือน (ค่าเริ่มต้น)
--   include_in_payroll = false → มีชื่อในระบบ แต่ไม่สร้าง record / ไม่โผล่ในหน้าเงินเดือน + Excel
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS include_in_payroll boolean NOT NULL DEFAULT true;

-- (พนักงานเดิมทั้งหมด = คิดเงินเดือนตามปกติ ผ่าน DEFAULT true)
NOTIFY pgrst, 'reload schema';
