-- ═══════════════════════════════════════════════════════════
-- BACKUP: เก็บ OT เดือน เม.ย. ที่มีอยู่ก่อนคำนวณใหม่
-- ═══════════════════════════════════════════════════════════
DROP TABLE IF EXISTS _ot_backup_apr;
CREATE TABLE _ot_backup_apr AS
SELECT
  pr.id AS payroll_id,
  pr.employee_id,
  e.employee_code,
  pr.ot_amount,
  pr.ot_hours,
  pr.ot_weekday_minutes,
  pr.ot_holiday_reg_minutes,
  pr.ot_holiday_ot_minutes,
  pr.is_manual_override
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
WHERE pr.year = 2026 AND pr.month = 4 AND pr.ot_amount > 0;

SELECT COUNT(*) AS backed_up, SUM(ot_amount) AS total_ot FROM _ot_backup_apr;
