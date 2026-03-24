-- ════════════════════════════════════════════════════════════════
-- KPI Bonus Settings: ฐานโบนัส KPI ของพนักงานแต่ละคน
-- เกรด A (91-100) = standard_amount * 1.2
-- เกรด B (81-90)  = standard_amount * 1.0
-- เกรด C (71-80)  = standard_amount * 0.8
-- เกรด D (0-70)   = 0
-- ════════════════════════════════════════════════════════════════

-- ── STEP 1: สร้างตาราง kpi_bonus_settings ──
CREATE TABLE IF NOT EXISTS kpi_bonus_settings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  standard_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  effective_from  DATE NOT NULL DEFAULT '2026-03-01',
  effective_to    DATE,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kpi_bonus_emp ON kpi_bonus_settings(employee_id, is_active);
CREATE INDEX IF NOT EXISTS idx_kpi_bonus_company ON kpi_bonus_settings(company_id, is_active);

-- UNIQUE: 1 active record per employee
CREATE UNIQUE INDEX IF NOT EXISTS idx_kpi_bonus_unique_active
  ON kpi_bonus_settings(employee_id) WHERE is_active = true;

ALTER TABLE kpi_bonus_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON kpi_bonus_settings;
CREATE POLICY "Service role full access" ON kpi_bonus_settings
  FOR ALL USING (true) WITH CHECK (true);

-- ── STEP 2: import ข้อมูลจาก Excel (match employee_code) ──
-- ใช้ temp table เพื่อ match employee_code กับ employees table
CREATE TEMP TABLE IF NOT EXISTS _kpi_import (
  employee_code TEXT,
  standard_amount NUMERIC(10,2)
);

TRUNCATE _kpi_import;

INSERT INTO _kpi_import (employee_code, standard_amount) VALUES
    ('64000007', 440),
    ('66000060', 1235),
    ('66000062', 1110),
    ('67000006', 1100),
    ('67000007', 1085),
    ('67000017', 11400),
    ('67000106', 3510),
    ('67000145', 2510),
    ('69000052', 2000),
    ('67000170', 2400),
    ('67000172', 2240),
    ('67000212', 3245),
    ('67000166', 11400),
    ('67000221', 2345),
    ('67000194', 3315),
    ('67000222', 2375),
    ('68000236', 2000),
    ('67000234', 2460),
    ('67000239', 2180),
    ('68000016', 2220),
    ('68000023', 2300),
    ('66000015', 710),
    ('66000134', 1200),
    ('68000091', 3185),
    ('68000107', 3175),
    ('68000259', 3000),
    ('68000265', 5000),
    ('66000086', 810),
    ('67000136', 3500),
    ('67000137', 2300),
    ('67000230', 3225),
    ('68000215', 2000),
    ('67000039', 5470),
    ('67000040', 5410),
    ('67000041', 2235),
    ('67000078', 2315),
    ('67000114', 2200),
    ('67000192', 2190),
    ('67000199', 2275),
    ('67000217', 2235),
    ('67000228', 3000),
    ('67000231', 2160),
    ('67000018', 270),
    ('68000098', 2100),
    ('67000139', 260),
    ('68000253', 4500),
    ('67000113', 2220),
    ('65000026', 600),
    ('67000121', 150),
    ('66000081', 1840),
    ('67000030', 220),
    ('67000155', 205),
    ('66000043', 195),
    ('66000057', 580),
    ('66000065', 210),
    ('66000090', 370),
    ('67000025', 2090),
    ('67000206', 180),
    ('67000138', 5067),
    ('64000108', 480),
    ('66000155', 700),
    ('66000034', 2095),
    ('66000158', 6000),
    ('67000099', 2200),
    ('68000068', 1135),
    ('68000069', 2110),
    ('68000095', 5240),
    ('68000097', 25130),
    ('68000110', 2035),
    ('68000158', 5000),
    ('68000162', 20000),
    ('68000176', 5000),
    ('68000188', 5000),
    ('68000212', 15000),
    ('68000213', 15000),
    ('66000131', 2240),
    ('66000037', 5280),
    ('68000159', 2000),
    ('67000056', 5340),
    ('68000199', 2000),
    ('69000045', 5000),
    ('68000198', 40000),
    ('68000109', 4000),
    ('68000245', 3000),
    ('68000251', 10000),
    ('69000037', 2000),
    ('64000109', 510),
    ('66000059', 640),
    ('64000109', 3670),
    ('67000043', 4180),
    ('67000044', 6460),
    ('67000058', 8000),
    ('67000111', 2355),
    ('67000144', 2290),
    ('67000235', 5420),
    ('68000190', 3000),
    ('68000183', 2000),
    ('68000088', 3035),
    ('66000012', 2170),
    ('66000067', 5280),
    ('68000182', 2000),
    ('68000202', 5000),
    ('69000040', 2000),
    ('63000021', 3470),
    ('62000002', 4000),
    ('63000007', 3250),
    ('63000030', 3240),
    ('64000037', 3200),
    ('65000004', 3180),
    ('66000017', 3210),
    ('66000069', 3210),
    ('67000077', 3225),
    ('67000135', 5140),
    ('68000151', 2000),
    ('68000237', 2000),
    ('67000146', 2240),
    ('68000252', 3500),
    ('67000200', 2220),
    ('67000211', 3495),
    ('68000179', 1260),
    ('68000178', 1260),
    ('68000180', 1190),
    ('67000104', 2100),
    ('67000101', 2130),
    ('67000195', 2085),
    ('67000224', 2175),
    ('67000233', 2175),
    ('68000015', 2080),
    ('68000119', 2030),
    ('66000035', 3000),
    ('68000145', 2015),
    ('68000188', 2000),
    ('68000026', 2000);

-- ── STEP 3: INSERT เข้า kpi_bonus_settings (match กับ employees) ──
-- ใช้ subquery deduplicate ก่อน INSERT (กันรหัสซ้ำ เช่น 64000109, 68000188 → เอาค่าสูงสุด)
INSERT INTO kpi_bonus_settings (employee_id, company_id, standard_amount, effective_from, is_active)
SELECT
  sub.employee_id,
  sub.company_id,
  sub.standard_amount,
  '2026-03-01'::date,
  true
FROM (
  SELECT DISTINCT ON (e.id)
    e.id AS employee_id,
    e.company_id,
    ki.standard_amount
  FROM _kpi_import ki
  JOIN employees e ON e.employee_code = ki.employee_code
  ORDER BY e.id, ki.standard_amount DESC
) sub
ON CONFLICT (employee_id) WHERE is_active = true
DO UPDATE SET
  standard_amount = EXCLUDED.standard_amount,
  updated_at = now();

-- ── STEP 4: ตรวจสอบผลลัพธ์ ──
DO $$
DECLARE
  total_imported INT;
  total_input INT;
  r RECORD;
BEGIN
  SELECT COUNT(*) INTO total_input FROM _kpi_import;
  SELECT COUNT(*) INTO total_imported FROM kpi_bonus_settings WHERE is_active = true;

  RAISE NOTICE '══════ KPI Bonus Import Results ══════';
  RAISE NOTICE 'ข้อมูล input: % คน', total_input;
  RAISE NOTICE 'import สำเร็จ: % คน', total_imported;
  RAISE NOTICE '';

  -- แสดงตัวที่ไม่ match
  FOR r IN
    SELECT ki.employee_code, ki.standard_amount
    FROM _kpi_import ki
    LEFT JOIN employees e ON e.employee_code = ki.employee_code
    WHERE e.id IS NULL
  LOOP
    RAISE NOTICE '⚠ ไม่พบพนักงาน: % (KPI=% บาท)', r.employee_code, r.standard_amount;
  END LOOP;

  -- สรุปตามบริษัท
  RAISE NOTICE '';
  FOR r IN
    SELECT c.code AS company_code, COUNT(*) AS cnt,
           SUM(kb.standard_amount) AS total_kpi,
           MIN(kb.standard_amount) AS min_kpi,
           MAX(kb.standard_amount) AS max_kpi
    FROM kpi_bonus_settings kb
    JOIN companies c ON c.id = kb.company_id
    WHERE kb.is_active = true
    GROUP BY c.code
    ORDER BY c.code
  LOOP
    RAISE NOTICE '% : % คน | รวม % | ต่ำสุด % | สูงสุด %',
      r.company_code, r.cnt, r.total_kpi, r.min_kpi, r.max_kpi;
  END LOOP;
END $$;

-- ── Cleanup ──
DROP TABLE IF EXISTS _kpi_import;
