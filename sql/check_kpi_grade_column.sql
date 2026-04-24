-- เช็คว่า payroll_records มี column kpi_grade ไหม
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payroll_records'
  AND column_name IN ('kpi_grade', 'kpi_standard_amount', 'bonus')
ORDER BY column_name;
