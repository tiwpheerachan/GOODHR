-- ═══════════════════════════════════════════════════════════
-- FIX: แก้ไข used_days ติดลบที่เกิดจาก fix ก่อนหน้า
-- Reset ทุก leave_balance ที่ used_days < 0 กลับเป็น 0
-- แล้วคำนวณ remaining_days ใหม่
-- เฉพาะ 2 คนที่โดนผลกระทบ: 65000026, 68000008
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances lb
SET
  used_days = 0,
  remaining_days = lb.entitled_days - lb.pending_days
FROM employees e
WHERE lb.employee_id = e.id
  AND e.employee_code IN ('65000026', '68000008')
  AND lb.year = 2026
  AND lb.used_days < 0;
