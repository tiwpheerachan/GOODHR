-- ════════════════════════════════════════════════════════════════
-- แก้ไข early_out_minutes ที่ไม่ได้อัพเดตหลังอนุมัติแก้เวลา
-- ════════════════════════════════════════════════════════════════

-- ── STEP 1: ดูรายการที่มีปัญหา (is_manual = true แต่ early_out_minutes ยังค้าง) ──
SELECT
  ar.work_date,
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  ar.clock_in,
  ar.clock_out,
  st.work_end AS shift_end,
  ar.early_out_minutes AS current_early_min,
  ar.status,
  ar.is_manual,
  -- คำนวณ early_out ที่ถูกต้องจาก clock_out vs shift_end
  CASE
    WHEN ar.clock_out IS NOT NULL AND st.work_end IS NOT NULL THEN
      GREATEST(0, EXTRACT(EPOCH FROM (
        (ar.work_date || 'T' || st.work_end || '+07:00')::timestamptz
        - ar.clock_out
      )) / 60)::int
    ELSE 0
  END AS correct_early_min
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
LEFT JOIN shift_templates st ON st.id = ar.shift_template_id
WHERE ar.is_manual = true
  AND ar.early_out_minutes > 0
  AND ar.clock_out IS NOT NULL
ORDER BY ar.work_date DESC;


-- ── STEP 2: อัพเดต early_out_minutes ให้ถูกต้อง ──
-- คำนวณจาก clock_out เทียบกับ shift.work_end จริงๆ
UPDATE attendance_records ar
SET early_out_minutes = CASE
    WHEN ar.clock_out IS NOT NULL AND st.work_end IS NOT NULL THEN
      GREATEST(0, EXTRACT(EPOCH FROM (
        (ar.work_date || 'T' || st.work_end || '+07:00')::timestamptz
        - ar.clock_out
      )) / 60)::int
    ELSE 0
  END
FROM shift_templates st
WHERE st.id = ar.shift_template_id
  AND ar.is_manual = true
  AND ar.early_out_minutes > 0
  AND ar.clock_out IS NOT NULL;


-- ── STEP 3: ตรวจสอบผลลัพธ์ ──
SELECT
  ar.work_date,
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  ar.clock_out,
  ar.early_out_minutes,
  ar.status,
  ar.is_manual
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
WHERE ar.is_manual = true
  AND ar.work_date >= '2026-03-01'
ORDER BY ar.work_date DESC;
