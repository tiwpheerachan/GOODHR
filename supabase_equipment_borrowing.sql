-- ============================================================
-- GOODHR: Equipment Borrowing System
-- Run this in Supabase SQL Editor
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- 1. เพิ่ม role equipment_admin
-- (users.role ใช้ enum type ชื่อ user_role)
-- ══════════════════════════════════════════════════════════════
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'equipment_admin';

-- ══════════════════════════════════════════════════════════════
-- 2. หมวดหมู่อุปกรณ์
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS equipment_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id  UUID NOT NULL REFERENCES companies(id),
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT DEFAULT 'Package',
  sort_order  INT DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID REFERENCES employees(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 3. รายการอุปกรณ์
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS equipment_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id    UUID NOT NULL REFERENCES companies(id),
  category_id   UUID NOT NULL REFERENCES equipment_categories(id),
  name          TEXT NOT NULL,
  description   TEXT,
  image_url     TEXT,
  total_qty     INT NOT NULL DEFAULT 1,
  available_qty INT NOT NULL DEFAULT 1,
  unit          TEXT DEFAULT 'ชิ้น',
  is_active     BOOLEAN DEFAULT true,
  created_by    UUID REFERENCES employees(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT eq_items_qty_check CHECK (available_qty >= 0 AND available_qty <= total_qty)
);

-- ══════════════════════════════════════════════════════════════
-- 4. คำขอยืมอุปกรณ์
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS equipment_requests (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id      UUID NOT NULL REFERENCES companies(id),
  employee_id     UUID NOT NULL REFERENCES employees(id),
  item_id         UUID NOT NULL REFERENCES equipment_items(id),
  qty             INT NOT NULL DEFAULT 1,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','borrowed','returned','rejected','cancelled')),
  reviewed_by     UUID REFERENCES employees(id),
  reviewed_at     TIMESTAMPTZ,
  reject_reason   TEXT,
  borrow_date     DATE,
  expected_return DATE,
  return_date     DATE,
  return_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ══════════════════════════════════════════════════════════════
-- 5. Indexes
-- ══════════════════════════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_eq_categories_company ON equipment_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_eq_items_company ON equipment_items(company_id);
CREATE INDEX IF NOT EXISTS idx_eq_items_category ON equipment_items(category_id);
CREATE INDEX IF NOT EXISTS idx_eq_items_available ON equipment_items(company_id, is_active, available_qty);
CREATE INDEX IF NOT EXISTS idx_eq_requests_employee ON equipment_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_eq_requests_company_status ON equipment_requests(company_id, status);
CREATE INDEX IF NOT EXISTS idx_eq_requests_item ON equipment_requests(item_id);

-- ══════════════════════════════════════════════════════════════
-- 6. RLS
-- ══════════════════════════════════════════════════════════════
ALTER TABLE equipment_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON equipment_categories;
CREATE POLICY "Service role full access" ON equipment_categories FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON equipment_items;
CREATE POLICY "Service role full access" ON equipment_items FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access" ON equipment_requests;
CREATE POLICY "Service role full access" ON equipment_requests FOR ALL USING (true) WITH CHECK (true);

COMMIT;
