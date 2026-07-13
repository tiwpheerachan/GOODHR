-- ============================================================================
-- ระบบ Serial Tracking — sync ข้อมูลจาก BigQuery `pc.serial_tracking_enriched`
-- มายัง Supabase เพื่อให้พนักงาน PC สแกน serial แล้วรู้ว่าเป็นสินค้าอะไร (realtime ตามรอบ sync)
-- คอลัมน์ mirror จาก BigQuery table (elated-channel-468406-t4.pc.serial_tracking_enriched)
-- ============================================================================

CREATE TABLE IF NOT EXISTS serial_tracking (
  serial_number            TEXT PRIMARY KEY,      -- คอลัมน์ serial (คีย์หลัก — 1 serial = 1 เครื่อง)
  sku                      TEXT,
  product_name             TEXT,
  brand                    TEXT,
  canonical_variant_id     TEXT,
  sku_type                 TEXT,
  canonical_product_id     TEXT,
  canonical_brand_id       TEXT,
  canonical_product_name   TEXT,
  main_product_line        TEXT,
  variant_label            TEXT,
  category_l1              TEXT,
  category_l2              TEXT,
  category_leaf            TEXT,
  category_path            TEXT,
  canonical_master_status  TEXT,
  colour                   TEXT,
  storage                  TEXT,
  ram                      TEXT,
  sku_type_from_prefix     TEXT,
  jst_shop                 TEXT,
  shop_type                TEXT,
  -- normalized serial (uppercase, trim) สำหรับ match ตอนสแกน (กันเคสตัวพิมพ์เล็ก/ใหญ่)
  serial_norm              TEXT GENERATED ALWAYS AS (upper(btrim(serial_number))) STORED,
  synced_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- index สำหรับ lookup ตอนสแกน
CREATE INDEX IF NOT EXISTS idx_serial_tracking_norm ON serial_tracking (serial_norm);
CREATE INDEX IF NOT EXISTS idx_serial_tracking_sku  ON serial_tracking (sku);
CREATE INDEX IF NOT EXISTS idx_serial_tracking_synced ON serial_tracking (synced_at);

-- RLS: อ่านได้ทุก authenticated user (พนักงานต้องสแกนได้), เขียนผ่าน service role เท่านั้น (cron)
ALTER TABLE serial_tracking ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS serial_tracking_read ON serial_tracking;
CREATE POLICY serial_tracking_read ON serial_tracking
  FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
