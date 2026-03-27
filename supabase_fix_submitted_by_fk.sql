-- ═══════════════════════════════════════════════════════════════════
-- Fix: ลบ foreign key constraints ที่ reference auth.users
-- ปัญหา: cross-schema FK ไป auth.users ทำให้ insert/upsert error
-- วิธีแก้: ลบ FK แล้วเก็บเป็น UUID ธรรมดา (trust จาก session)
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

-- 1. ลบ FK constraint ของ submitted_by ใน monthly_shift_assignments
ALTER TABLE monthly_shift_assignments
  DROP CONSTRAINT IF EXISTS monthly_shift_assignments_submitted_by_fkey;

-- 2. ลบ FK constraint ของ assigned_by ใน monthly_shift_assignments (เผื่อมีเหมือนกัน)
ALTER TABLE monthly_shift_assignments
  DROP CONSTRAINT IF EXISTS monthly_shift_assignments_assigned_by_fkey;

-- 3. ลบ FK constraint ของ reviewed_by ใน shift_change_requests
ALTER TABLE shift_change_requests
  DROP CONSTRAINT IF EXISTS shift_change_requests_reviewed_by_fkey;

DO $$
BEGIN
  RAISE NOTICE '✅ ลบ FK constraints ที่ reference auth.users สำเร็จ';
  RAISE NOTICE '   - monthly_shift_assignments.submitted_by';
  RAISE NOTICE '   - monthly_shift_assignments.assigned_by';
  RAISE NOTICE '   - shift_change_requests.reviewed_by';
END $$;
