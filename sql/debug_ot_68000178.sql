-- DEBUG OT ของ 68000178 งวด เม.ย. (22 มี.ค. - 21 เม.ย.)

-- 1) payroll_records: OT ที่เก็บอยู่
SELECT
  pr.ot_amount, pr.ot_weekday_minutes, pr.ot_holiday_reg_minutes, pr.ot_holiday_ot_minutes,
  pr.is_manual_override, pr.bonus, pr.kpi_grade
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE e.employee_code = '68000178' AND pr.year = 2026 AND pr.month = 4;

-- 2) attendance_records: OT จาก attendance ในงวด
SELECT
  ar.work_date, ar.clock_in, ar.clock_out, ar.status, ar.ot_minutes, ar.work_minutes
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
WHERE e.employee_code = '68000178'
  AND ar.work_date >= '2026-03-22' AND ar.work_date <= '2026-04-21'
  AND ar.ot_minutes > 0
ORDER BY ar.work_date;

-- 3) overtime_requests: OT requests ที่ approved
SELECT
  otr.work_date, otr.ot_minutes, otr.ot_rate, otr.status
FROM overtime_requests otr
JOIN employees e ON e.id = otr.employee_id
WHERE e.employee_code = '68000178'
  AND otr.status = 'approved'
  AND otr.work_date >= '2026-03-22' AND otr.work_date <= '2026-04-21'
ORDER BY otr.work_date;
