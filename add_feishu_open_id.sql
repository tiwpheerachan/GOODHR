-- ═══════════════════════════════════════════════════════════════════
-- เพิ่ม open_id ให้ feishu_users — ให้ resolve รับ open_id (ou_...) ได้
--   เหตุผล: event ตอนคนกดเมนู/ปุ่มใน Feishu ส่ง open_id มา (ไม่ใช่ user_id)
--   → เก็บ open_id (authoritative จาก Feishu API) → บอทส่ง open_id หรือ user_id ก็ resolve ถูกคน
--   ปลอดภัย: ถ้าไม่เจอ = คืน "ไม่พบพนักงาน" (ไม่มีทางแสดงข้อมูลผิดคน)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE feishu_users ADD COLUMN IF NOT EXISTS open_id TEXT;
CREATE INDEX IF NOT EXISTS idx_feishu_users_open_id ON feishu_users(open_id);
NOTIFY pgrst, 'reload schema';

-- หลังรัน: แจ้ง Claude ให้ backfill open_id ทั้งหมดจาก Feishu API
