-- ====================================================================
-- ตรวจสอบข้อมูลพนักงาน 68100004 อย่างละเอียด
-- ใช้รันใน Supabase SQL Editor
-- ====================================================================

-- ─── 1. ข้อมูลพื้นฐาน + กะ ─────────────────────────────────────
SELECT
  e.id,
  e.employee_code,
  e.first_name_th,
  e.last_name_th,
  e.nickname,
  d.name  AS department,
  p.name  AS position,
  c.code  AS company,
  e.hire_date,
  st.name AS shift_name,
  st.work_start,
  st.work_end,
  st.break_minutes,
  st.is_overnight
FROM employees e
LEFT JOIN departments d    ON e.department_id = d.id
LEFT JOIN positions p      ON e.position_id = p.id
LEFT JOIN companies c      ON e.company_id = c.id
LEFT JOIN LATERAL (
  SELECT ws.shift_template_id
  FROM work_schedules ws
  WHERE ws.employee_id = e.id
    AND ws.effective_from <= CURRENT_DATE
    AND (ws.effective_to IS NULL OR ws.effective_to >= CURRENT_DATE)
  ORDER BY ws.effective_from DESC
  LIMIT 1
) ws ON true
LEFT JOIN shift_templates st ON st.id = ws.shift_template_id
WHERE e.employee_code = '68100004';


-- ─── 2. Attendance Records (มี.ค. - เม.ย. 2569) ──────────────────
-- งวดเงินเดือน: 22 มี.ค. → 21 เม.ย. 2569
SELECT
  ar.work_date,
  to_char(ar.clock_in AT TIME ZONE 'Asia/Bangkok', 'HH24:MI')  AS checkin,
  to_char(ar.clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS checkout,
  ar.status,
  ar.late_minutes,
  ar.early_out_minutes,
  ar.ot_minutes,
  ar.work_minutes,
  ar.is_offsite_in,
  ar.is_offsite_out,
  ar.clock_in_valid,
  ar.clock_out_valid
FROM attendance_records ar
WHERE ar.employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND ar.work_date BETWEEN '2026-03-01' AND '2026-04-30'
ORDER BY ar.work_date ASC;


-- ─── 3. Overtime Requests (ทั้งหมด) ──────────────────────────────
SELECT
  otr.work_date,
  to_char(otr.ot_start AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS ot_start,
  to_char(otr.ot_end AT TIME ZONE 'Asia/Bangkok', 'HH24:MI')   AS ot_end,
  otr.status,
  otr.reason,
  otr.created_at::date AS requested_date
FROM overtime_requests otr
WHERE otr.employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
ORDER BY otr.work_date DESC;


-- ─── 4. Time Adjustment Requests (ทั้งหมด) ───────────────────────
SELECT
  tar.work_date,
  to_char(tar.requested_clock_in AT TIME ZONE 'Asia/Bangkok', 'HH24:MI')  AS req_checkin,
  to_char(tar.requested_clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS req_checkout,
  tar.status,
  tar.reason,
  tar.review_note,
  tar.created_at::date AS requested_date
FROM time_adjustment_requests tar
WHERE tar.employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
ORDER BY tar.work_date DESC;


-- ─── 5. Leave Requests (ทั้งหมด) ──────────────────────────────────
SELECT
  lr.start_date,
  lr.end_date,
  lr.total_days,
  lt.name AS leave_type,
  lr.status,
  lr.reason,
  lr.created_at::date AS requested_date
FROM leave_requests lr
LEFT JOIN leave_types lt ON lr.leave_type_id = lt.id
WHERE lr.employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
ORDER BY lr.start_date DESC;


-- ─── 6. Leave Balances (สิทธิวันลาปัจจุบัน) ──────────────────────
SELECT
  lt.name AS leave_type,
  lb.entitled_days,
  lb.used_days,
  lb.pending_days,
  lb.remaining_days,
  lb.carried_over,
  lb.year
FROM leave_balances lb
LEFT JOIN leave_types lt ON lb.leave_type_id = lt.id
WHERE lb.employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND lb.year = 2026
ORDER BY lt.name;


-- ─── 7. ตารางกะรายวัน (Monthly Shift Assignments) ──────────────
SELECT
  msa.work_date,
  msa.assignment_type,
  st.name AS shift_name,
  st.work_start,
  st.work_end
FROM monthly_shift_assignments msa
LEFT JOIN shift_templates st ON msa.shift_id = st.id
WHERE msa.employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND msa.work_date BETWEEN '2026-03-22' AND '2026-04-21'
ORDER BY msa.work_date ASC;


-- ─── 8. สรุปสถิติเดือน เม.ย. 2569 ──────────────────────────────
SELECT
  COUNT(*) FILTER (WHERE status IN ('present','late','early_out','wfh')) AS present_days,
  COUNT(*) FILTER (WHERE status = 'absent') AS absent_days,
  COUNT(*) FILTER (WHERE status = 'late' OR late_minutes > 0) AS late_count,
  COALESCE(SUM(late_minutes), 0) AS total_late_min,
  COALESCE(SUM(early_out_minutes), 0) AS total_early_out_min,
  COALESCE(SUM(ot_minutes), 0) AS total_ot_min,
  COALESCE(SUM(work_minutes), 0) AS total_work_min
FROM attendance_records
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND work_date BETWEEN '2026-04-01' AND '2026-04-30';
