-- ═══════════════════════════════════════════════════════════════════
-- GOODHR: แผนประเมินทดลองงานแบบรายคน (Per-Employee Probation Plan)
--   • employees.probation_use_custom_plan = true
--       → รอบประเมินของพนักงานคนนี้ = เฉพาะที่กำหนดใน probation_evaluation_assignments
--         (ซ่อนรอบเริ่มต้น 45/90 ทุกที่ — ฝั่งหัวหน้า + แอดมิน)
--     = false (ค่าเริ่มต้น)
--       → ใช้ 45/90 เหมือนเดิม + assignment เป็นรอบ/ผู้ประเมิน "เพิ่มเติม"
--   • probation_evaluation_assignments.evaluator_is_direct = true
--       → รอบนี้กำหนดให้ "หัวหน้าตรง" ประเมิน (resolve เป็น evaluator_id จริงตอนสร้าง)
--         ใช้แสดงป้าย "หัวหน้าตรง" ใน UI
--   Default false ทั้งคู่ → ข้อมูลเดิมทำงานเหมือนเดิม ไม่ต้อง backfill
--   รันใน Supabase SQL Editor (idempotent — รันซ้ำได้)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS probation_use_custom_plan BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE probation_evaluation_assignments
  ADD COLUMN IF NOT EXISTS evaluator_is_direct BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN employees.probation_use_custom_plan IS
  'true = ใช้แผนประเมินทดลองงานกำหนดเอง (assignment) แทนรอบเริ่มต้น 45/90; false = ใช้ 45/90 + assignment เป็นรอบเพิ่มเติม';
COMMENT ON COLUMN probation_evaluation_assignments.evaluator_is_direct IS
  'true = รอบนี้กำหนดให้หัวหน้าตรงประเมิน (evaluator_id ถูก resolve เป็นหัวหน้าตรงตอนสร้าง)';

COMMIT;

NOTIFY pgrst, 'reload schema';
