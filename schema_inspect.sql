-- ═══════════════════════════════════════════════════
-- Schema Inspection Queries
-- รันใน Supabase SQL Editor เพื่อดูโครงสร้างตารางทั้งหมด
-- ═══════════════════════════════════════════════════

-- 1. ดูคอลัมน์ทุกตารางที่ migration ใช้ (ชื่อ, ชนิด, nullable, default)
SELECT
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'companies', 'branches', 'departments', 'positions',
    'shift_templates', 'employees', 'work_schedules',
    'employee_allowed_locations', 'leave_types', 'leave_balances',
    'users', 'employee_manager_history'
  )
ORDER BY table_name, ordinal_position;

-- 2. ดู enum types ทั้งหมดในระบบ (เช่น shift_type, employment_status ฯลฯ)
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
ORDER BY t.typname, e.enumsortorder;

-- 3. ดู foreign key constraints ทั้งหมดที่อ้างถึง employees
SELECT
  tc.table_name AS referencing_table,
  kcu.column_name AS referencing_column,
  ccu.table_name AS referenced_table,
  ccu.column_name AS referenced_column,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND ccu.table_name = 'employees'
ORDER BY tc.table_name;
