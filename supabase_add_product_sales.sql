-- ════════════════════════════════════════════════════════════════════
-- ระบบ Scan Barcode สินค้า + บันทึกยอดขายของพนักงาน PC
-- ════════════════════════════════════════════════════════════════════

-- ── 1. ตาราง products — master data ของสินค้า ──
CREATE TABLE IF NOT EXISTS products (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES companies(id) ON DELETE SET NULL,
  barcode      text UNIQUE NOT NULL,
  sku          text,
  name         text NOT NULL,
  brand        text,
  category     text,
  description  text,
  image_url    text,
  default_price numeric(12,2),
  cost_price   numeric(12,2),
  sn_required  boolean DEFAULT false,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  created_by   uuid REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- ── 2. ตาราง product_sales — บันทึกการขาย ──
CREATE TABLE IF NOT EXISTS product_sales (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id     uuid REFERENCES companies(id),
  branch_id      uuid REFERENCES branches(id),
  product_id     uuid REFERENCES products(id),
  -- snapshot ของสินค้า (เผื่อมีการแก้ไข product ภายหลัง)
  barcode        text,
  product_name   text NOT NULL,
  brand          text,
  category       text,
  sold_price     numeric(12,2) NOT NULL,
  -- ข้อมูลเพิ่มเติม (optional)
  sn             text,
  order_number   text,
  qty            int DEFAULT 1,
  note           text,
  -- timestamps
  sold_at        timestamptz DEFAULT now(),
  sold_date      date GENERATED ALWAYS AS ((sold_at AT TIME ZONE 'Asia/Bangkok')::date) STORED,
  created_at     timestamptz DEFAULT now(),
  deleted_at     timestamptz,
  deleted_by     uuid REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_employee_date ON product_sales(employee_id, sold_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_company_date ON product_sales(company_id, sold_date DESC)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_product ON product_sales(product_id)
  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_barcode ON product_sales(barcode);

-- ── 3. Trigger: updated_at สำหรับ products ──
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- ── 4. RLS policies ──
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- products: ทุกคน authenticated อ่านได้ / admin เพิ่ม-แก้-ลบ
DROP POLICY IF EXISTS "products_read_all" ON products;
CREATE POLICY "products_read_all" ON products
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "products_admin_write" ON products;
CREATE POLICY "products_admin_write" ON products
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
  );

-- product_sales: พนักงานเห็นของตัวเอง, manager เห็นทีม, admin เห็นทั้งหมด
DROP POLICY IF EXISTS "sales_read_own_or_team" ON product_sales;
CREATE POLICY "sales_read_own_or_team" ON product_sales
  FOR SELECT TO authenticated
  USING (
    -- ตัวเอง
    employee_id = (SELECT employee_id FROM users WHERE id = auth.uid())
    OR
    -- admin
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
    OR
    -- manager — เห็นลูกน้อง
    EXISTS (
      SELECT 1 FROM employee_manager_history h
      WHERE h.employee_id = product_sales.employee_id
        AND h.manager_id = (SELECT employee_id FROM users WHERE id = auth.uid())
        AND h.effective_to IS NULL
    )
  );

DROP POLICY IF EXISTS "sales_insert_own" ON product_sales;
CREATE POLICY "sales_insert_own" ON product_sales
  FOR INSERT TO authenticated
  WITH CHECK (
    employee_id = (SELECT employee_id FROM users WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "sales_update_own_or_admin" ON product_sales;
CREATE POLICY "sales_update_own_or_admin" ON product_sales
  FOR UPDATE TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
  );

DROP POLICY IF EXISTS "sales_delete_own_or_admin" ON product_sales;
CREATE POLICY "sales_delete_own_or_admin" ON product_sales
  FOR DELETE TO authenticated
  USING (
    employee_id = (SELECT employee_id FROM users WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super_admin', 'hr_admin'))
  );

-- ── 5. ตัวอย่างข้อมูล (commented — uncomment ถ้าต้อง seed) ──
-- INSERT INTO products (barcode, name, brand, category, default_price, sn_required) VALUES
--   ('8851000123456', 'DDPAI X5 Pro Dashcam', 'DDPAI', 'Dashcam', 4990, true),
--   ('8851000654321', '70mai A800S 4K', '70mai', 'Dashcam', 6990, true);
