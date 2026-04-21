-- ================================================================
-- Retroactive Fix: อัปเดต half_day_leave ย้อนหลังสำหรับ records ที่มีอยู่แล้ว
-- วัตถุประสงค์: ค้นหา attendance_records ที่ตรงกับ leave_requests ที่เป็นครึ่งวัน
--              แล้วเติมค่า half_day_leave ให้ถูกต้อง
-- วิธีใช้: รัน SQL นี้ใน Supabase SQL Editor หลังจากรัน add_half_day_leave_column.sql
-- วันที่: 2026-04-21
-- ================================================================

-- ── ขั้นตอนที่ 1: ตรวจสอบข้อมูลก่อน (DRY RUN) ──────────────────────
-- แสดงรายการ records ที่จะถูกอัปเดต
SELECT
  ar.id AS attendance_id,
  ar.employee_id,
  ar.work_date,
  ar.status,
  ar.late_minutes,
  ar.early_out_minutes,
  ar.half_day_leave AS current_value,
  lr.half_day_period AS new_value,
  lr.id AS leave_request_id,
  e.employee_code,
  e.first_name_th,
  e.last_name_th
FROM attendance_records ar
JOIN leave_requests lr ON
  lr.employee_id = ar.employee_id
  AND lr.is_half_day = true
  AND lr.status = 'approved'
  AND ar.work_date >= lr.start_date
  AND ar.work_date <= lr.end_date
  AND lr.half_day_period IN ('morning', 'afternoon')
LEFT JOIN employees e ON e.id = ar.employee_id
WHERE ar.half_day_leave IS NULL
ORDER BY ar.work_date DESC, e.employee_code;

-- ── ขั้นตอนที่ 2: อัปเดตจริง ─────────────────────────────────────────
-- ⚠️ ตรวจสอบผลลัพธ์ขั้นตอนที่ 1 ก่อน แล้วค่อย uncomment แล้วรัน

/*
UPDATE attendance_records ar
SET
  half_day_leave = lr.half_day_period,
  updated_at = NOW()
FROM leave_requests lr
WHERE
  lr.employee_id = ar.employee_id
  AND lr.is_half_day = true
  AND lr.status = 'approved'
  AND ar.work_date >= lr.start_date
  AND ar.work_date <= lr.end_date
  AND lr.half_day_period IN ('morning', 'afternoon')
  AND ar.half_day_leave IS NULL;
*/

-- ── ขั้นตอนที่ 3: ตรวจสอบหลังอัปเดต ─────────────────────────────────
-- ดูจำนวน records ที่ถูกอัปเดต

/*
SELECT
  half_day_leave,
  COUNT(*) AS count,
  SUM(CASE WHEN late_minutes > 0 THEN 1 ELSE 0 END) AS with_late,
  SUM(CASE WHEN early_out_minutes > 0 THEN 1 ELSE 0 END) AS with_early_out
FROM attendance_records
WHERE half_day_leave IS NOT NULL
GROUP BY half_day_leave
ORDER BY half_day_leave;
*/
