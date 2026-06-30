-- ============================================================
-- GOODHR: เพิ่มรอบประเมินทดลองงาน "30 วันแรก" (round = 0)
-- ผ่อน CHECK constraint ของ probation_evaluations.round ให้รับ 0
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

ALTER TABLE probation_evaluations DROP CONSTRAINT IF EXISTS probation_evaluations_round_check;
ALTER TABLE probation_evaluations
  ADD CONSTRAINT probation_evaluations_round_check CHECK (round IN (0, 1, 2, 3));

COMMIT;

-- หมายเหตุ:
-- - unique (employee_id, round) และ index เดิมรองรับ round 0 อยู่แล้ว ไม่ต้องแก้
-- - ไม่ต้อง seed/backfill: ฟอร์มรอบ 0 จะถูกสร้างเมื่อหัวหน้าเริ่มประเมิน
--   พนักงานที่พ้น 30 วันแต่ยังไม่ประเมินจะขึ้น "ยังไม่ประเมิน/เลยกำหนด" ใน UI เอง
