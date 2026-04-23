-- ═══════════════════════════════════════════════════════════
-- SYNC V2 STEP 1: ดูตัวอย่างก่อน — เปรียบเทียบ leave_summary_new กับ leave_balances ปัจจุบัน
-- ═══════════════════════════════════════════════════════════

-- 1A) จำนวน match vs not match
SELECT
  CASE WHEN e.id IS NOT NULL THEN 'MATCHED' ELSE 'NOT IN GOODHR' END AS status,
  COUNT(DISTINCT s.emp_code) AS employees,
  COUNT(*) AS records
FROM _leave_summary_new s
LEFT JOIN employees e ON e.employee_code = s.emp_code
  AND e.is_active = true AND e.deleted_at IS NULL
GROUP BY 1;
