-- ════════════════════════════════════════════════════════════════════
-- ระบบ Permission สำหรับ Product Sales + ขยายข้อมูล product_sales
-- ════════════════════════════════════════════════════════════════════

-- ── 1. เพิ่มฟิลด์ใน product_sales รองรับข้อมูลจาก Excel จริง ──
ALTER TABLE product_sales
  ADD COLUMN IF NOT EXISTS sales_channel  text,           -- เช่น "Brand Shop", "Department Store"
  ADD COLUMN IF NOT EXISTS branch_name    text,           -- ชื่อสาขา (free text — อาจไม่ match กับ branches table)
  ADD COLUMN IF NOT EXISTS source         text DEFAULT 'manual' CHECK (source IN ('manual', 'import')),
  ADD COLUMN IF NOT EXISTS imported_batch text;           -- batch id ของ import (เผื่อ rollback)

-- employee_id เป็น nullable เพื่อรองรับ historical sales จาก Excel ที่ไม่รู้คนขาย
ALTER TABLE product_sales ALTER COLUMN employee_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_channel ON product_sales(sales_channel) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_source ON product_sales(source) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_branch_name ON product_sales(branch_name) WHERE deleted_at IS NULL;

-- ── 2. ตาราง product_sale_permissions ──
CREATE TABLE IF NOT EXISTS product_sale_permissions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  uuid NOT NULL UNIQUE REFERENCES employees(id) ON DELETE CASCADE,
  access_level text NOT NULL CHECK (access_level IN ('admin', 'manager', 'staff')),
  granted_by   uuid REFERENCES employees(id),
  granted_at   timestamptz DEFAULT now(),
  note         text
);

CREATE INDEX IF NOT EXISTS idx_psp_employee ON product_sale_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_psp_level    ON product_sale_permissions(access_level);

-- ── 3. RLS ──
ALTER TABLE product_sale_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS psp_select_all ON product_sale_permissions;
CREATE POLICY psp_select_all ON product_sale_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS psp_manage_admin ON product_sale_permissions;
CREATE POLICY psp_manage_admin ON product_sale_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin','hr_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role IN ('super_admin','hr_admin'))
  );

-- ── 4. เพิ่ม column "branches catalog" สำหรับ map ชื่อ Excel → branch table ──
-- (เผื่ออนาคต — ตอนนี้ใช้ free-text ได้)
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS external_name text;  -- alias สำหรับ map กับ excel

CREATE INDEX IF NOT EXISTS idx_branches_external_name ON branches(external_name);
