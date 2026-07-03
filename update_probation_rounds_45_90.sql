-- ============================================================
-- GOODHR: ปรับรอบประเมินทดลองงาน — การประเมิน "ใหม่" ใช้ 2 รอบ 45/90 วัน
--   round 1 = 45 วัน, round 2 = 90 วัน (นับจากวันเริ่มงานจริง)
--   *** เก็บข้อมูลประเมินเก่า (round 0/3 = 30/119 วัน) ไว้ทั้งหมด แสดงผลเหมือนเดิม ***
--   จึงคง constraint แบบ "รับได้ทั้งรอบเก่าและใหม่" (0,1,2,3) — ไม่บีบให้แคบ
--   (แอปสร้างเฉพาะรอบ 1,2 ใหม่ แต่แถวเก่าที่เป็น 0/3 ยังใช้งาน/แสดงได้)
-- รันใน Supabase SQL Editor (idempotent — รันซ้ำได้)
-- ============================================================

BEGIN;

ALTER TABLE probation_evaluations DROP CONSTRAINT IF EXISTS probation_evaluations_round_check;
ALTER TABLE probation_evaluations
  ADD CONSTRAINT probation_evaluations_round_check CHECK (round IN (0, 1, 2, 3));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ตรวจข้อมูลที่มี: SELECT round, count(*) FROM probation_evaluations GROUP BY round ORDER BY round;
