-- ============================================================
-- GOODHR: ขั้นตอน "ขออนุญาตลาออก" ก่อนกรอกฟอร์มลาออก
--   เพิ่มสถานะก่อนหน้า: pending_intent → intent_approved → (pending_manager → pending_hr → approved)
--   พนักงานยื่นคำขอ → HR เปิดสิทธิ์ → พนักงานถึงกรอกฟอร์มลาออกได้
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

-- 1) คอลัมน์ใหม่
ALTER TABLE resignation_requests
  ADD COLUMN IF NOT EXISTS intent_reason      TEXT,
  ADD COLUMN IF NOT EXISTS intent_approved_at TIMESTAMPTZ;

-- 2) ขยาย CHECK constraint ของ status ให้รับสถานะใหม่ (pending_intent, intent_approved)
--    (ตารางมี constraint นี้อยู่ — ต้อง drop แล้ว add ใหม่)
ALTER TABLE resignation_requests DROP CONSTRAINT IF EXISTS resignation_requests_status_check;
ALTER TABLE resignation_requests
  ADD CONSTRAINT resignation_requests_status_check
  CHECK (status IN ('pending_intent','intent_approved','pending_manager','pending_hr','approved','rejected','cancelled'));

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ตรวจค่าที่มีอยู่ (กันมี status อื่นที่ไม่อยู่ใน list ทำให้ ADD CONSTRAINT ล้มเหลว):
--   SELECT status, count(*) FROM resignation_requests GROUP BY status;
-- ถ้ามีค่าอื่น ให้เพิ่มค่านั้นเข้าไปใน CHECK ด้านบนด้วย
