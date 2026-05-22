-- ════════════════════════════════════════════════════════════════════
-- Training: Viewer Subordinate List (explicit, per-permission)
-- ════════════════════════════════════════════════════════════════════
-- เก็บลูกน้องของ viewer แต่ละคนแบบกำหนดเอง
-- ไม่ผูกกับ employees.supervisor_id เพื่อไม่กระทบ HR/KPI/payroll
--
-- 1 viewer permission row → N learner_employee_id (many-to-many)
-- ลบ permission → list ถูก cascade ลบอัตโนมัติ
-- ลบ employee → ถูก cascade ลบจาก list อัตโนมัติ
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS training_viewer_subordinates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  permission_id UUID NOT NULL REFERENCES training_permissions(id) ON DELETE CASCADE,
  learner_employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  added_by UUID REFERENCES employees(id),
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (permission_id, learner_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_training_viewer_sub_permission
  ON training_viewer_subordinates(permission_id);
CREATE INDEX IF NOT EXISTS idx_training_viewer_sub_learner
  ON training_viewer_subordinates(learner_employee_id);

COMMENT ON TABLE training_viewer_subordinates IS
  'ลูกน้องของ training_viewer ที่กำหนดเองสำหรับ training (แยกจาก employees.supervisor_id)';

-- ลบ function เก่าที่ไม่ได้ใช้แล้ว (ถ้าเคย run migration supabase_training_viewer_role.sql มาก่อน)
DROP FUNCTION IF EXISTS get_subordinate_ids(UUID);

NOTIFY pgrst, 'reload schema';
