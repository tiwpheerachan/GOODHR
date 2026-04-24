-- ═══════════════════════════════════════════════════════════
-- RESTORE: กู้คืน OT จาก backup (ใช้ถ้า OT หายหลังคำนวณ)
-- ═══════════════════════════════════════════════════════════
UPDATE payroll_records pr
SET
  ot_amount = bk.ot_amount,
  ot_hours = bk.ot_hours,
  ot_weekday_minutes = bk.ot_weekday_minutes,
  ot_holiday_reg_minutes = bk.ot_holiday_reg_minutes,
  ot_holiday_ot_minutes = bk.ot_holiday_ot_minutes
FROM _ot_backup_apr bk
WHERE bk.payroll_id = pr.id;
