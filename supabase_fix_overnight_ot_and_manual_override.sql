-- ════════════════════════════════════════════════════════════════════
-- Fix: overtime_requests ที่ ot_end < ot_start (overnight ที่ข้ามวันไม่ถูก)
--      + clear is_manual_override บน payroll พ.ค. 2026 ที่กระทบ
-- ────────────────────────────────────────────────────────────────────
-- สาเหตุ:
--   ฟอร์ม insert ot_start/ot_end ใช้ work_date เดียวกัน
--   ถ้าพนักงานทำ OT 20:00 → 02:00 → ot_end อยู่ "วันเดียวกัน" → 02:00 มาก่อน 20:00
--   เกิดเวลาติดลบ ─→ JS Math.max(0, …) เซ็ตเป็น 0 → OT หาย แต่ DB ยังมีค่าผิด
--
-- ── patch โค้ดแก้แล้ว 2 ไฟล์ (forward-fix):
--    • src/app/app/leave/new/page.tsx        (ฟอร์มพนักงาน)
--    • src/app/admin/work-record/[id]/DetailModal.tsx  (admin add OT)
-- ════════════════════════════════════════════════════════════════════

-- ─── STEP 1: PREVIEW ──────────────────────────────────────────────

-- 1A) นับ overtime_requests ที่ ot_end <= ot_start
SELECT
  COUNT(*) AS total_broken,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved_broken,
  COUNT(*) FILTER (WHERE status = 'pending')  AS pending_broken,
  MIN(work_date) AS oldest_date,
  MAX(work_date) AS newest_date
FROM overtime_requests
WHERE ot_start IS NOT NULL AND ot_end IS NOT NULL
  AND ot_end <= ot_start;

-- 1B) ดูตัวอย่าง 30 รายการที่ผิด (ล่าสุดก่อน)
SELECT
  o.id, e.employee_code, e.first_name_th, e.last_name_th,
  o.work_date, o.status,
  o.ot_start AT TIME ZONE 'Asia/Bangkok' AS start_bkk,
  o.ot_end   AT TIME ZONE 'Asia/Bangkok' AS end_bkk,
  ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)::INT AS raw_min,
  ROUND(EXTRACT(EPOCH FROM ((o.ot_end + INTERVAL '1 day') - o.ot_start)) / 60)::INT AS fixed_min
FROM overtime_requests o
JOIN employees e ON e.id = o.employee_id
WHERE o.ot_start IS NOT NULL AND o.ot_end IS NOT NULL
  AND o.ot_end <= o.ot_start
ORDER BY o.work_date DESC
LIMIT 30;


-- ═══ STEP 2: FIX ─ บวก 1 วันใน ot_end + recompute + clear manual override ═══
-- ⚠️ ทั้งหมดอยู่ใน DO block เดียว — atomic, ปลอดภัย, ทำงานทีละ statement
--    ไม่ใช้ TEMP TABLE / BEGIN-COMMIT (เลี่ยงปัญหา Supabase SQL Editor)
-- ─────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_fixed_ot         INT;
  v_updated_att      INT;
  v_reset_payroll    INT;
  v_remaining_broken INT;
BEGIN
  -- ── 2A) แก้ overtime_requests: บวก 1 วันให้ ot_end เมื่อ ot_end <= ot_start ──
  UPDATE overtime_requests
  SET ot_end = ot_end + INTERVAL '1 day'
  WHERE ot_start IS NOT NULL
    AND ot_end   IS NOT NULL
    AND ot_end  <= ot_start;
  GET DIAGNOSTICS v_fixed_ot = ROW_COUNT;
  RAISE NOTICE '→ บวก 1 วันให้ ot_end: % รายการ', v_fixed_ot;

  -- ── 2B) recompute attendance_records.ot_minutes "ทั้งหมด" จาก approved OT ──
  --        (Supabase SQL Editor เห็นค่าใหม่หลัง 2A เพราะ DO block ทำตามลำดับ)
  WITH expected AS (
    SELECT
      o.employee_id, o.work_date,
      SUM(GREATEST(0,
        ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)
      ))::INT AS total_min
    FROM overtime_requests o
    WHERE o.status = 'approved'
      AND o.ot_start IS NOT NULL
      AND o.ot_end   IS NOT NULL
    GROUP BY o.employee_id, o.work_date
  )
  UPDATE attendance_records ar
  SET ot_minutes = COALESCE(e.total_min, 0),
      updated_at = now()
  FROM expected e
  WHERE ar.employee_id = e.employee_id
    AND ar.work_date   = e.work_date
    AND ar.ot_minutes <> COALESCE(e.total_min, 0);
  GET DIAGNOSTICS v_updated_att = ROW_COUNT;
  RAISE NOTICE '→ resync attendance.ot_minutes: % รายการ', v_updated_att;

  -- ── 2C) Clear is_manual_override บน payroll พ.ค. 2026 (ที่ยังไม่จ่าย) ──
  --        ถ้าไม่ clear → API จะเก็บค่า OT เก่าไว้ตอน recalc
  UPDATE payroll_records
  SET is_manual_override = false,
      status             = 'draft',
      updated_at         = now()
  WHERE year  = 2026
    AND month = 5
    AND status <> 'paid';
  GET DIAGNOSTICS v_reset_payroll = ROW_COUNT;
  RAISE NOTICE '→ reset payroll พ.ค. 2026 → draft: % รายการ', v_reset_payroll;

  -- ── verify ──
  SELECT COUNT(*) INTO v_remaining_broken
  FROM overtime_requests
  WHERE ot_start IS NOT NULL
    AND ot_end   IS NOT NULL
    AND ot_end  <= ot_start;
  RAISE NOTICE '✓ overtime_requests ที่ยัง broken เหลือ: %', v_remaining_broken;
END $$;

NOTIFY pgrst, 'reload schema';

-- ═══ STEP 3: หลังรัน SQL ═══════════════════════════════════════════
-- 1) deploy code ที่ patch แล้ว 2 ไฟล์ (กัน bug เกิดใหม่)
-- 2) เข้า /admin/payroll → กด "คำนวณใหม่ทั้งหมด" (bulk recalculate)
--    → ครั้งนี้ is_manual_override เป็น false แล้ว → API จะ recompute OT ใหม่จริงๆ
-- 3) ยอด OT ทุกคนในงวด พ.ค. 2026 จะตรงกับ Pro Max
-- ═══════════════════════════════════════════════════════════════════
