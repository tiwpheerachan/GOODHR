-- ════════════════════════════════════════════════════════════════════
-- barcode_products — รายละเอียดสินค้าราย barcode (sync จาก BigQuery pc.barcode_products)
--   สแกนบาร์โค้ด → เห็นรายละเอียดสินค้า (ชื่อ/แบรนด์/รุ่น/สี/หมวด/ราคา)
--   1 barcode = 1 สินค้า (ตารางเล็ก ~323 แถว → sync เต็มทุกรอบได้)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS barcode_products (
  barcode                 TEXT PRIMARY KEY,
  barcode_norm            TEXT GENERATED ALWAYS AS (upper(btrim(barcode))) STORED,
  sku                     TEXT,
  product_name            TEXT,
  brand                   TEXT,
  sale_price              NUMERIC,
  picture_url             TEXT,
  sku_type_from_prefix    TEXT,
  alt_skus                TEXT,
  canonical_variant_id    TEXT,
  canonical_product_id    TEXT,
  canonical_brand_id      TEXT,
  canonical_product_name  TEXT,
  main_product_line       TEXT,
  variant_label           TEXT,
  category_l1             TEXT,
  category_l2             TEXT,
  category_leaf           TEXT,
  category_path           TEXT,
  canonical_master_status TEXT,
  jst_category_name       TEXT,
  colour                  TEXT,
  synced_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_barcode_products_norm ON barcode_products(barcode_norm);
CREATE INDEX IF NOT EXISTS idx_barcode_products_sku  ON barcode_products(sku);

-- RLS: อ่านได้ (authenticated) — เขียนผ่าน service role (sync) เท่านั้น
ALTER TABLE barcode_products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS barcode_products_read ON barcode_products;
CREATE POLICY barcode_products_read ON barcode_products FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
