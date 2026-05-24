-- ════════════════════════════════════════════════════════════════════
-- Fix: ลบ ot_minutes ผิดทั้งระบบ → resync จาก overtime_requests (source of truth)
-- ────────────────────────────────────────────────────────────────────
-- เคสที่เจอ: โกศล (69000018) ทำ OT จริง 8 ชม แต่ payroll แสดง 2040 นาที (34 ชม)
-- สาเหตุที่อาจเกิด:
--   1. เคย approve OT ผ่าน flow เดิมที่ "บวกเพิ่ม" → reject/cancel ไม่ได้ลด
--   2. ใส่ ot_minutes ผ่าน import / manual edit แล้วไม่ตรงกับ overtime_requests
--   3. trigger / sync ผิดทาง
-- วิธีแก้: อ่าน overtime_requests ที่ status=approved ทั้งหมด → set ot_minutes ใหม่
--          (logic เดียวกับ recomputeAttendanceOtMinutes ใน /api/admin/approvals)
--
-- ⚠️ ขั้นตอนนี้แก้เฉพาะ attendance_records.ot_minutes — payroll_records ต้อง
--    "คำนวณใหม่" ผ่าน UI (กดปุ่มรีเซ็ตในหน้า payroll edit) หรือ /api/payroll/bulk
-- ════════════════════════════════════════════════════════════════════

-- ── STEP 1: PREVIEW — ดูข้อมูลปัจจุบันก่อนแก้ ──
-- (รัน select แยกเพื่อเห็นว่าจะเกิดอะไรขึ้น — ถ้า OK ค่อยรัน UPDATE)

-- 1A) สำรวจของ โกศล (69000018) เดือนนี้
SELECT
  a.work_date,
  a.status,
  a.ot_minutes                                                       AS attendance_ot_minutes_เดิม,
  COALESCE(SUM(
    EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60
  ) FILTER (WHERE o.status = 'approved'), 0)::INT                     AS ot_จาก_request_approved,
  a.ot_minutes - COALESCE(SUM(
    EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60
  ) FILTER (WHERE o.status = 'approved'), 0)::INT                     AS diff
FROM attendance_records a
LEFT JOIN overtime_requests o
  ON o.employee_id = a.employee_id AND o.work_date = a.work_date
JOIN employees e ON e.id = a.employee_id
WHERE e.employee_code = '69000018'
  AND a.work_date >= date_trunc('month', CURRENT_DATE)
  AND a.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
GROUP BY a.id, a.work_date, a.status, a.ot_minutes
ORDER BY a.work_date;

-- 1B) สรุปคนอื่นที่ ot_minutes ไม่ตรงกับ overtime_requests (ทั้งเดือนนี้)
WITH expected AS (
  SELECT
    o.employee_id, o.work_date,
    SUM(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)::INT AS exp_min
  FROM overtime_requests o
  WHERE o.status = 'approved'
    AND o.work_date >= date_trunc('month', CURRENT_DATE)
    AND o.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
    AND o.ot_start IS NOT NULL AND o.ot_end IS NOT NULL
  GROUP BY o.employee_id, o.work_date
)
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  a.work_date,
  a.ot_minutes               AS attendance_เดิม,
  COALESCE(x.exp_min, 0)      AS ควรเป็น,
  a.ot_minutes - COALESCE(x.exp_min, 0) AS diff
FROM attendance_records a
JOIN employees e ON e.id = a.employee_id
LEFT JOIN expected x ON x.employee_id = a.employee_id AND x.work_date = a.work_date
WHERE a.work_date >= date_trunc('month', CURRENT_DATE)
  AND a.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  AND a.ot_minutes <> COALESCE(x.exp_min, 0)
ORDER BY ABS(a.ot_minutes - COALESCE(x.exp_min, 0)) DESC
LIMIT 100;


-- ════════════════════════════════════════════════════════════════════
-- STEP 2: FIX — รัน BEGIN/COMMIT block นี้หลังจากเช็ค STEP 1 แล้วโอเค
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- 2A) คำนวณยอดที่ "ควรเป็น" ต่อ (employee_id, work_date) จาก approved requests เท่านั้น
WITH expected AS (
  SELECT
    o.employee_id, o.work_date,
    SUM(GREATEST(0,
      ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)
    ))::INT AS total_ot_min
  FROM overtime_requests o
  WHERE o.status = 'approved'
    AND o.ot_start IS NOT NULL AND o.ot_end IS NOT NULL
    AND o.work_date >= date_trunc('month', CURRENT_DATE)
    AND o.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  GROUP BY o.employee_id, o.work_date
)
-- 2B) update attendance_records ที่ ot_minutes ไม่ตรง
UPDATE attendance_records a
SET ot_minutes = COALESCE(x.total_ot_min, 0),
    updated_at = now()
FROM expected x
WHERE a.employee_id = x.employee_id
  AND a.work_date   = x.work_date
  AND a.ot_minutes <> COALESCE(x.total_ot_min, 0);

-- 2C) เคสที่ attendance มี ot_minutes > 0 แต่ "ไม่มี" approved request เลย → ตั้งเป็น 0
UPDATE attendance_records a
SET ot_minutes = 0, updated_at = now()
WHERE a.ot_minutes > 0
  AND a.work_date >= date_trunc('month', CURRENT_DATE)
  AND a.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  AND NOT EXISTS (
    SELECT 1 FROM overtime_requests o
    WHERE o.employee_id = a.employee_id
      AND o.work_date   = a.work_date
      AND o.status      = 'approved'
      AND o.ot_start IS NOT NULL AND o.ot_end IS NOT NULL
  );

-- 2D) Mark payroll_records ที่ได้รับผลกระทบให้ "ต้องคำนวณใหม่"
--     เซ็ต status='draft' + เคลียร์ ot fields ของคนที่ ot ใน attendance เปลี่ยน
--     (พอ UI เปิดหน้า payroll หรือกด recalc → คำนวณใหม่ครบสูตร)
UPDATE payroll_records p
SET status = 'draft', updated_at = now()
WHERE p.year  = EXTRACT(YEAR  FROM CURRENT_DATE)::INT
  AND p.month = EXTRACT(MONTH FROM CURRENT_DATE)::INT
  AND p.employee_id IN (
    SELECT DISTINCT a.employee_id
    FROM attendance_records a
    WHERE a.updated_at > now() - INTERVAL '1 minute'
      AND a.work_date >= date_trunc('month', CURRENT_DATE)
      AND a.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'
  );

-- ── verify หลังแก้ ──
DO $$
DECLARE
  v_kosol_ot INT;
BEGIN
  SELECT COALESCE(SUM(a.ot_minutes), 0) INTO v_kosol_ot
  FROM attendance_records a
  JOIN employees e ON e.id = a.employee_id
  WHERE e.employee_code = '69000018'
    AND a.work_date >= date_trunc('month', CURRENT_DATE)
    AND a.work_date <  date_trunc('month', CURRENT_DATE) + INTERVAL '1 month';
  RAISE NOTICE '✓ โกศล 69000018 — ot_minutes รวมเดือนนี้: % นาที (= % ชม)',
    v_kosol_ot, ROUND(v_kosol_ot::numeric / 60, 2);
END $$;

COMMIT;

-- ════════════════════════════════════════════════════════════════════
-- STEP 3: คำนวณ payroll ใหม่
-- ────────────────────────────────────────────────────────────────────
-- หลังจากรัน SQL นี้แล้ว ต้องเข้าหน้า admin/payroll →
--   • กดปุ่ม "คำนวณใหม่ทั้งหมด" (bulk recalculate) — เร็วสุด
--   • หรือเปิดของโกศลแล้วกด "🔄 รีเซ็ต (คำนวณใหม่)" ที่มุมล่างซ้ายของ modal
-- จะคำนวณ OT 1.5x / ot_amount / net_salary ใหม่ตามค่า ot_minutes ที่ resync แล้ว
-- ════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
