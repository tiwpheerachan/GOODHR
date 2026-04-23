-- ═══════════════════════════════════════════════════════════
-- DIAGNOSTIC: ตรวจสอบ leave_balances ว่าครบทุกคนหรือไม่
-- ═══════════════════════════════════════════════════════════

-- 1) จำนวนพนักงาน active ทั้งหมด vs มี leave_balances
SELECT
  'พนักงาน active' AS metric,
  COUNT(*) AS total
FROM employees WHERE is_active = true AND deleted_at IS NULL
UNION ALL
SELECT
  'มี leave_balances (2026)' AS metric,
  COUNT(DISTINCT employee_id) AS total
FROM leave_balances WHERE year = 2026
UNION ALL
SELECT
  'ไม่มี leave_balances เลย' AS metric,
  COUNT(*) AS total
FROM employees e
WHERE e.is_active = true AND e.deleted_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM leave_balances lb WHERE lb.employee_id = e.id AND lb.year = 2026);
