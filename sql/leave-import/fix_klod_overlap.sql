-- ═══════════════════════════════════════════════════════════
-- FIX: แก้ไขข้อมูล "ลาคลอดต่อเนื่อง (ดูแลบุตรป่วย)" ที่โดน update ผิด
-- สาเหตุ: ILIKE '%ป่วย%' จับทั้ง "ลาป่วย" และ "ลาคลอดต่อเนื่อง"
-- วิธีแก้: เอา old_used ที่บวกเข้าไปผิดออก แล้วคำนวณ remaining ใหม่
-- ═══════════════════════════════════════════════════════════

-- ขั้น 1: ดูว่ามีกี่ record ที่โดนผลกระทบ (ดูก่อน)
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  lt.name AS leave_type,
  lb.entitled_days AS "โควต้า",
  lb.used_days AS "ใช้ไป(ผิด)",
  o.old_used AS "ที่บวกเข้าผิด",
  lb.used_days - o.old_used AS "ใช้ไป(ถูกต้อง)",
  lb.pending_days AS "รอ",
  lb.entitled_days - (lb.used_days - o.old_used) - lb.pending_days AS "คงเหลือ(ถูกต้อง)"
FROM leave_balances lb
JOIN employees e ON e.id = lb.employee_id
JOIN leave_types lt ON lt.id = lb.leave_type_id
JOIN _old_app_leave o ON o.emp_code = e.employee_code
  AND o.leave_name = 'ลาป่วย' AND o.old_used > 0
WHERE lb.year = 2026
  AND lt.name ILIKE '%ป่วย%'
  AND lt.name ILIKE '%คลอด%'
ORDER BY e.employee_code;
