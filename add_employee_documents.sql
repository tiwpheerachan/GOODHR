-- ============================================================================
-- เก็บเอกสารของพนักงาน (employee_documents)
--   อัปโหลดหลายไฟล์พร้อมกัน · ตั้งชื่อเอกสารได้ (ถ้าไม่ตั้ง = ใช้ชื่อไฟล์)
--   ไฟล์เก็บใน Supabase Storage bucket "employee-documents" (public)
-- ============================================================================

CREATE TABLE IF NOT EXISTS employee_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id   UUID,
  name         TEXT NOT NULL,           -- ชื่อเอกสาร (ตั้งเอง หรือ default = ชื่อไฟล์)
  file_url     TEXT NOT NULL,           -- public URL
  file_name    TEXT,                    -- ชื่อไฟล์ต้นฉบับ
  file_size    BIGINT,
  file_type    TEXT,                    -- mime type
  storage_path TEXT,                    -- path ใน bucket (ไว้ลบไฟล์ตอนลบเอกสาร)
  uploaded_by  UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_documents_emp ON employee_documents (employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_created ON employee_documents (created_at DESC);

-- RLS: อ่านได้ทุก authenticated (เข้าถึงจริงผ่าน service role API), เขียนผ่าน service role เท่านั้น
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS employee_documents_read ON employee_documents;
CREATE POLICY employee_documents_read ON employee_documents
  FOR SELECT TO authenticated USING (true);

-- หมายเหตุ: bucket "employee-documents" ถูกสร้างอัตโนมัติจาก API route ครั้งแรกที่อัปโหลด
--          (public, จำกัด 20 MB, รองรับ รูปภาพ/PDF/Word/Excel/CSV/ข้อความ)

NOTIFY pgrst, 'reload schema';
