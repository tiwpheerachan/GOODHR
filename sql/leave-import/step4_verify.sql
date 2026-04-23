-- ═══════════════════════════════════════════════════════════
-- STEP 4: ตรวจสอบผลลัพธ์หลัง UPDATE
-- ═══════════════════════════════════════════════════════════
SELECT 
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.entitled_days AS "โควต้า",
  lb.used_days AS "ใช้ไป",
  lb.pending_days AS "รอ",
  lb.remaining_days AS "คงเหลือ"
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.year = 2026 AND lb.used_days > 0
ORDER BY e.employee_code, lt.name;
