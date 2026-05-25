-- ════════════════════════════════════════════════════════════════════
-- Recompute attendance_records.late_minutes ใหม่ทั้งระบบ
-- ใช้ logic เดียวกับ /api/checkin (per-employee override → dept default)
--
-- กฎ grace:
--   1) work_schedules.late_threshold_minutes (per-employee override) — ถ้ามี
--   2) Department / Company default:
--      - PTC ทุกแผนก                           → 0
--      - แอดมินออนไลน์ / Admin Online           → 0
--      - คลังสินค้า / warehouse / service       → 5
--      - Marketing, HR, Accounting, Sale Offline,
--        Brand Shop, Dealer, Support, KAM,
--        Content, Graphic, MC Live Streaming,
--        TikTok, บริหาร                         → 10
--      - อื่นๆ                                  → 0
--
-- 📌 ปรับช่วงวันที่ที่ section 1, 2, 3 (default: 22 เม.ย. – 21 พ.ค. 2026)
-- 📌 รันแบบ preview ก่อน (section 0+1) → ดูผลที่จะแก้ → แล้วค่อยรัน section 2
-- ⚠️ สคริปต์นี้ "ข้าม" overnight shift (work_end < work_start) — ให้ใช้ปุ่ม
--    "คำนวณเวลาใหม่" บน /admin/attendance สำหรับ overnight แทน
-- ════════════════════════════════════════════════════════════════════


-- ═══ 0) Preview: effective grace per พนักงาน (สำหรับ verify) ═══
WITH grace_lookup AS (
  SELECT
    e.id AS employee_id,
    e.employee_code,
    e.first_name_th,
    e.last_name_th,
    c.code AS company_code,
    d.name AS department_name,
    (SELECT ws.late_threshold_minutes
     FROM work_schedules ws
     WHERE ws.employee_id = e.id
       AND ws.late_threshold_minutes IS NOT NULL
     ORDER BY ws.effective_from DESC
     LIMIT 1) AS per_emp_override,
    CASE
      WHEN lower(c.code) LIKE '%ptc%' THEN 0
      WHEN lower(d.name) ILIKE ANY (ARRAY['%admin online%', '%แอดมินออนไลน์%']) THEN 0
      WHEN lower(d.name) ILIKE ANY (ARRAY['%คลังสินค้า%', '%warehouse%', '%service%']) THEN 5
      WHEN lower(d.name) ILIKE ANY (ARRAY[
        '%marketing%', '%การตลาด%', '%mc live streaming%', '%tiktok%',
        '%hr%', '%ทรัพยากรบุคคล%', '%บุคคล%',
        '%accounting%', '%บัญชี%',
        '%sale offline%', '%brand shop%', '%dealer%',
        '%support%', '%สนับสนุน%',
        '%kam%', '%content%', '%graphic%', '%บริหาร%'
      ]) THEN 10
      ELSE 0
    END AS dept_default
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN companies   c ON c.id = e.company_id
  WHERE e.is_active = true
)
SELECT
  employee_code, first_name_th, last_name_th,
  company_code, department_name,
  per_emp_override, dept_default,
  COALESCE(per_emp_override, dept_default) AS effective_grace
FROM grace_lookup
WHERE per_emp_override IS NOT NULL          -- show only ones with per-emp override
   OR (employee_code LIKE '66000034%')      -- + พัชรวิภา (ตัวอย่างจาก user)
ORDER BY company_code, department_name, employee_code;


-- ═══ 1) Preview: รายการ attendance ที่ late_minutes ใน DB ผิด ═══
WITH grace_lookup AS (
  SELECT
    e.id AS employee_id,
    e.is_attendance_exempt,
    COALESCE(
      (SELECT ws.late_threshold_minutes
       FROM work_schedules ws
       WHERE ws.employee_id = e.id
         AND ws.late_threshold_minutes IS NOT NULL
       ORDER BY ws.effective_from DESC
       LIMIT 1),
      CASE
        WHEN lower(c.code) LIKE '%ptc%' THEN 0
        WHEN lower(d.name) ILIKE ANY (ARRAY['%admin online%', '%แอดมินออนไลน์%']) THEN 0
        WHEN lower(d.name) ILIKE ANY (ARRAY['%คลังสินค้า%', '%warehouse%', '%service%']) THEN 5
        WHEN lower(d.name) ILIKE ANY (ARRAY[
          '%marketing%', '%การตลาด%', '%mc live streaming%', '%tiktok%',
          '%hr%', '%ทรัพยากรบุคคล%', '%บุคคล%',
          '%accounting%', '%บัญชี%',
          '%sale offline%', '%brand shop%', '%dealer%',
          '%support%', '%สนับสนุน%',
          '%kam%', '%content%', '%graphic%', '%บริหาร%'
        ]) THEN 10
        ELSE 0
      END
    ) AS effective_grace
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN companies   c ON c.id = e.company_id
),
calc AS (
  SELECT
    ar.id,
    ar.employee_id,
    ar.work_date,
    ar.clock_in,
    ar.late_minutes AS old_late,
    ar.status      AS old_status,
    eg.effective_grace,
    eg.is_attendance_exempt,
    st.work_start,
    st.is_overnight,
    ((ar.work_date::text || ' ' || st.work_start::text)::timestamp AT TIME ZONE 'Asia/Bangkok') AS expected_start,
    GREATEST(
      0,
      FLOOR(
        EXTRACT(EPOCH FROM (
          ar.clock_in - ((ar.work_date::text || ' ' || st.work_start::text)::timestamp AT TIME ZONE 'Asia/Bangkok')
        )) / 60
      )::int
    ) AS raw_late
  FROM attendance_records ar
  JOIN grace_lookup eg ON eg.employee_id = ar.employee_id
  LEFT JOIN monthly_shift_assignments msa
    ON msa.employee_id = ar.employee_id AND msa.work_date = ar.work_date
  LEFT JOIN shift_templates st ON st.id = msa.shift_id
  WHERE ar.work_date >= '2026-04-22'
    AND ar.work_date <= '2026-05-21'
    AND ar.clock_in IS NOT NULL
    AND st.work_start IS NOT NULL
    AND COALESCE(st.is_overnight, false) = false   -- skip overnight
),
new_late AS (
  SELECT
    *,
    CASE
      WHEN is_attendance_exempt THEN 0
      ELSE GREATEST(0, raw_late - effective_grace)
    END AS new_late
  FROM calc
)
SELECT
  e.employee_code,
  e.first_name_th, e.last_name_th,
  n.work_date,
  to_char(n.clock_in AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS clock_in_th,
  n.work_start::text AS shift_start,
  n.raw_late,
  n.effective_grace AS grace,
  n.old_late,
  n.new_late,
  n.new_late - n.old_late AS diff,
  CASE WHEN n.is_attendance_exempt THEN '(exempt)' ELSE '' END AS exempt
FROM new_late n
JOIN employees e ON e.id = n.employee_id
WHERE n.old_late <> n.new_late
ORDER BY e.employee_code, n.work_date
LIMIT 500;


-- ═══ 2) UPDATE: แก้ค่า late_minutes + status ในช่วงรอบเงินเดือน ═══
-- ⚠️ รันหลังจาก preview (section 1) แล้วยืนยันแล้วเท่านั้น
WITH grace_lookup AS (
  SELECT
    e.id AS employee_id,
    e.is_attendance_exempt,
    COALESCE(
      (SELECT ws.late_threshold_minutes
       FROM work_schedules ws
       WHERE ws.employee_id = e.id
         AND ws.late_threshold_minutes IS NOT NULL
       ORDER BY ws.effective_from DESC
       LIMIT 1),
      CASE
        WHEN lower(c.code) LIKE '%ptc%' THEN 0
        WHEN lower(d.name) ILIKE ANY (ARRAY['%admin online%', '%แอดมินออนไลน์%']) THEN 0
        WHEN lower(d.name) ILIKE ANY (ARRAY['%คลังสินค้า%', '%warehouse%', '%service%']) THEN 5
        WHEN lower(d.name) ILIKE ANY (ARRAY[
          '%marketing%', '%การตลาด%', '%mc live streaming%', '%tiktok%',
          '%hr%', '%ทรัพยากรบุคคล%', '%บุคคล%',
          '%accounting%', '%บัญชี%',
          '%sale offline%', '%brand shop%', '%dealer%',
          '%support%', '%สนับสนุน%',
          '%kam%', '%content%', '%graphic%', '%บริหาร%'
        ]) THEN 10
        ELSE 0
      END
    ) AS effective_grace
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN companies   c ON c.id = e.company_id
),
calc AS (
  SELECT
    ar.id,
    ar.status AS old_status,
    eg.is_attendance_exempt,
    GREATEST(
      0,
      FLOOR(
        EXTRACT(EPOCH FROM (
          ar.clock_in - ((ar.work_date::text || ' ' || st.work_start::text)::timestamp AT TIME ZONE 'Asia/Bangkok')
        )) / 60
      )::int
    ) AS raw_late,
    eg.effective_grace
  FROM attendance_records ar
  JOIN grace_lookup eg ON eg.employee_id = ar.employee_id
  LEFT JOIN monthly_shift_assignments msa
    ON msa.employee_id = ar.employee_id AND msa.work_date = ar.work_date
  LEFT JOIN shift_templates st ON st.id = msa.shift_id
  WHERE ar.work_date >= '2026-04-22'
    AND ar.work_date <= '2026-05-21'
    AND ar.clock_in IS NOT NULL
    AND st.work_start IS NOT NULL
    AND COALESCE(st.is_overnight, false) = false
),
final AS (
  SELECT
    id,
    old_status,
    CASE
      WHEN is_attendance_exempt THEN 0
      ELSE GREATEST(0, raw_late - effective_grace)
    END AS new_late
  FROM calc
)
UPDATE attendance_records ar
SET
  late_minutes = f.new_late,
  status = CASE
    WHEN f.old_status IN ('leave', 'absent') THEN f.old_status
    WHEN f.new_late > 0 THEN 'late'
    ELSE 'present'
  END,
  updated_at = now()
FROM final f
WHERE ar.id = f.id
  AND ar.late_minutes IS DISTINCT FROM f.new_late;


-- ═══ 3) Verify: หลัง update ดูตัวอย่างของพัชรวิภา ═══
SELECT
  e.employee_code, e.first_name_th, e.last_name_th,
  ar.work_date,
  to_char(ar.clock_in AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS clock_in_th,
  ar.late_minutes, ar.status,
  ar.updated_at
FROM attendance_records ar
JOIN employees e ON e.id = ar.employee_id
WHERE e.employee_code = '66000034'
  AND ar.work_date >= '2026-04-22'
  AND ar.work_date <= '2026-05-21'
ORDER BY ar.work_date;


-- ═══ 4) Verify: รวม late_minutes per บริษัท/แผนก หลัง fix ═══
SELECT
  c.code AS company,
  d.name AS department,
  count(*) FILTER (WHERE ar.late_minutes > 0) AS late_record_count,
  sum(ar.late_minutes)                        AS sum_late_minutes
FROM attendance_records ar
JOIN employees e   ON e.id = ar.employee_id
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN companies   c ON c.id = e.company_id
WHERE ar.work_date >= '2026-04-22'
  AND ar.work_date <= '2026-05-21'
GROUP BY c.code, d.name
ORDER BY c.code, d.name;


-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรัน section 2 (UPDATE):
--   - attendance_records.late_minutes ทั้งหมดตรงตามกฎใหม่ (per-emp + dept)
--   - status (late/present) sync ตามค่าใหม่
--   - payroll_records.deduct_late ยังเก่า → ต้อง:
--       * ไปหน้า /admin/payroll → กดปุ่ม "🔄 รีเฟรช" บนใบแจ้งเงินเดือน
--       * หรือรอ bgRecalculate (5 นาที / Realtime fires อัตโนมัติ)
--       * หรือเรียก POST /api/payroll/bulk
--
-- ⚠️ Overnight shifts ถูกข้าม — สำหรับกะข้ามคืน ใช้ปุ่ม "คำนวณเวลาใหม่"
--    ใน /admin/attendance (API จัดการ overnight ได้ถูกต้อง)
-- ════════════════════════════════════════════════════════════════════
