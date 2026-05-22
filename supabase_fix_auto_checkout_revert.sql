-- ════════════════════════════════════════════════════════════════════
-- Revert: auto-checkout ในรอบเงินเดือนปัจจุบัน
--
-- นโยบายใหม่ (2026-05-22): ระบบไม่ปิด clock_out อัตโนมัติแล้ว
-- พนักงานต้องยื่นคำขอแก้ไขเวลาเอง
--
-- สคริปต์นี้ ย้อน attendance_records ที่เคยถูก auto-close ในรอบเดือนนี้
-- (22 เม.ย. – 21 พ.ค. 2026) กลับเป็น "ยังไม่ได้ check out"
-- + cancel time_adjustment_request ที่ระบบสร้างให้ → พนักงานยื่นใหม่เอง
-- ════════════════════════════════════════════════════════════════════

-- 📌 ปรับช่วงวันที่ตามรอบเงินเดือนที่ต้องการ (default: 22 เม.ย. – 21 พ.ค. 2026)
DO $$
DECLARE
  period_start date := '2026-04-22';
  period_end   date := '2026-05-21';
  reverted_att int;
  cancelled_adj int;
BEGIN

  -- ═══ 0) Preview ก่อน revert: ดู record ที่จะถูกแก้ ═══
  RAISE NOTICE '--- Preview: attendance_records ที่ถูก auto-closed ในงวด ---';

  -- ═══ 1) ย้อน attendance_records: clear clock_out / work_minutes ที่ระบบใส่อัตโนมัติ ═══
  --     เงื่อนไข: note มีคำว่า "ระบบปิดอัตโนมัติ" หรือ "ลืมเช็คเอ้า — ระบบปิดอัตโนมัติ"
  --     และอยู่ในช่วงรอบเงินเดือน
  WITH reverted AS (
    UPDATE attendance_records
    SET clock_out          = NULL,
        clock_out_valid    = NULL,
        clock_out_lat      = NULL,
        clock_out_lng      = NULL,
        clock_out_branch_id= NULL,
        clock_out_distance_m = NULL,
        work_minutes       = 0,
        early_out_minutes  = 0,
        note               = NULLIF(
          regexp_replace(
            COALESCE(note, ''),
            '\s*\|?\s*(ลืมเช็คเอ้า\s*[—-]\s*ระบบปิดอัตโนมัติ[^|]*|ระบบปิดอัตโนมัติ[^|]*)',
            '', 'gi'
          ),
          ''
        ),
        updated_at         = now()
    WHERE work_date >= period_start
      AND work_date <= period_end
      AND clock_in IS NOT NULL
      AND clock_out IS NOT NULL
      AND (
        note ILIKE '%ระบบปิดอัตโนมัติ%'
        OR note ILIKE '%ลืมเช็คเอ้า%ระบบ%'
      )
    RETURNING id
  )
  SELECT count(*) INTO reverted_att FROM reverted;
  RAISE NOTICE 'attendance_records ที่ย้อนกลับ: %', reverted_att;

  -- ═══ 2) Cancel time_adjustment_requests ที่ระบบสร้างให้ (pending) ═══
  --     เพื่อให้พนักงานยื่นคำขอใหม่เองพร้อมเวลา clock_out จริง
  WITH cancelled AS (
    UPDATE time_adjustment_requests
    SET status = 'cancelled',
        review_note = COALESCE(review_note, '') ||
          ' | ระบบยกเลิก: นโยบายใหม่ — พนักงานต้องยื่นคำขอแก้ไขเวลาเอง',
        reviewed_at = now()
    WHERE work_date >= period_start
      AND work_date <= period_end
      AND status = 'pending'
      AND reason ILIKE '%ระบบสร้างอัตโนมัติ%'
    RETURNING id
  )
  SELECT count(*) INTO cancelled_adj FROM cancelled;
  RAISE NOTICE 'time_adjustment_requests ที่ยกเลิก: %', cancelled_adj;

END $$;

-- ═══ Verify ═══
SELECT
  'attendance ที่ยังมี note auto-close อยู่ในงวด' AS check_name,
  count(*) AS remaining
FROM attendance_records
WHERE work_date >= '2026-04-22'
  AND work_date <= '2026-05-21'
  AND (note ILIKE '%ระบบปิดอัตโนมัติ%' OR note ILIKE '%ลืมเช็คเอ้า%ระบบ%')
UNION ALL
SELECT
  'time_adjustment auto-generated ที่ยัง pending ในงวด',
  count(*)
FROM time_adjustment_requests
WHERE work_date >= '2026-04-22'
  AND work_date <= '2026-05-21'
  AND status = 'pending'
  AND reason ILIKE '%ระบบสร้างอัตโนมัติ%';

-- ═══ List ที่ย้อนแล้ว (พนักงานต้องยื่นคำขอแก้ไขเวลาเอง) ═══
SELECT
  e.employee_code,
  e.first_name_th,
  e.last_name_th,
  a.work_date,
  to_char(a.clock_in AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS clock_in_th
FROM attendance_records a
JOIN employees e ON e.id = a.employee_id
WHERE a.work_date >= '2026-04-22'
  AND a.work_date <= '2026-05-21'
  AND a.clock_in IS NOT NULL
  AND a.clock_out IS NULL
ORDER BY a.work_date DESC, e.employee_code
LIMIT 200;

-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรัน:
--   - attendance_records ที่ถูก auto-close → กลับเป็น "ยังไม่ checkout"
--   - หน้า /app/attendance ของพนักงานจะแสดง record เหล่านี้พร้อมปุ่ม
--     "ขอแก้ไขเวลา" (มีอยู่แล้วเมื่อ missingClockOut=true)
--   - time_adjustment_requests ที่ระบบสร้างให้ → ยกเลิก ให้พนักงานยื่นใหม่
--   - cron auto-checkout ถูก disable แล้ว → จะไม่เกิดอีก
-- ════════════════════════════════════════════════════════════════════
