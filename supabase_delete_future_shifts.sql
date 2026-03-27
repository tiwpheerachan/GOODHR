-- ═══════════════════════════════════════════════════════════════
-- ลบกะล่วงหน้า (พรุ่งนี้เป็นต้นไป) ของพนักงาน 18 คน
-- ยกเว้น assignment_type = 'holiday' (วันหยุดบริษัท)
-- ═══════════════════════════════════════════════════════════════

-- ขั้นตอน 1: ตรวจสอบก่อนลบ (ดูจำนวนที่จะโดนลบ)
SELECT
  e.employee_code,
  e.first_name_th,
  e.last_name_th,
  COUNT(*) AS total_future_shifts
FROM monthly_shift_assignments msa
JOIN employees e ON e.id = msa.employee_id
WHERE e.employee_code IN (
  '67000025','67000206','68000238','68000257','69000041',
  '66000081','67000155','68000031','67000030','65000026',
  '67000216','67000121','68000247','69000051','66000057',
  '66000090','66000043','66000065'
)
AND msa.work_date > CURRENT_DATE
AND msa.assignment_type != 'holiday'
GROUP BY e.employee_code, e.first_name_th, e.last_name_th
ORDER BY e.employee_code;

-- ขั้นตอน 2: ลบกะล่วงหน้า (ยกเว้นวันหยุดบริษัท)
DELETE FROM monthly_shift_assignments
WHERE employee_id IN (
  SELECT id FROM employees
  WHERE employee_code IN (
    '67000025','67000206','68000238','68000257','69000041',
    '66000081','67000155','68000031','67000030','65000026',
    '67000216','67000121','68000247','69000051','66000057',
    '66000090','66000043','66000065'
  )
)
AND work_date > CURRENT_DATE
AND assignment_type != 'holiday';

-- ขั้นตอน 3: auto-reject pending shift_change_requests ล่วงหน้าด้วย (ถ้ามี)
UPDATE shift_change_requests
SET status = 'auto_rejected',
    review_note = 'ลบกะล่วงหน้าโดย Admin',
    reviewed_at = NOW()
WHERE employee_id IN (
  SELECT id FROM employees
  WHERE employee_code IN (
    '67000025','67000206','68000238','68000257','69000041',
    '66000081','67000155','68000031','67000030','65000026',
    '67000216','67000121','68000247','69000051','66000057',
    '66000090','66000043','66000065'
  )
)
AND work_date > CURRENT_DATE
AND status = 'pending';
