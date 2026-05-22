-- ════════════════════════════════════════════════════════════════════
-- Fix: attendance_records.ot_minutes ค่าเก่าค้าง
--
-- บัค: ตอน OT ถูก reject/cancel → ค่า ot_minutes ใน attendance_records
--      ไม่ลด → หน้า work-record Pro Max + payroll แสดง OT สูงเกินจริง
--
-- สคริปต์นี้ recompute ot_minutes จาก overtime_requests ที่ status='approved'
-- (source of truth) ให้ทุก record ที่ค่าไม่ตรงกัน
-- ════════════════════════════════════════════════════════════════════

-- ═══ 0) Preview: ตรวจดูก่อนว่ามี record กี่อันที่ค่าไม่ตรง ═══
WITH true_ot AS (
  SELECT
    employee_id,
    work_date,
    COALESCE(SUM(EXTRACT(EPOCH FROM (ot_end - ot_start)) / 60)::int, 0) AS true_ot_min
  FROM overtime_requests
  WHERE status = 'approved'
    AND ot_start IS NOT NULL
    AND ot_end   IS NOT NULL
  GROUP BY employee_id, work_date
)
SELECT
  a.employee_id,
  e.employee_code,
  e.first_name_th, e.last_name_th,
  a.work_date,
  a.ot_minutes  AS current_ot_min,
  COALESCE(t.true_ot_min, 0) AS correct_ot_min,
  a.ot_minutes - COALESCE(t.true_ot_min, 0) AS drift_min
FROM attendance_records a
LEFT JOIN true_ot t
  ON t.employee_id = a.employee_id AND t.work_date = a.work_date
LEFT JOIN employees e ON e.id = a.employee_id
WHERE a.ot_minutes IS NOT NULL
  AND a.ot_minutes <> COALESCE(t.true_ot_min, 0)
ORDER BY ABS(a.ot_minutes - COALESCE(t.true_ot_min, 0)) DESC
LIMIT 200;

-- ═══ 1) Fix: update attendance_records.ot_minutes ให้ตรงกับ approved OT ═══
WITH true_ot AS (
  SELECT
    employee_id,
    work_date,
    COALESCE(SUM(EXTRACT(EPOCH FROM (ot_end - ot_start)) / 60)::int, 0) AS true_ot_min
  FROM overtime_requests
  WHERE status = 'approved'
    AND ot_start IS NOT NULL
    AND ot_end   IS NOT NULL
  GROUP BY employee_id, work_date
)
UPDATE attendance_records a
SET ot_minutes = COALESCE(t.true_ot_min, 0),
    updated_at = now()
FROM true_ot t
WHERE t.employee_id = a.employee_id
  AND t.work_date   = a.work_date
  AND a.ot_minutes  <> COALESCE(t.true_ot_min, 0);

-- ═══ 2) เซต ot_minutes = 0 สำหรับวันที่มี attendance แต่ "ไม่มี" approved OT แล้ว ═══
--    (กรณี OT ทั้งหมดของวันนั้นถูก cancel/reject แต่ค่ายังค้าง)
UPDATE attendance_records a
SET ot_minutes = 0,
    updated_at = now()
WHERE a.ot_minutes > 0
  AND NOT EXISTS (
    SELECT 1 FROM overtime_requests o
    WHERE o.employee_id = a.employee_id
      AND o.work_date   = a.work_date
      AND o.status      = 'approved'
      AND o.ot_start IS NOT NULL
      AND o.ot_end   IS NOT NULL
  );

-- ═══ 3) Verify: หลัง fix แล้ว ทุก attendance.ot_minutes ควรตรงกับ approved OT ═══
SELECT
  COUNT(*) FILTER (WHERE a.ot_minutes <> COALESCE(t.true_ot_min, 0)) AS still_drifting,
  COUNT(*) AS total_records
FROM attendance_records a
LEFT JOIN (
  SELECT
    employee_id, work_date,
    COALESCE(SUM(EXTRACT(EPOCH FROM (ot_end - ot_start)) / 60)::int, 0) AS true_ot_min
  FROM overtime_requests
  WHERE status = 'approved' AND ot_start IS NOT NULL AND ot_end IS NOT NULL
  GROUP BY employee_id, work_date
) t ON t.employee_id = a.employee_id AND t.work_date = a.work_date
WHERE a.ot_minutes IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรัน:
--   - attendance_records.ot_minutes จะตรงกับ approved OT ทั้งระบบ
--   - หน้า work-record Pro Max จะแสดง OT ตามจริง
--   - payroll_records ยังคงค่าเดิม → ต้องกดปุ่ม "รีเฟรช" ในหน้าเงินเดือน
--     หรือรอ bgRecalculate (5 นาที / Realtime ที่ attendance.updated_at เปลี่ยน)
-- ════════════════════════════════════════════════════════════════════
