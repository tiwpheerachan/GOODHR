-- ════════════════════════════════════════════════════════════════════
-- เพิ่มฟีเจอร์ "ประกาศเฉพาะรายบุคคล"
--   • target_employee_ids = UUID[] — รายชื่อพนักงานที่เป็น audience
--     - NULL/empty   → ใช้ scope ตาม company_id + department_id เดิม
--     - มีค่า [ids]  → เฉพาะคนใน list เท่านั้นที่เห็น (override company/dept)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS target_employee_ids UUID[] DEFAULT NULL;

-- GIN index — query "user X เห็นประกาศไหน" ได้เร็ว
CREATE INDEX IF NOT EXISTS idx_ann_target_emps
  ON announcements USING gin (target_employee_ids)
  WHERE target_employee_ids IS NOT NULL;

NOTIFY pgrst, 'reload schema';

DO $$
DECLARE n INT;
BEGIN
  SELECT COUNT(*) INTO n FROM information_schema.columns
  WHERE table_name = 'announcements' AND column_name = 'target_employee_ids';
  RAISE NOTICE '✓ เพิ่ม column target_employee_ids: %', CASE WHEN n > 0 THEN 'สำเร็จ' ELSE 'ล้มเหลว' END;
END $$;
