-- ════════════════════════════════════════════════════════════════════
-- ตรวจการเข้างาน — พนักงาน 68000179 (สรรค์ ธนสิทธิ์สมบูรณ์ · "เซฟ")
--   Business Development · Data Analyst · เริ่ม 22 ต.ค. 2025
--   รอบเงินเดือน: 22 พ.ค. – 21 มิ.ย. 2026
-- ════════════════════════════════════════════════════════════════════

-- ── ข้อมูลพนักงาน ────────────────────────────────────────────────────
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th  AS full_name,
  e.nickname,
  p.name  AS position,
  d.name  AS department,
  c.code  AS company,
  e.hire_date,
  e.employment_status
FROM employees e
LEFT JOIN positions   p ON p.id = e.position_id
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN companies   c ON c.id = e.company_id
WHERE e.employee_code = '68000179';


-- ── สรุปรอบเงินเดือน (1 row) ────────────────────────────────────────
WITH emp AS (
  SELECT id, company_id, hire_date FROM employees WHERE employee_code = '68000179'
),
rec AS (
  SELECT * FROM attendance_records, emp
  WHERE attendance_records.employee_id = emp.id
    AND work_date BETWEEN '2026-05-22' AND '2026-06-21'
)
SELECT
  COUNT(*)                                                          AS total_records,
  COUNT(*) FILTER (WHERE status = 'present')                        AS present,
  COUNT(*) FILTER (WHERE status = 'late')                           AS late,
  COUNT(*) FILTER (WHERE status = 'absent')                         AS absent,
  COUNT(*) FILTER (WHERE status = 'early_out')                      AS early_out,
  COUNT(*) FILTER (WHERE status IN ('leave','on_leave'))            AS on_leave,
  COUNT(*) FILTER (WHERE clock_in_with_photo OR clock_out_with_photo)        AS with_photo,
  COUNT(*) FILTER (WHERE is_offsite_in OR is_offsite_out)                    AS offsite,
  COALESCE(SUM(late_minutes), 0)                                    AS total_late_min,
  COALESCE(SUM(early_out_minutes), 0)                               AS total_early_min,
  COALESCE(SUM(work_minutes), 0)                                    AS total_work_min,
  COALESCE(SUM(ot_minutes), 0)                                      AS total_ot_min,
  COUNT(*) FILTER (WHERE clock_in IS NOT NULL AND clock_out IS NULL) AS missing_clockout
FROM rec;


-- ── รายวัน + สถานะ (รวมวันลา/วันหยุด/วันขาด virtual) ──────────────
WITH emp AS (
  SELECT id, company_id, hire_date FROM employees WHERE employee_code = '68000179'
),
days AS (
  SELECT generate_series('2026-05-22'::date, '2026-06-21'::date, '1 day')::date AS work_date
),
hols AS (
  SELECT date, name FROM company_holidays
  WHERE company_id = (SELECT company_id FROM emp)
    AND is_active = TRUE
    AND date BETWEEN '2026-05-22' AND '2026-06-21'
),
leaves AS (
  SELECT lr.start_date, lr.end_date, lr.status AS leave_status, lt.name AS leave_type
  FROM leave_requests lr
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.employee_id = (SELECT id FROM emp)
    AND lr.status IN ('approved', 'pending')
    AND lr.end_date >= '2026-05-22'
    AND lr.start_date <= '2026-06-21'
)
SELECT
  d.work_date,
  to_char(d.work_date, 'Dy')                                        AS dow,
  CASE
    WHEN EXTRACT(DOW FROM d.work_date) IN (0, 6) THEN 'wknd'
    WHEN h.date IS NOT NULL                       THEN 'holiday'
    WHEN d.work_date < (SELECT hire_date FROM emp) THEN 'pre-hire'
    WHEN lv.start_date IS NOT NULL                THEN 'leave (' || lv.leave_status || ')'
    WHEN ar.id IS NOT NULL                        THEN ar.status::TEXT
    WHEN d.work_date <= CURRENT_DATE              THEN 'NO_RECORD'
    ELSE 'future'
  END                                                                AS day_status,
  to_char(ar.clock_in  AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS')   AS in_th,
  to_char(ar.clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS')   AS out_th,
  ar.late_minutes,
  ar.early_out_minutes,
  ar.work_minutes,
  ar.ot_minutes,
  CASE
    WHEN ar.clock_in_with_photo OR ar.clock_out_with_photo THEN 'แนบรูป'
    WHEN ar.is_offsite_in OR ar.is_offsite_out             THEN 'นอกสถานที่'
    WHEN ar.clock_in IS NOT NULL                            THEN 'ปกติ'
    ELSE NULL
  END                                                                AS checkin_type,
  COALESCE(h.name, lv.leave_type)                                    AS note
FROM days d
LEFT JOIN attendance_records ar
       ON ar.employee_id = (SELECT id FROM emp)
      AND ar.work_date = d.work_date
LEFT JOIN hols h
       ON h.date = d.work_date
LEFT JOIN leaves lv
       ON d.work_date BETWEEN lv.start_date AND lv.end_date
ORDER BY d.work_date;


-- ── ประวัติคำขอแก้ไขเวลาในรอบนี้ ────────────────────────────────────
SELECT
  work_date,
  to_char(requested_clock_in  AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS req_in,
  to_char(requested_clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS req_out,
  status,
  reason,
  to_char(created_at AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI') AS submitted_at
FROM time_adjustment_requests
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '68000179')
  AND work_date BETWEEN '2026-05-22' AND '2026-06-21'
ORDER BY work_date;
