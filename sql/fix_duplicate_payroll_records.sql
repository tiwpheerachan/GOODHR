-- ═══════════════════════════════════════════════════════════
-- FIX: ลบ duplicate payroll_records (68000265 มี 3 records!)
-- เก็บเฉพาะ record ที่ updated_at ใหม่สุด
-- ═══════════════════════════════════════════════════════════

-- ดูก่อน
SELECT pr.id, e.employee_code, pr.updated_at, pr.is_manual_override, pr.deduct_other
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE e.employee_code = '68000265' AND pr.year = 2026 AND pr.month = 4
ORDER BY pr.updated_at DESC;
