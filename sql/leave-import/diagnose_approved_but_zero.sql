-- ═══════════════════════════════════════════════════════════
-- DIAGNOSTIC: หาพนักงานที่มี leave_requests approved แต่ used_days = 0
-- ═══════════════════════════════════════════════════════════

-- 1) รวม leave_requests ที่ approved ในปี 2026 ทั้งหมด
SELECT
  'approved requests (2026)' AS metric,
  COUNT(*) AS total,
  SUM(total_days) AS total_days
FROM leave_requests
WHERE status = 'approved'
  AND EXTRACT(YEAR FROM start_date::date) = 2026;
