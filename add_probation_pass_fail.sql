-- เพิ่มผลการประเมินทดลองงาน: ผ่าน / ไม่ผ่าน (หัวหน้าติ๊กบังคับทุกรอบ)
--   true  = ผ่านทดลองงาน
--   false = ไม่ผ่านทดลองงาน
--   null  = ยังไม่ได้ระบุ (ฉบับร่างเก่า)
ALTER TABLE probation_evaluations
  ADD COLUMN IF NOT EXISTS is_passed BOOLEAN;

COMMENT ON COLUMN probation_evaluations.is_passed IS
  'ผลการประเมินทดลองงานที่หัวหน้าติ๊ก: true=ผ่าน, false=ไม่ผ่าน, null=ยังไม่ระบุ';
