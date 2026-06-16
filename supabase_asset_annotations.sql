-- ════════════════════════════════════════════════════════════════════
-- Asset Annotations — HR-local layer ทับ Feishu Bitable (read-only)
--
-- Source = Feishu Bitable (sync ดิบไม่เขียนกลับ) → HR เพิ่ม note/สถานะของตัวเองที่ joinกับ
-- record ด้วย (table_id, feishu_record_id) ได้ — เก็บแยกใน Supabase
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS asset_annotations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- key: (table_id, feishu_record_id) — UNIQUE
  table_id           text NOT NULL,
  feishu_record_id   text NOT NULL,
  -- HR fields
  hr_status          text,                -- "ตรวจแล้ว" / "รอตรวจ" / "ติดปัญหา" / "คืนแล้ว" / "พร้อมใช้" ฯลฯ
  hr_note            text,                -- หมายเหตุภายในของ HR
  hr_owner_id        uuid,                -- employee_id ของ HR ที่ดูแล (optional)
  last_checked_at    timestamptz,         -- ตรวจล่าสุดเมื่อไหร่
  last_checked_by    text,                -- ชื่อ HR ที่ตรวจ
  -- metadata
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now(),
  created_by         uuid,
  updated_by         uuid,
  UNIQUE (table_id, feishu_record_id)
);

CREATE INDEX IF NOT EXISTS idx_asset_anno_table ON asset_annotations(table_id);
CREATE INDEX IF NOT EXISTS idx_asset_anno_status ON asset_annotations(hr_status) WHERE hr_status IS NOT NULL;

-- trigger updated_at
CREATE OR REPLACE FUNCTION asset_annotations_set_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_anno_updated_at ON asset_annotations;
CREATE TRIGGER trg_asset_anno_updated_at
  BEFORE UPDATE ON asset_annotations
  FOR EACH ROW EXECUTE FUNCTION asset_annotations_set_updated_at();

-- RLS: admin/HR เขียนได้, อ่านได้ทุก authenticated
ALTER TABLE asset_annotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asset_anno_read ON asset_annotations;
CREATE POLICY asset_anno_read ON asset_annotations FOR SELECT TO authenticated USING (true);

-- write policy ใช้ service role ใน API → ไม่ต้องสร้าง policy เขียน
