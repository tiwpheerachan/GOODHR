-- ═══════════════════════════════════════════════════════════
-- FIX: แก้ไข "ลาคลอดต่อเนื่อง (ดูแลบุตรป่วย)" ที่โดน update ผิด
-- สาเหตุ: ILIKE '%ป่วย%' จับทั้ง "ลาป่วย" และ "ลาคลอดต่อเนื่อง"
-- พนักงานที่โดนผลกระทบ:
--   65000026 อัญสุชา - old_used 0.02 ถูกบวกเข้าผิด
--   68000008 วิชัย   - old_used 2.00 ถูกบวกเข้าผิด
-- ═══════════════════════════════════════════════════════════

-- ขั้น 1: ดูสถานะปัจจุบันก่อน (SELECT เฉยๆ)
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.entitled_days AS "โควต้า",
  lb.used_days AS "ใช้ไป(ปัจจุบัน)",
  lb.pending_days AS "รอ",
  lb.remaining_days AS "คงเหลือ(ปัจจุบัน)"
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
WHERE lb.year = 2026
  AND e.employee_code IN ('65000026', '68000008')
  AND lt.name ILIKE '%คลอด%'
ORDER BY e.employee_code;
