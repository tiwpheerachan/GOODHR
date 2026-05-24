-- ════════════════════════════════════════════════════════════════════
-- Fix: ลบ attendance_records ที่ซ้ำ (employee_id, work_date)
-- ────────────────────────────────────────────────────────────────────
-- เคสจริง: โกศล (69000018) มี OT จริง 8 ชม → payroll คิดเป็น 34 ชม
-- เพราะ payroll loop รวม ot_minutes จาก rows ซ้ำกัน
--
-- Pro Max: ใช้ Map(work_date → record) → dedupe โดยอัตโนมัติ
-- Payroll (ก่อน patch นี้): for...of records[] → sum ทุก row ที่ซ้ำ
--
-- ── patch โค้ดแก้แล้วใน 3 ไฟล์:
--    • src/app/api/payroll/route.ts
--    • src/app/api/payroll/bulk/route.ts
--    • src/app/api/admin/approvals/route.ts
--
-- ── SQL นี้: cleanup ข้อมูลซ้ำที่ค้างอยู่ในตาราง + เพิ่ม UNIQUE constraint
-- ════════════════════════════════════════════════════════════════════

-- ─────────── STEP 1: PREVIEW — ดูว่ามีกี่ duplicate (read-only) ───────────

-- 1A) นับ duplicate ทั้งระบบ
SELECT
  COUNT(*)                                          AS total_dup_groups,
  SUM(cnt - 1)                                      AS total_extra_rows_to_delete,
  COUNT(DISTINCT employee_id)                       AS affected_employees
FROM (
  SELECT employee_id, work_date, COUNT(*) AS cnt
  FROM attendance_records
  GROUP BY employee_id, work_date
  HAVING COUNT(*) > 1
) x;

-- 1B) ดู duplicate ของโกศล (69000018) เดือนปัจจุบัน
SELECT
  a.work_date,
  COUNT(*)                            AS row_count,
  STRING_AGG(a.id::text, ', ')        AS row_ids,
  STRING_AGG(a.ot_minutes::text, ', ') AS ot_minutes_values,
  STRING_AGG(a.status::text, ', ')     AS statuses,
  STRING_AGG(COALESCE(a.clock_in::text, 'null'), ', ')  AS clock_ins,
  STRING_AGG(COALESCE(a.updated_at::text, 'null'), ', ') AS updated_ats
FROM attendance_records a
JOIN employees e ON e.id = a.employee_id
WHERE e.employee_code = '69000018'
  AND a.work_date >= '2026-04-22'
  AND a.work_date <= '2026-05-21'
GROUP BY a.work_date
HAVING COUNT(*) > 1
ORDER BY a.work_date;

-- 1C) top 20 พนักงานที่มี duplicate มากสุด
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  COUNT(*) AS dup_dates,
  SUM(x.cnt - 1) AS extra_rows
FROM (
  SELECT employee_id, work_date, COUNT(*) AS cnt
  FROM attendance_records
  GROUP BY employee_id, work_date
  HAVING COUNT(*) > 1
) x
JOIN employees e ON e.id = x.employee_id
GROUP BY e.employee_code, e.first_name_th, e.last_name_th
ORDER BY extra_rows DESC
LIMIT 20;

-- 1D) ◆ คนอื่นๆในงวด พ.ค. 2026 (22 เม.ย.–21 พ.ค.) ที่ payroll.ot_weekday_minutes
--      ผิด เพราะนับ duplicate (แสดง: ใน payroll มี vs ที่ควรเป็นถ้า dedupe)
WITH att_dedup AS (
  SELECT DISTINCT ON (a.employee_id, a.work_date)
    a.employee_id, a.work_date, a.ot_minutes, a.status
  FROM attendance_records a
  WHERE a.work_date >= '2026-04-22'
    AND a.work_date <= '2026-05-21'
  ORDER BY a.employee_id, a.work_date,
    (a.clock_in IS NOT NULL) DESC,
    a.updated_at DESC NULLS LAST,
    a.id DESC
),
att_raw_sum AS (
  -- สุ่ม sum แบบ "ไม่ dedupe" — เลียน payroll bug
  SELECT employee_id, SUM(COALESCE(ot_minutes, 0))::INT AS raw_total
  FROM attendance_records
  WHERE work_date >= '2026-04-22' AND work_date <= '2026-05-21'
  GROUP BY employee_id
),
att_dedup_sum AS (
  SELECT employee_id, SUM(COALESCE(ot_minutes, 0))::INT AS dedup_total
  FROM att_dedup
  GROUP BY employee_id
)
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  p.ot_weekday_minutes      AS payroll_บันทึก_เดิม,
  r.raw_total                AS sum_raw_inflated,
  d.dedup_total              AS sum_ที่ควรเป็น,
  r.raw_total - d.dedup_total AS ส่วนเกิน_จาก_dup,
  ROUND(d.dedup_total::numeric / 60, 2) AS ชม_ที่ควรเป็น,
  ROUND(p.ot_weekday_minutes::numeric / 60, 2) AS ชม_payroll_เดิม
FROM payroll_records p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN att_raw_sum   r ON r.employee_id = p.employee_id
LEFT JOIN att_dedup_sum d ON d.employee_id = p.employee_id
WHERE p.year = 2026 AND p.month = 5
  AND (
    p.ot_weekday_minutes <> COALESCE(d.dedup_total, 0)
    OR r.raw_total <> COALESCE(d.dedup_total, 0)
  )
ORDER BY ABS(p.ot_weekday_minutes - COALESCE(d.dedup_total, 0)) DESC
LIMIT 50;

-- 1E) ◆ Cross-check: attendance.ot_minutes (หลัง dedupe) vs approved overtime_requests
--      ถ้าไม่ตรง = ot_minutes หลุดจาก source of truth (ไม่เกี่ยวกับ duplicate)
WITH att_dedup AS (
  SELECT DISTINCT ON (a.employee_id, a.work_date)
    a.employee_id, a.work_date, a.ot_minutes
  FROM attendance_records a
  WHERE a.work_date >= '2026-04-22' AND a.work_date <= '2026-05-21'
  ORDER BY a.employee_id, a.work_date,
    (a.clock_in IS NOT NULL) DESC, a.updated_at DESC NULLS LAST, a.id DESC
),
approved_ot AS (
  SELECT
    employee_id, work_date,
    SUM(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (ot_end - ot_start)) / 60)))::INT AS req_min
  FROM overtime_requests
  WHERE status = 'approved'
    AND ot_start IS NOT NULL AND ot_end IS NOT NULL
    AND work_date >= '2026-04-22' AND work_date <= '2026-05-21'
  GROUP BY employee_id, work_date
)
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  d.work_date,
  d.ot_minutes         AS attendance_เดิม,
  COALESCE(o.req_min, 0) AS req_ที่อนุมัติ,
  d.ot_minutes - COALESCE(o.req_min, 0) AS diff
FROM att_dedup d
JOIN employees e ON e.id = d.employee_id
LEFT JOIN approved_ot o ON o.employee_id = d.employee_id AND o.work_date = d.work_date
WHERE d.ot_minutes <> COALESCE(o.req_min, 0)
ORDER BY ABS(d.ot_minutes - COALESCE(o.req_min, 0)) DESC
LIMIT 50;


-- ═════════ STEP 2: FIX — ลบ duplicate (เก็บ row ที่ "ดีที่สุด") ═════════

BEGIN;

-- เลือก row ที่จะ KEEP ต่อ (employee_id, work_date) ด้วย logic:
--   1. มี clock_in ก่อน (มาทำงานจริง > absent)
--   2. ถ้าเสมอ — เอา updated_at ล่าสุด
--   3. ถ้ายังเสมอ — เอา created_at ล่าสุด
--   4. ถ้ายังเสมอ — id ใหญ่สุด

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY employee_id, work_date
      ORDER BY
        (clock_in IS NOT NULL) DESC,        -- มี clock_in มาก่อน
        updated_at DESC NULLS LAST,
        created_at DESC NULLS LAST,
        id DESC
    ) AS rn
  FROM attendance_records
)
DELETE FROM attendance_records
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- เพิ่ม UNIQUE constraint กัน duplicate ในอนาคต
-- (ถ้ามีอยู่แล้วจะ skip ใน DO block ด้านล่าง)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attendance_records_employee_work_date_key'
  ) THEN
    ALTER TABLE attendance_records
      ADD CONSTRAINT attendance_records_employee_work_date_key
      UNIQUE (employee_id, work_date);
    RAISE NOTICE '✓ เพิ่ม UNIQUE (employee_id, work_date) สำเร็จ';
  ELSE
    RAISE NOTICE 'UNIQUE constraint มีอยู่แล้ว — skip';
  END IF;
END $$;

-- ── verify หลังลบ ──
DO $$
DECLARE
  v_dup_count INT;
  v_kosol_rows INT;
  v_kosol_ot   INT;
BEGIN
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT 1 FROM attendance_records
    GROUP BY employee_id, work_date
    HAVING COUNT(*) > 1
  ) x;

  SELECT COUNT(*), COALESCE(SUM(a.ot_minutes), 0)
    INTO v_kosol_rows, v_kosol_ot
  FROM attendance_records a
  JOIN employees e ON e.id = a.employee_id
  WHERE e.employee_code = '69000018'
    AND a.work_date >= '2026-04-22'
    AND a.work_date <= '2026-05-21';

  RAISE NOTICE '✓ duplicate ที่เหลือทั้งระบบ: %', v_dup_count;
  RAISE NOTICE '✓ โกศล 69000018 — rows: %, OT รวม: % นาที (= % ชม)',
    v_kosol_rows, v_kosol_ot, ROUND(v_kosol_ot::numeric / 60, 2);
END $$;

-- mark payroll_records ของเดือนนี้ให้ recalc
UPDATE payroll_records
SET status = 'draft', updated_at = now()
WHERE year = 2026 AND month = 5
  AND status <> 'paid';

COMMIT;


-- ═══════ STEP 3: หลังรัน SQL ═══════
-- 1) deploy โค้ดที่ patch แล้ว (3 ไฟล์ใน /api/...) เพื่อกัน duplicate ในอนาคต
-- 2) เข้า /admin/payroll → กด "คำนวณใหม่ทั้งหมด" สำหรับงวด พ.ค. 2026
-- 3) ของโกศลควรกลับเป็น OT 1.5x = 480 นาที ตรงกับ Pro Max

NOTIFY pgrst, 'reload schema';
