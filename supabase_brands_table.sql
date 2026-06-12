-- ════════════════════════════════════════════════════════════════════
-- Migration: ตาราง brands (ทั่วโลก — ใช้กับทุกบริษัท)
--   - แบรนด์ที่พนักงานดูแล (Anker, 70mai, DDpai, ...)
--   - เดิมเก็บเป็น const ใน lib/utils/brands.ts → ย้ายมาเป็น DB-driven
--   - Admin สามารถเพิ่ม/ลบ/ปรับ display_order ในหน้าตั้งค่าได้
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS brands (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text UNIQUE NOT NULL,         -- canonical name เช่น "Anker", "70mai"
  slug          text UNIQUE,                  -- lowercase + dash เช่น "70mai", "xiaomi-mg"
  color_hex     text,                         -- สี chip (เช่น "#0ea5e9")
  logo_url      text,                         -- URL รูป logo (Supabase storage หรือ external URL)
  display_order int DEFAULT 100,              -- เรียงในรายการ (เลขน้อยขึ้นก่อน)
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  CONSTRAINT brands_name_not_empty CHECK (length(trim(name)) > 0)
);

-- ─── เผื่อรันบนตารางเดิมที่ยังไม่มี logo_url ───
ALTER TABLE brands ADD COLUMN IF NOT EXISTS logo_url text;

CREATE INDEX IF NOT EXISTS idx_brands_active_order ON brands(is_active, display_order, name);

-- ─── trigger updated_at ───
CREATE OR REPLACE FUNCTION brands_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_brands_updated_at ON brands;
CREATE TRIGGER trg_brands_updated_at
  BEFORE UPDATE ON brands
  FOR EACH ROW EXECUTE FUNCTION brands_set_updated_at();

-- ─── RLS: อ่านได้ทุกคน admin จัดการได้ ───
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS brands_read_all ON brands;
CREATE POLICY brands_read_all ON brands FOR SELECT TO authenticated USING (true);

-- write policies จัดการผ่าน service role (API จะ check role เอง)

-- ─── Seed ค่าเริ่มต้นจาก lib/utils/brands.ts ───
INSERT INTO brands (name, slug, color_hex, display_order) VALUES
  ('70mai',                  '70mai',                 '#f97316',  10),
  ('Anker',                  'anker',                 '#0ea5e9',  20),
  ('DDpai',                  'ddpai',                 '#3b82f6',  30),
  ('Dreame',                 'dreame',                '#a855f7',  40),
  ('Jimmy',                  'jimmy',                 '#eab308',  50),
  ('Levoit',                 'levoit',                '#06b6d4',  60),
  ('Mibro',                  'mibro',                 '#6366f1',  70),
  ('Mova',                   'mova',                  '#10b981',  80),
  ('Soundcore',              'soundcore',             '#8b5cf6',  90),
  ('Thaimall',               'thaimall',              '#f43f5e', 100),
  ('Toptoy',                 'toptoy',                '#84cc16', 110),
  ('Uwant',                  'uwant',                 '#d946ef', 120),
  ('Vinko',                  'vinko',                 '#14b8a6', 130),
  ('Wanbo',                  'wanbo',                 '#f59e0b', 140),
  ('Xiaomi Home Appliances', 'xiaomi-home-appliances','#f97316', 150),
  ('Xiaomi MG',              'xiaomi-mg',             '#f97316', 160),
  ('Xiaomi Smart App',       'xiaomi-smart-app',      '#f97316', 170),
  ('Zepp',                   'zepp',                  '#6366f1', 180)
ON CONFLICT (name) DO NOTHING;
