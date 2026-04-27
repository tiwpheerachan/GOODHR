-- ═══════════════════════════════════════════════════════════
-- UPDATE: อัปเดต payroll_records ของ 6 คน PTC ให้ตรงตามชีท
-- ═══════════════════════════════════════════════════════════

-- 1) 68000064 กฤษณะ ปะระกัง
UPDATE payroll_records pr SET
  base_salary = 12000, bonus = 0,
  ot_amount = 3638, ot_weekday_minutes = 0, ot_holiday_reg_minutes = 0, ot_holiday_ot_minutes = 0,
  allowance_position = 0, commission = 1210, other_income = 0,
  allowance_transport = 0, allowance_food = 0, allowance_phone = 0, allowance_housing = 0, allowance_other = 0,
  deduct_late = 0, deduct_absent = 0, deduct_early_out = 0, deduct_other = 0, deduct_loan = 0,
  social_security_amount = 0, monthly_tax_withheld = 505.44,
  gross_income = 16848, total_deductions = 505.44, net_salary = 16342.56,
  is_manual_override = true, updated_at = NOW()
FROM employees e
WHERE e.id = pr.employee_id AND e.employee_code = '68000064' AND pr.year = 2026 AND pr.month = 4;

-- 2) 69000063 พลอยไพลิน สีลาลม
UPDATE payroll_records pr SET
  base_salary = 6000, bonus = 0,
  ot_amount = 75, ot_weekday_minutes = 0, ot_holiday_reg_minutes = 0, ot_holiday_ot_minutes = 0,
  allowance_position = 0, commission = 0, other_income = 2800,
  allowance_transport = 0, allowance_food = 0, allowance_phone = 0, allowance_housing = 0, allowance_other = 0,
  deduct_late = 0, deduct_absent = 0, deduct_early_out = 0, deduct_other = 0, deduct_loan = 0,
  social_security_amount = 0, monthly_tax_withheld = 266.25,
  gross_income = 8875, total_deductions = 266.25, net_salary = 8608.75,
  is_manual_override = true, updated_at = NOW()
FROM employees e
WHERE e.id = pr.employee_id AND e.employee_code = '69000063' AND pr.year = 2026 AND pr.month = 4;

-- 3) 69000077 จุฑามาศ บุญอินทร์
UPDATE payroll_records pr SET
  base_salary = 2000, bonus = 0,
  ot_amount = 1125, ot_weekday_minutes = 0, ot_holiday_reg_minutes = 0, ot_holiday_ot_minutes = 0,
  allowance_position = 0, commission = 0, other_income = 2800,
  allowance_transport = 0, allowance_food = 0, allowance_phone = 0, allowance_housing = 0, allowance_other = 0,
  deduct_late = 0, deduct_absent = 500, deduct_early_out = 0, deduct_other = 0, deduct_loan = 0,
  social_security_amount = 0, monthly_tax_withheld = 177.75,
  gross_income = 5925, total_deductions = 677.75, net_salary = 5247.25,
  is_manual_override = true, updated_at = NOW()
FROM employees e
WHERE e.id = pr.employee_id AND e.employee_code = '69000077' AND pr.year = 2026 AND pr.month = 4;

-- 4) 69000066 ภูริเดช สีสมุด
UPDATE payroll_records pr SET
  base_salary = 0, bonus = 0,
  ot_amount = 0, ot_weekday_minutes = 0, ot_holiday_reg_minutes = 0, ot_holiday_ot_minutes = 0,
  allowance_position = 0, commission = 0, other_income = 2500,
  allowance_transport = 0, allowance_food = 0, allowance_phone = 0, allowance_housing = 0, allowance_other = 0,
  deduct_late = 0, deduct_absent = 0, deduct_early_out = 0, deduct_other = 0, deduct_loan = 0,
  social_security_amount = 0, monthly_tax_withheld = 75,
  gross_income = 2500, total_deductions = 75, net_salary = 2425,
  is_manual_override = true, updated_at = NOW()
FROM employees e
WHERE e.id = pr.employee_id AND e.employee_code = '69000066' AND pr.year = 2026 AND pr.month = 4;

-- 5) 68000200 พิมพร สุทธิบุตร
UPDATE payroll_records pr SET
  base_salary = 0, bonus = 0,
  ot_amount = 0, ot_weekday_minutes = 0, ot_holiday_reg_minutes = 0, ot_holiday_ot_minutes = 0,
  allowance_position = 0, commission = 250, other_income = 0,
  allowance_transport = 0, allowance_food = 0, allowance_phone = 0, allowance_housing = 0, allowance_other = 0,
  deduct_late = 0, deduct_absent = 0, deduct_early_out = 0, deduct_other = 0, deduct_loan = 0,
  social_security_amount = 0, monthly_tax_withheld = 7.5,
  gross_income = 250, total_deductions = 7.5, net_salary = 242.5,
  is_manual_override = true, updated_at = NOW()
FROM employees e
WHERE e.id = pr.employee_id AND e.employee_code = '68000200' AND pr.year = 2026 AND pr.month = 4;

-- 6) 69000022 ทิพย์สุดา แสงดาว
UPDATE payroll_records pr SET
  base_salary = 0, bonus = 0,
  ot_amount = 0, ot_weekday_minutes = 0, ot_holiday_reg_minutes = 0, ot_holiday_ot_minutes = 0,
  allowance_position = 0, commission = 475, other_income = 0,
  allowance_transport = 0, allowance_food = 0, allowance_phone = 0, allowance_housing = 0, allowance_other = 0,
  deduct_late = 0, deduct_absent = 0, deduct_early_out = 0, deduct_other = 0, deduct_loan = 0,
  social_security_amount = 0, monthly_tax_withheld = 14.25,
  gross_income = 475, total_deductions = 14.25, net_salary = 460.75,
  is_manual_override = true, updated_at = NOW()
FROM employees e
WHERE e.id = pr.employee_id AND e.employee_code = '69000022' AND pr.year = 2026 AND pr.month = 4;
