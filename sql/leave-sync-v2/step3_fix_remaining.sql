-- ═══════════════════════════════════════════════════════════
-- SYNC V2 STEP 3: แก้ remaining_days ทั้งหมดที่ไม่ตรง
-- (รวมถึง records ที่ไม่ได้อยู่ในไฟล์แต่มี approved requests)
-- ═══════════════════════════════════════════════════════════
UPDATE leave_balances
SET remaining_days = ROUND(entitled_days - used_days - pending_days, 2)
WHERE year = 2026
  AND remaining_days <> ROUND(entitled_days - used_days - pending_days, 2);
