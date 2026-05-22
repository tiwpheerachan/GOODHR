-- ════════════════════════════════════════════════════════════════════
-- Training: เพิ่ม role 'training_viewer' (อ่านอย่างเดียว)
-- ════════════════════════════════════════════════════════════════════
-- viewer = sub-admin ที่ดูได้ + download ได้ แต่แก้อะไรไม่ได้
-- scope = 'subordinates' → เห็นเฉพาะลูกน้องในสาย (recursive subtree)
-- scope = 'all'          → เห็นทุกคนในช่อง (ยัง read-only อยู่)
-- ════════════════════════════════════════════════════════════════════

-- 1) ขยาย CHECK constraint ให้รับ role ใหม่
ALTER TABLE training_permissions
  DROP CONSTRAINT IF EXISTS training_permissions_role_check;

ALTER TABLE training_permissions
  ADD CONSTRAINT training_permissions_role_check
  CHECK (role IN ('training_admin', 'training_supervisor', 'training_viewer'));

-- 2) เพิ่ม scope (ใช้กับ viewer; ค่าอื่น ๆ ไม่สนใจ)
ALTER TABLE training_permissions
  ADD COLUMN IF NOT EXISTS scope TEXT
    CHECK (scope IN ('all', 'subordinates')) DEFAULT 'subordinates';

COMMENT ON COLUMN training_permissions.scope IS
  'ใช้กับ role=training_viewer: subordinates=เห็นเฉพาะลูกน้องในสาย, all=เห็นทั้งช่อง (read-only)';

-- 3) Helper: recursive subtree ของ supervisor_id
--    คืนตัว employee_id ที่ส่งเข้ามา + ลูกน้องทุกชั้นใน subtree
CREATE OR REPLACE FUNCTION get_subordinate_ids(p_employee_id UUID)
RETURNS TABLE(employee_id UUID) AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM employees WHERE id = p_employee_id
    UNION ALL
    SELECT e.id FROM employees e
    JOIN tree t ON e.supervisor_id = t.id
  )
  SELECT id FROM tree;
$$ LANGUAGE SQL STABLE;

COMMENT ON FUNCTION get_subordinate_ids(UUID) IS
  'ดึง employee_id ทั้งหมดใน subtree (รวมตัวเอง) ตามสาย supervisor_id';

NOTIFY pgrst, 'reload schema';
