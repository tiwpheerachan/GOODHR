-- กู้คืนพนักงานลาออก (ก่อนงวดเริ่ม) ให้คงอยู่ในงวดเงินเดือนนี้แบบถาวร
--   true  = HR สั่งเก็บไว้ในงวดนี้ (จ่ายเงินงวดสุดท้าย) → แสดงในตาราง ไม่ถูกซ่อน
--   false/null = ซ่อนตามปกติ (ลาออกก่อนงวด)
ALTER TABLE payroll_records
  ADD COLUMN IF NOT EXISTS keep_in_period BOOLEAN DEFAULT false;

COMMENT ON COLUMN payroll_records.keep_in_period IS
  'HR กดกู้คืนพนักงานลาออกให้คงอยู่ในงวดนี้ (จ่ายงวดสุดท้าย) — true=แสดง/จ่าย, false=ซ่อนตามปกติ';
