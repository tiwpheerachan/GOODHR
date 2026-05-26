-- ════════════════════════════════════════════════════════════════════
-- เพิ่มฟิลด์ target_manager_id ใน branch_evaluations
--
-- วัตถุประสงค์: เป็น "ป้าย" บอกว่าฟอร์มนี้ผู้กรอกตั้งใจส่งถึงหัวหน้าคนไหน
-- → ใช้สำหรับ จัดกลุ่ม + แจ้งเตือน เท่านั้น
-- → ไม่ใช้คุม access (ใช้ branch_eval_permissions ตามเดิม)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE branch_evaluations
  ADD COLUMN IF NOT EXISTS target_manager_id uuid REFERENCES employees(id) ON DELETE SET NULL;

-- index เพื่อให้ filter "ส่งถึงฉัน" + group by manager เร็ว
CREATE INDEX IF NOT EXISTS idx_branch_eval_target_manager
  ON branch_evaluations(target_manager_id)
  WHERE target_manager_id IS NOT NULL AND deleted_at IS NULL;

-- ─── Verify ───
SELECT
  column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'branch_evaluations'
  AND column_name = 'target_manager_id';
