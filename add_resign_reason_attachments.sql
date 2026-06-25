-- เหตุผลการลาออก + ไฟล์หลักฐาน (เก็บบน employees เพื่ออ่าน/ดาวน์โหลดง่าย)
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS resign_reason TEXT,
  ADD COLUMN IF NOT EXISTS resign_attachments JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN employees.resign_reason IS 'เหตุผลการลาออก (HR กรอกในแท็บลาออก)';
COMMENT ON COLUMN employees.resign_attachments IS 'ไฟล์/รูปหลักฐานการลาออก [{url,name,size}]';

-- backfill เหตุผลเดิมจาก resignation_history (รายการ resign ล่าสุดต่อคน)
UPDATE employees e
SET resign_reason = sub.reason
FROM (
  SELECT DISTINCT ON (employee_id) employee_id, reason
  FROM resignation_history
  WHERE action = 'resign' AND reason IS NOT NULL AND reason <> ''
  ORDER BY employee_id, created_at DESC
) sub
WHERE e.id = sub.employee_id AND (e.resign_reason IS NULL OR e.resign_reason = '');
