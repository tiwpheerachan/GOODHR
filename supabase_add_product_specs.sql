-- ════════════════════════════════════════════════════════════════════
-- เพิ่ม specs / model / color และ image storage สำหรับ products
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS model     text,
  ADD COLUMN IF NOT EXISTS color     text,
  ADD COLUMN IF NOT EXISTS specs     jsonb,
  ADD COLUMN IF NOT EXISTS warranty  text;

CREATE INDEX IF NOT EXISTS idx_products_model ON products(model) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin (name gin_trgm_ops);

-- Trigram extension สำหรับค้นชื่อแบบ fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── เพิ่ม policy ให้ manager เพิ่ม/แก้ products ของบริษัทตัวเอง ──
DROP POLICY IF EXISTS products_manage_admin ON products;
CREATE POLICY products_manage_admin ON products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin','hr_admin','manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('super_admin','hr_admin','manager')
    )
  );
