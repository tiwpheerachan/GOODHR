-- ──────────────────────────────────────────────────────────────────
-- KPI: เพิ่มไฟล์/รูปแนบสำหรับโหมด "ใส่เงินเอง" (money_only)
-- หัวหน้าสามารถแปะรูป/ไฟล์ที่มาของจำนวนเงิน เพื่อให้ HR ตรวจสอบได้
-- ──────────────────────────────────────────────────────────────────

-- เก็บเป็น JSONB array: [{ "url": "https://...", "name": "screenshot.png" }, ...]
ALTER TABLE kpi_forms
  ADD COLUMN IF NOT EXISTS money_reason_attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN kpi_forms.money_reason_attachments IS
  'Array of {url, name} — ไฟล์/รูปประกอบจำนวนเงิน (โหมด money_only) สำหรับ HR ใช้ตรวจสอบที่มา';

-- (Optional) ดัชนีค้นหา เผื่ออนาคต filter โดย attachment
CREATE INDEX IF NOT EXISTS idx_kpi_forms_money_attachments
  ON kpi_forms USING gin (money_reason_attachments);

-- บังคับ PostgREST refresh schema cache (สำคัญ — ไม่งั้น API จะมองไม่เห็น column ใหม่)
NOTIFY pgrst, 'reload schema';
