-- ═══════════════════════════════════════════════════════════════════
-- GOODHR: บันทึกโทษทางวินัย / ใบเตือน (Employee Discipline Records)
--   เก็บเป็น record ประวัติของพนักงานแต่ละคน — แนบรูป/ไฟล์ได้
--   แสดงในแท็บ "โทษทางวินัย/ใบเตือน" ของหน้ารายละเอียดพนักงาน (admin)
--   รันใน Supabase SQL Editor (idempotent — รันซ้ำได้)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

CREATE TABLE IF NOT EXISTS employee_discipline_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID,
  employee_id   UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  punish_date   DATE NOT NULL,            -- วันที่ได้รับโทษ
  end_date      DATE,                     -- วันที่สิ้นสุดโทษ
  offense_type  TEXT,                     -- ประเภทความผิด (เช่น วินัย)
  legal_penalty TEXT,                     -- โทษทางกฎหมาย
  penalty       TEXT,                     -- โทษ (เช่น ตัดค่าจ้าง / ตักเตือน)
  reference_doc TEXT,                     -- เอกสารอ้างอิง
  detail        TEXT,                     -- รายละเอียด
  attachments   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{url, name, size?}]
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_discipline_employee
  ON employee_discipline_records(employee_id, punish_date DESC);
CREATE INDEX IF NOT EXISTS idx_emp_discipline_company
  ON employee_discipline_records(company_id);

ALTER TABLE employee_discipline_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role full access" ON employee_discipline_records;
CREATE POLICY "Service role full access" ON employee_discipline_records
  FOR ALL USING (true) WITH CHECK (true);

COMMIT;

NOTIFY pgrst, 'reload schema';
