-- ═══════════════════════════════════════════════════════════════════
-- ลบ payroll_record ค้างของคนที่ตั้ง "ไม่คิดในเงินเดือน" (include_in_payroll = false)
--   → ให้ "เฉพาะที่ติ๊กเท่านั้นที่มีในเงินเดือน" เชื่อถือได้ทุก path
--   ⚠️ ลบเฉพาะงวดที่ยังไม่ปิดจ่าย (status != 'paid') — ไม่แตะ record ที่จ่ายแล้ว
-- ═══════════════════════════════════════════════════════════════════

-- (1) ดูก่อนลบ — ใครมี record ค้างบ้าง
SELECT e.employee_code, e.first_name_th, e.nickname,
       pp.year, pp.month, pp.status, pr.net_salary
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id AND e.include_in_payroll = false
JOIN payroll_periods pp ON pp.id = pr.payroll_period_id
WHERE pp.status <> 'paid'
ORDER BY e.employee_code, pp.year, pp.month;

-- (2) ลบจริง (record ของคน include=false ในงวดที่ยังไม่จ่าย)
DELETE FROM payroll_records pr
USING employees e, payroll_periods pp
WHERE pr.employee_id = e.id
  AND pr.payroll_period_id = pp.id
  AND e.include_in_payroll = false
  AND pp.status <> 'paid';

-- (3) ตรวจว่าไม่เหลือ (ควรได้ 0)
-- SELECT COUNT(*) FROM payroll_records pr JOIN employees e ON e.id=pr.employee_id
--   JOIN payroll_periods pp ON pp.id=pr.payroll_period_id
--   WHERE e.include_in_payroll=false AND pp.status<>'paid';
