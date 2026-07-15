-- ════════════════════════════════════════════════════════════════════
-- serial_tracking — เพิ่มคอลัมน์ barcode (จาก BigQuery serial_tracking_enriched)
--   สแกนบาร์โค้ด → รู้สินค้า (เหมือนสแกนซีเรียล)
--   barcode_norm = upper(trim(barcode)) สำหรับ lookup เร็ว
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE serial_tracking ADD COLUMN IF NOT EXISTS barcode TEXT;

ALTER TABLE serial_tracking ADD COLUMN IF NOT EXISTS barcode_norm TEXT
  GENERATED ALWAYS AS (upper(btrim(barcode))) STORED;

CREATE INDEX IF NOT EXISTS idx_serial_tracking_barcode_norm
  ON serial_tracking(barcode_norm) WHERE barcode_norm IS NOT NULL;

NOTIFY pgrst, 'reload schema';

-- ⚠️ หลังรัน migration ต้อง sync แบบเต็มครั้งเดียวเพื่อเติม barcode ให้ serial เดิม:
--   GET /api/cron/sync-serial-tracking?mode=full   (Authorization: Bearer CRON_SECRET)
--   (mode=new จะไม่เติม barcode ให้ serial ที่มีอยู่แล้ว เพราะเช็คแค่ serial ใหม่)
