-- ════════════════════════════════════════════════════════════════════
-- employee_documents — จัดหมวดเอกสารตาม checklist แฟ้มประวัติพนักงาน
--   category      = Section (A–F) หรือ 'custom' (เพิ่มเอง)
--   checklist_key = หมายเลขรายการ (1–20) · NULL = เอกสารเพิ่มเองนอก checklist
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE employee_documents
  ADD COLUMN IF NOT EXISTS category      TEXT,
  ADD COLUMN IF NOT EXISTS checklist_key TEXT;

CREATE INDEX IF NOT EXISTS idx_emp_docs_checklist ON employee_documents(employee_id, checklist_key);

NOTIFY pgrst, 'reload schema';
