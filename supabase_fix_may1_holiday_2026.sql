-- ════════════════════════════════════════════════════════════════════
-- Fix: วันแรงงาน 1 พ.ค. 2026 (วันศุกร์) ขึ้นเป็นขาดงานไม่ถูกต้อง
--
-- 1) เพิ่มวันแรงงาน 1 พ.ค. 2026 ให้ "ทุกบริษัทที่ active"
-- 2) ลบ attendance_records ที่ขึ้น "absent" + ไม่มี clock_in บนวันที่นี้
-- 3) Verify
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) เพิ่มวันแรงงาน 1 พ.ค. 2026 ให้ทุกบริษัทที่ active ═══
INSERT INTO company_holidays (id, company_id, date, name, is_active)
SELECT gen_random_uuid(), c.id, '2026-05-01'::date, 'วันแรงงานแห่งชาติ', true
FROM companies c
WHERE c.is_active = true
ON CONFLICT (company_id, date)
DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- ═══ 2) ลบ attendance_records ที่ขึ้น absent + ไม่มี clock_in ในวันที่ 1 พ.ค. ═══
DELETE FROM attendance_records ar
USING company_holidays h
WHERE ar.work_date = '2026-05-01'
  AND h.date = '2026-05-01'
  AND ar.company_id = h.company_id
  AND h.is_active = true
  AND ar.status = 'absent'
  AND ar.clock_in IS NULL;

-- ═══ 3) ถ้าใครมา OT/เข้างานวันที่ 1 พ.ค. แต่ status='absent' → เปลี่ยนเป็น 'holiday' ═══
UPDATE attendance_records ar
SET status = 'holiday',
    late_minutes = 0,
    early_out_minutes = 0,
    updated_at = now()
FROM company_holidays h
WHERE ar.work_date = '2026-05-01'
  AND h.date = '2026-05-01'
  AND ar.company_id = h.company_id
  AND h.is_active = true
  AND ar.status = 'absent'
  AND ar.clock_in IS NOT NULL;

-- ═══ 4) Verify ═══
-- จำนวนวันหยุด 1 พ.ค. ที่อยู่ในระบบ (ควรเท่ากับจำนวนบริษัท active)
SELECT
  '2026-05-01' AS check_date,
  (SELECT COUNT(*) FROM company_holidays WHERE date = '2026-05-01' AND is_active = true) AS holidays_in_db,
  (SELECT COUNT(*) FROM companies WHERE is_active = true) AS active_companies;

-- รายชื่อบริษัทที่ยังขาดวันหยุด 1 พ.ค. (ควรเป็น empty หลังรัน)
SELECT c.code, c.name_th
FROM companies c
LEFT JOIN company_holidays h
  ON h.company_id = c.id AND h.date = '2026-05-01' AND h.is_active = true
WHERE c.is_active = true
  AND h.id IS NULL;

-- จำนวน absent records ที่เหลือในวันที่ 1 พ.ค. (ควรเป็น 0)
SELECT COUNT(*) AS remaining_absent_may1
FROM attendance_records
WHERE work_date = '2026-05-01'
  AND status = 'absent'
  AND clock_in IS NULL;

-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรันแล้ว: refresh หน้าพนักงาน → 1 พ.ค. 2026 เป็น "วันหยุด" สีชมพู
-- ════════════════════════════════════════════════════════════════════
