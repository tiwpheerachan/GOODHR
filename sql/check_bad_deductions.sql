-- เช็ค 4 คนที่ deduct_other สูงผิดปกติ
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  pr.base_salary,
  pr.deduct_other,
  pr.deduct_loan,
  pr.gross_income,
  pr.total_deductions,
  pr.net_salary,
  pr.is_manual_override
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE pr.year = 2026 AND pr.month = 5
  AND e.employee_code IN ('68000252', '69000061', '69000072', '68000265')
ORDER BY pr.deduct_other DESC;
