-- ════════════════════════════════════════════════════════════════════
-- payroll_access — เพิ่ม "สิทธิ์รายบริษัท"
--   company_id = NULL  → เห็นทุกบริษัท (สิทธิ์เต็ม เหมือนเดิม)
--   company_id = <id>  → เห็นเฉพาะบริษัทนั้น
--   1 user มีได้หลายแถว (หลายบริษัท)
-- ════════════════════════════════════════════════════════════════════

-- 1) เพิ่มคอลัมน์ id (PK ใหม่) + company_id
ALTER TABLE payroll_access ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE payroll_access ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
UPDATE payroll_access SET id = gen_random_uuid() WHERE id IS NULL;

-- 2) ย้าย PK จาก user_id → id (เพื่อให้ 1 user มีหลายบริษัทได้)
--    แถวเดิม (may.pradit) company_id = NULL → ยังเห็นทุกบริษัท
ALTER TABLE payroll_access DROP CONSTRAINT IF EXISTS payroll_access_pkey;
ALTER TABLE payroll_access ADD PRIMARY KEY (id);

-- 3) กันซ้ำ (user เดิม + บริษัทเดิม) — NULLS NOT DISTINCT ให้ (user, NULL) ซ้ำไม่ได้ (PG15+)
DROP INDEX IF EXISTS payroll_access_user_company_uk;
CREATE UNIQUE INDEX payroll_access_user_company_uk
  ON payroll_access (user_id, company_id) NULLS NOT DISTINCT;

CREATE INDEX IF NOT EXISTS idx_payroll_access_user    ON payroll_access(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_access_company ON payroll_access(company_id);

NOTIFY pgrst, 'reload schema';
