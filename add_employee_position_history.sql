-- ============================================================
-- GOODHR: ประวัติการเปลี่ยนตำแหน่งพนักงาน
--   บันทึกทุกครั้งที่ตำแหน่งเปลี่ยน (ตำแหน่งเดิม → ตำแหน่งใหม่) พร้อมผู้แก้ไข/เวลา
--   (เงินเดือนมีประวัติใน salary_structures อยู่แล้ว — ไม่ต้องสร้างเพิ่ม)
-- รันใน Supabase SQL Editor
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS employee_position_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id),
  from_position_id UUID REFERENCES positions(id),
  to_position_id   UUID REFERENCES positions(id),
  reason TEXT,
  changed_by UUID REFERENCES employees(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_emp_position_history ON employee_position_history(employee_id, changed_at DESC);

ALTER TABLE employee_position_history ENABLE ROW LEVEL SECURITY;
-- อ่าน/เขียนได้โดยผู้ใช้ที่ login แล้ว (หน้าแอดมินใช้ browser client — จำกัดสิทธิ์แอดมินที่ระดับแอป)
DROP POLICY IF EXISTS "auth all" ON employee_position_history;
CREATE POLICY "auth all" ON employee_position_history
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

NOTIFY pgrst, 'reload schema';

COMMIT;
