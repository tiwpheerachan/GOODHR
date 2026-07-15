-- ════════════════════════════════════════════════════════════════════
-- serial_tracking — เพิ่ม picture_url (BQ serial_tracking_enriched มีรูปแล้ว)
--   สแกนซีเรียล → เห็นรูปสินค้าด้วย
-- ⚠️ หลังรัน ต้อง sync mode=full 1 ครั้งเพื่อเติมรูปให้ serial เดิม:
--     GET /api/cron/sync-serial-tracking?mode=full   (Bearer CRON_SECRET)
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE serial_tracking ADD COLUMN IF NOT EXISTS picture_url TEXT;

NOTIFY pgrst, 'reload schema';
