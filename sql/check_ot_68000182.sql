-- เช็ค OT ของ 68000182 (ชาญชัย นิโรจน์) เดือน เม.ย.
SELECT
  pr.ot_amount,
  pr.ot_hours,
  pr.ot_weekday_minutes,
  pr.ot_holiday_reg_minutes,
  pr.ot_holiday_ot_minutes,
  pr.is_manual_override,
  pr.base_salary,
  -- คำนวณ OT จากนาทีจริง
  ROUND((pr.base_salary / 30.0 / 8.0) * (pr.ot_weekday_minutes / 60.0) * 1.5, 2) AS "calc_ot15",
  ROUND((pr.base_salary / 30.0 / 8.0) * (pr.ot_holiday_reg_minutes / 60.0) * 1.0, 2) AS "calc_ot10",
  ROUND((pr.base_salary / 30.0 / 8.0) * (pr.ot_holiday_ot_minutes / 60.0) * 3.0, 2) AS "calc_ot30"
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE e.employee_code = '68000182'
  AND pr.year = 2026 AND pr.month = 4;
