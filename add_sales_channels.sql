-- ════════════════════════════════════════════════════════════════════
-- sales_channels — ช่องทางขาย (แอดมินจัดการ, พนักงานเลือกจากลิสต์ กันพิมพ์ไม่ตรง)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS sales_channels (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  sort_order INT  NOT NULL DEFAULT 0,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO sales_channels (name, sort_order) VALUES
  ('Brand Shop', 1), ('CDS', 2), ('Dealer', 3), ('Power Buy', 4)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE sales_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sales_channels_read ON sales_channels;
CREATE POLICY sales_channels_read ON sales_channels FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';
