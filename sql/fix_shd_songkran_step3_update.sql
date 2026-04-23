-- ═══════════════════════════════════════════════════════════
-- FIX: อัปเดต monthly_shift_assignments ให้วันที่ 13-15 เม.ย.
-- เป็น holiday สำหรับ SHD (ถ้ายังเป็น work อยู่)
-- อิงตามกะ: ถ้ามีกะอยู่จะคง shift_id ไว้ แต่เปลี่ยน type เป็น holiday
-- ═══════════════════════════════════════════════════════════
UPDATE monthly_shift_assignments msa
SET
  assignment_type = 'holiday',
  shift_id = NULL
FROM companies c
WHERE c.id = msa.company_id
  AND c.code = 'SHD'
  AND msa.work_date IN ('2026-04-13', '2026-04-14', '2026-04-15')
  AND msa.assignment_type NOT IN ('holiday', 'leave');
