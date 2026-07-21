-- ════════════════════════════════════════════════════════════════════
-- HR อนุมัติเวลาทำงานรายวัน (ล็อกไม่ให้พนักงานขอแก้เวลา/ขอลาวันนั้น)
--   เมื่อ hr_time_approved = TRUE → พนักงานแก้/ขอไม่ได้ · แก้ได้เฉพาะ admin
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS hr_time_approved     BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS hr_time_approved_by  UUID,
  ADD COLUMN IF NOT EXISTS hr_time_approved_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_att_hr_approved ON attendance_records(employee_id, work_date) WHERE hr_time_approved = TRUE;

NOTIFY pgrst, 'reload schema';
