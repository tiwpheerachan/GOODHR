-- ════════════════════════════════════════════════════════════════════
-- Asset Cache — local mirror ของ Feishu Bitable เพื่อโหลดเร็ว + diff sync
--
-- Architecture:
--   asset_tables_cache:  table_id → meta (name, count, fields schema)
--   asset_records_cache: (table_id, feishu_record_id) → fields jsonb + hash
--   On sync: compare field_hash → upsert เฉพาะที่เปลี่ยน + ลบที่หายไป
-- ════════════════════════════════════════════════════════════════════

-- ─── 1) Table-level meta cache ───
CREATE TABLE IF NOT EXISTS asset_tables_cache (
  table_id          text PRIMARY KEY,
  name              text,
  count             int,
  fields            jsonb DEFAULT '[]'::jsonb,    -- field schema
  last_full_sync_at timestamptz,
  last_sync_added   int DEFAULT 0,
  last_sync_updated int DEFAULT 0,
  last_sync_deleted int DEFAULT 0,
  updated_at        timestamptz DEFAULT now()
);

-- ─── 2) Record-level cache ───
CREATE TABLE IF NOT EXISTS asset_records_cache (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id          text NOT NULL,
  feishu_record_id  text NOT NULL,
  fields            jsonb NOT NULL DEFAULT '{}'::jsonb,
  field_hash        text NOT NULL,              -- md5 ของ fields (สำหรับ diff)
  synced_at         timestamptz DEFAULT now(),
  UNIQUE (table_id, feishu_record_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_rec_table ON asset_records_cache(table_id);
CREATE INDEX IF NOT EXISTS idx_asset_rec_hash  ON asset_records_cache(table_id, field_hash);

-- ─── RLS: อ่านได้ทุก authenticated, เขียนผ่าน service role ───
ALTER TABLE asset_tables_cache  ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_records_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asset_tables_read ON asset_tables_cache;
CREATE POLICY asset_tables_read  ON asset_tables_cache  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS asset_records_read ON asset_records_cache;
CREATE POLICY asset_records_read ON asset_records_cache FOR SELECT TO authenticated USING (true);
