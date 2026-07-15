-- ════════════════════════════════════════════════════════════════════
-- scan_misses — เก็บบาร์โค้ด/ซีเรียลที่ "สแกนแล้วไม่เจอสินค้า"
--   สำคัญกับยอดขาย: รู้ว่าสินค้าไหนขายแต่ยังไม่มีใน master → เอาไปเติมข้อมูล
--   1 code = 1 แถว (นับ hits + เวลาล่าสุด + ใครสแกน)
-- ════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS scan_misses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_norm         TEXT NOT NULL,                 -- upper(trim(code))
  scan_type         TEXT NOT NULL,                 -- 'barcode' | 'serial'
  sample_code       TEXT,                          -- code ดิบล่าสุดที่สแกน
  hits              INT  NOT NULL DEFAULT 1,        -- จำนวนครั้งที่สแกนไม่เจอ
  first_seen        TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_employee_id  UUID REFERENCES employees(id) ON DELETE SET NULL,
  last_company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  resolved          BOOLEAN NOT NULL DEFAULT false, -- จัดการแล้ว (เพิ่มลง master แล้ว)
  resolved_at       TIMESTAMPTZ,
  note              TEXT,
  UNIQUE (code_norm, scan_type)
);

CREATE INDEX IF NOT EXISTS idx_scan_misses_unresolved ON scan_misses(resolved, last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_scan_misses_type       ON scan_misses(scan_type);

ALTER TABLE scan_misses ENABLE ROW LEVEL SECURITY;  -- เขียน/อ่านผ่าน service role (API) เท่านั้น

-- ── upsert แบบ atomic (นับ hits) ──
CREATE OR REPLACE FUNCTION log_scan_miss(p_code TEXT, p_type TEXT, p_emp UUID, p_company UUID)
RETURNS void LANGUAGE sql AS $$
  INSERT INTO scan_misses (code_norm, scan_type, sample_code, last_employee_id, last_company_id)
  VALUES (upper(btrim(p_code)), p_type, p_code, p_emp, p_company)
  ON CONFLICT (code_norm, scan_type) DO UPDATE
    SET hits             = scan_misses.hits + 1,
        last_seen        = now(),
        sample_code      = EXCLUDED.sample_code,
        last_employee_id = EXCLUDED.last_employee_id,
        last_company_id  = EXCLUDED.last_company_id;
$$;

NOTIFY pgrst, 'reload schema';
