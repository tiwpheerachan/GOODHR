-- ═══════════════════════════════════════════════════════════════════
-- แก้ KPI ตกค้างของ ทิว (68000178) — split ให้ถูก effective date
--   ปัญหา: KPI 15,000 ถูก overwrite ทับ 1,260 (effective_from ค้าง 1 มี.ค.)
--          → รั่วเข้ารอบกรกฎา (ควรเป็น 1,260, ใหม่ 15,000 เริ่มรอบสิงหา 22/07)
--   เป้าหมาย (ให้เหมือน เซฟ 68000179):
--     • 1,260  มีผลก่อน 22/07  → รอบกรกฎาและก่อนหน้า
--     • 15,000 มีผลตั้งแต่ 22/07 → รอบสิงหาเป็นต้นไป
-- ═══════════════════════════════════════════════════════════════════

-- 1) ปิดแถวเดิม + คืนค่าเป็น 1,260 (ช่วงก่อน 22/07)
UPDATE kpi_bonus_settings
SET standard_amount = 1260,
    effective_to    = '2026-07-22',
    is_active       = false,
    updated_at      = now()
WHERE id = '5b2e006a-6af3-4442-aeea-71bd7a716077';   -- ทิว, เดิม 15,000 eff 2026-03-01

-- 2) เปิดเวอร์ชันใหม่ 15,000 มีผลตั้งแต่ 22/07 (รอบสิงหา)
INSERT INTO kpi_bonus_settings (employee_id, company_id, standard_amount, effective_from, effective_to, is_active)
VALUES ('d62503b0-fcc2-53c0-9890-1c98aae5c3a7', 'a684555a-e44d-4441-9af8-521115cd000a',
        15000, '2026-07-22', NULL, true);

-- 3) ตรวจผล — ควรได้ 2 เวอร์ชัน (1,260 ก่อน 22/07 + 15,000 จาก 22/07)
SELECT standard_amount, effective_from, effective_to, is_active
FROM kpi_bonus_settings
WHERE employee_id = 'd62503b0-fcc2-53c0-9890-1c98aae5c3a7'
ORDER BY effective_from;

-- ⚠️ หลังรัน: ต้องกด "คำนวณเวลาใหม่" รอบกรกฎาของ ทิว ในหน้าเงินเดือน
--    (payroll record เป็น snapshot — KPI จะเปลี่ยนจาก 15,000 → 1,260 หลังคำนวณใหม่)
