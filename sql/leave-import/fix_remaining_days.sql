-- ═══════════════════════════════════════════════════════════
-- FIX: คำนวณ remaining_days ใหม่ให้ทุก record ที่ไม่ตรง
-- remaining_days = entitled_days - used_days - pending_days
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances
SET remaining_days = ROUND(entitled_days - used_days - pending_days, 2)
WHERE year = 2026
  AND remaining_days <> ROUND(entitled_days - used_days - pending_days, 2);
