-- ════════════════════════════════════════════════════════════════════
-- Fix: วันแรงงาน 1 พ.ค. 2026 (วันศุกร์)
--
-- ทำให้ทุกบริษัทยกเว้น PTC ใช้ 1 พ.ค. เป็นวันหยุด
-- + ล้าง attendance ที่ขึ้น "ขาดงาน" บนวันนี้ทิ้ง
-- ════════════════════════════════════════════════════════════════════

-- ═══ 0) ถ้าเคยใส่ holiday ของ PTC มาก่อน → ลบทิ้ง ═══
DELETE FROM company_holidays
WHERE date = '2026-05-01'
  AND company_id IN (SELECT id FROM companies WHERE code = 'PTC');

-- ═══ 1) เพิ่มวันแรงงาน 1 พ.ค. 2026 ให้ทุกบริษัท active "ยกเว้น PTC" ═══
INSERT INTO company_holidays (id, company_id, date, name, is_active)
SELECT gen_random_uuid(), c.id, '2026-05-01'::date, 'วันแรงงานแห่งชาติ', true
FROM companies c
WHERE c.is_active = true
  AND c.code <> 'PTC'
ON CONFLICT (company_id, date)
DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- ═══ 2) ลบ attendance_records ที่ขึ้น absent ไม่มี clock_in ในวันที่ 1 พ.ค. ═══
-- (เฉพาะบริษัทที่ตอนนี้มี holiday แล้ว = ทุกที่ยกเว้น PTC)
DELETE FROM attendance_records
WHERE work_date = '2026-05-01'
  AND status = 'absent'
  AND clock_in IS NULL
  AND company_id IN (
    SELECT company_id FROM company_holidays
    WHERE date = '2026-05-01' AND is_active = true
  );

-- ═══ 3) ใครมาทำงาน 1 พ.ค. (มี clock_in) + status='absent' → เปลี่ยนเป็น 'holiday' ═══
UPDATE attendance_records
SET status = 'holiday',
    late_minutes = 0,
    early_out_minutes = 0,
    updated_at = now()
WHERE work_date = '2026-05-01'
  AND status = 'absent'
  AND clock_in IS NOT NULL
  AND company_id IN (
    SELECT company_id FROM company_holidays
    WHERE date = '2026-05-01' AND is_active = true
  );

-- ═══ 4) ถ้ามี monthly_shift_assignments บน 1 พ.ค. ของบริษัทที่ไม่ใช่ PTC → ตั้ง assignment_type='holiday' ═══
-- กัน mark-absent cron ไม่ mark absent ซ้ำในอนาคต
UPDATE monthly_shift_assignments
SET assignment_type = 'holiday',
    updated_at = now()
WHERE work_date = '2026-05-01'
  AND assignment_type IN ('work', 'dayoff')
  AND company_id IN (
    SELECT company_id FROM company_holidays
    WHERE date = '2026-05-01' AND is_active = true
  );

-- ════════════════════════════════════════════════════════════════════
-- ═══ Verify ═══
-- ════════════════════════════════════════════════════════════════════

-- (a) จำนวน holiday 1 พ.ค. + รายชื่อบริษัทที่มี
SELECT c.code, c.name_th, h.name AS holiday_name, h.is_active
FROM companies c
LEFT JOIN company_holidays h
  ON h.company_id = c.id AND h.date = '2026-05-01'
WHERE c.is_active = true
ORDER BY c.code;

-- (b) บริษัทที่ยังขาด holiday 1 พ.ค. (ควรเหลือเฉพาะ PTC)
SELECT c.code, c.name_th
FROM companies c
LEFT JOIN company_holidays h
  ON h.company_id = c.id AND h.date = '2026-05-01' AND h.is_active = true
WHERE c.is_active = true
  AND h.id IS NULL
ORDER BY c.code;

-- (c) จำนวน absent records ที่เหลือใน 1 พ.ค. (PTC ยังได้, ที่อื่นควร 0)
SELECT
  c.code,
  COUNT(*) FILTER (WHERE ar.status = 'absent' AND ar.clock_in IS NULL) AS absent_count,
  COUNT(*) FILTER (WHERE ar.status = 'holiday') AS holiday_count,
  COUNT(*) AS total_records
FROM attendance_records ar
JOIN companies c ON c.id = ar.company_id
WHERE ar.work_date = '2026-05-01'
GROUP BY c.code
ORDER BY c.code;

-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรัน:
--   - ทุกบริษัท active (ยกเว้น PTC) จะมี 1 พ.ค. = วันหยุด
--   - attendance ที่ขึ้น absent บน 1 พ.ค. ถูกล้าง
--   - PTC ทำงานปกติ
--
-- 📌 ถ้าหน้าเว็บยังเห็น "ขาดงาน" → กด refresh (Ctrl+F5 / ⌘+Shift+R)
--   เพื่อล้าง browser cache
-- ════════════════════════════════════════════════════════════════════
