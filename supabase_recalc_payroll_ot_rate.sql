-- ════════════════════════════════════════════════════════════════════
-- Fix: OT rate (1.0x/1.5x/3.0x) ถูกจัดผิดประเภทใน payroll_records
-- ────────────────────────────────────────────────────────────────────
-- bug: เดิม payroll คำนวณ OT bucket จาก isWorkDay() อย่างเดียว
--      • วันทำงาน → 1.5x   (weekday)
--      • วันหยุด  → 3.0x   (holiday_ot) เสมอ
-- → "OT x1.0 บนวันหยุด" ถูกจัดเป็น 3.0x → จ่ายเกิน 3 เท่า
--
-- patch แล้วใน 4 ไฟล์ (forward-fix):
--   • src/lib/utils/ot-classification.ts                    (helper ใหม่)
--   • src/app/api/payroll/route.ts                          (single calc)
--   • src/app/api/payroll/bulk/route.ts                     (bulk calc)
--   • src/app/api/admin/approvals/route.ts                  (after OT action)
--
-- SQL นี้: ตรวจสอบและ reset payroll พ.ค. 2026 ของคนที่กระทบ
-- ════════════════════════════════════════════════════════════════════

-- ─── STEP 1: PREVIEW — ดูคนที่มี approved OT แบบ x1.0 หรือ x3.0 ────

-- 1A) ทุกพนักงานที่มี approved request rate <> 1.5 (กระทบ classification)
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  o.work_date, o.ot_rate,
  ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)::INT AS req_minutes,
  CASE
    WHEN o.ot_rate <= 1.0 THEN 'ควรไป holiday_reg (1.0x)'
    WHEN o.ot_rate >= 3.0 THEN 'ควรไป holiday_ot (3.0x)'
    ELSE 'ควรไป weekday (1.5x)'
  END AS ควรเป็น
FROM overtime_requests o
JOIN employees e ON e.id = o.employee_id
WHERE o.status = 'approved'
  AND o.ot_rate <> 1.5
  AND o.work_date >= '2026-04-22' AND o.work_date <= '2026-05-21'
ORDER BY e.employee_code, o.work_date;

-- 1B) เทียบ payroll ปัจจุบัน vs ที่ควรเป็น
WITH expected AS (
  SELECT
    o.employee_id,
    SUM(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)))
      FILTER (WHERE o.ot_rate > 1.0 AND o.ot_rate < 3.0) AS exp_weekday,
    SUM(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)))
      FILTER (WHERE o.ot_rate <= 1.0) AS exp_reg,
    SUM(GREATEST(0, ROUND(EXTRACT(EPOCH FROM (o.ot_end - o.ot_start)) / 60)))
      FILTER (WHERE o.ot_rate >= 3.0) AS exp_holiday_ot
  FROM overtime_requests o
  WHERE o.status = 'approved'
    AND o.ot_start IS NOT NULL AND o.ot_end IS NOT NULL
    AND o.work_date >= '2026-04-22' AND o.work_date <= '2026-05-21'
  GROUP BY o.employee_id
)
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  p.ot_weekday_minutes      AS weekday_บันทึก,
  COALESCE(x.exp_weekday, 0) AS weekday_ควรเป็น,
  p.ot_holiday_reg_minutes  AS reg_บันทึก,
  COALESCE(x.exp_reg, 0)     AS reg_ควรเป็น,
  p.ot_holiday_ot_minutes   AS holidayOt_บันทึก,
  COALESCE(x.exp_holiday_ot, 0) AS holidayOt_ควรเป็น
FROM payroll_records p
JOIN employees e ON e.id = p.employee_id
LEFT JOIN expected x ON x.employee_id = p.employee_id
WHERE p.year = 2026 AND p.month = 5
  AND (
    p.ot_weekday_minutes     <> COALESCE(x.exp_weekday, 0)    OR
    p.ot_holiday_reg_minutes <> COALESCE(x.exp_reg, 0)        OR
    p.ot_holiday_ot_minutes  <> COALESCE(x.exp_holiday_ot, 0)
  )
ORDER BY ABS(p.ot_holiday_ot_minutes - COALESCE(x.exp_holiday_ot, 0)) DESC
LIMIT 50;


-- ═══ STEP 2: FIX — clear manual override + reset เพื่อให้ recalc ใหม่ ═══

DO $$
DECLARE
  v_reset INT;
BEGIN
  UPDATE payroll_records p
  SET is_manual_override = false,
      status             = 'draft',
      updated_at         = now()
  WHERE p.year = 2026 AND p.month = 5
    AND p.status <> 'paid'
    AND EXISTS (
      SELECT 1 FROM overtime_requests o
      WHERE o.employee_id = p.employee_id
        AND o.status = 'approved'
        AND o.work_date >= '2026-04-22' AND o.work_date <= '2026-05-21'
    );
  GET DIAGNOSTICS v_reset = ROW_COUNT;
  RAISE NOTICE '✓ reset payroll → draft: % รายการ', v_reset;
END $$;

NOTIFY pgrst, 'reload schema';

-- ═══ STEP 3: หลัง deploy code + รัน SQL ═════════════════════════════
-- เข้า /admin/payroll → กด "คำนวณใหม่ทั้งหมด" (bulk)
--   • OT x1.0 บนวันหยุด → ลงช่อง "OT 1.0x วันหยุด" ถูกต้อง
--   • OT x1.5 → "OT 1.5x วันทำงาน"
--   • OT x3.0 → "OT 3.0x วันหยุด+เลิก"
-- ═══════════════════════════════════════════════════════════════════
