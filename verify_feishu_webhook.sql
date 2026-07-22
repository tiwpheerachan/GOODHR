-- ═══════════════════════════════════════════════════════════════════
-- ตรวจว่า webhook auto-fire พร้อมใช้ไหม (รันใน Supabase SQL editor)
-- ═══════════════════════════════════════════════════════════════════

-- 1) pg_net เปิดอยู่ไหม (ต้องมี 1 แถว)
SELECT extname FROM pg_extension WHERE extname = 'pg_net';

-- 2) function ยิง webhook มีไหม
SELECT proname FROM pg_proc WHERE proname = 'notify_request_webhook';

-- 3) trigger ติดตั้งครบทุกตารางคำขอไหม (ควรเห็น trg_wh_* หลายอัน)
SELECT tgname AS trigger, relname AS on_table
FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
WHERE tgname LIKE 'trg_wh_%'
ORDER BY relname;

-- 4) webhook_config ตั้งค่าถูกไหม (feishu_url + enabled)
SELECT id, feishu_url, enabled, (secret IS NOT NULL) AS has_secret, updated_at
FROM webhook_config;

-- ── ถ้าข้อ 1-3 ว่าง = ยังไม่ได้รัน add_feishu_webhook.sql → รันไฟล์นั้นก่อน ──

-- 5) (ทางเลือก) ดูผลการยิงล่าสุดของ pg_net ว่าบอทตอบ 200 ไหม
SELECT id, status_code, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
