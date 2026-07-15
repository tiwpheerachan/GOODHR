-- ════════════════════════════════════════════════════════════════════
-- stock_items — สต๊อกรายซีเรียลต่อสาขา (serial-level inventory ledger)
--   1 serial = 1 หน่วยสินค้า = 1 แถว
--   สแกนรับเข้า → status 'in_stock' ที่สาขานั้น
--   ขายออก (มี serial) → ระบบตัดเป็น 'sold' อัตโนมัติ
--   สรุปสต๊อก = นับ in_stock ต่อสาขา ต่อสินค้า
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS stock_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  branch_name   TEXT,                                  -- snapshot (เผื่อไม่มี branch_id)
  serial_number TEXT NOT NULL,
  serial_norm   TEXT GENERATED ALWAYS AS (upper(btrim(serial_number))) STORED,
  barcode       TEXT,
  sku           TEXT,
  product_name  TEXT,
  brand         TEXT,
  image_url     TEXT,
  status        TEXT NOT NULL DEFAULT 'in_stock',      -- in_stock | sold | removed
  in_by         UUID REFERENCES employees(id) ON DELETE SET NULL,
  in_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_id       UUID,                                  -- product_sales.id เมื่อขายออก
  sold_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  sold_at       TIMESTAMPTZ,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (serial_norm)                                 -- 1 serial มีได้แถวเดียว (ทั้งระบบ)
);

CREATE INDEX IF NOT EXISTS idx_stock_items_branch_status ON stock_items(branch_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_items_company_status ON stock_items(company_id, status);
CREATE INDEX IF NOT EXISTS idx_stock_items_barcode        ON stock_items(barcode);
CREATE INDEX IF NOT EXISTS idx_stock_items_sku            ON stock_items(sku);

ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;  -- เขียน/อ่านผ่าน service role (API) เท่านั้น

-- ── ตัดสต๊อกเมื่อขายออก (atomic) → คืนจำนวนที่ตัด (0 = serial นี้ไม่มีในสต๊อก) ──
CREATE OR REPLACE FUNCTION mark_stock_sold(p_serial TEXT, p_sale UUID, p_sold_by UUID)
RETURNS INT LANGUAGE plpgsql AS $$
DECLARE n INT;
BEGIN
  UPDATE stock_items
     SET status='sold', sale_id=p_sale, sold_by=p_sold_by, sold_at=now(), updated_at=now()
   WHERE serial_norm = upper(btrim(p_serial)) AND status='in_stock';
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;

NOTIFY pgrst, 'reload schema';
