-- ════════════════════════════════════════════════════════════════════
-- Refresh: late_minutes ตามกฎ grace period ปัจจุบัน
--
-- กฎ (ตาม src/lib/utils/payroll.ts):
--   - PTC ทุกแผนก → 0 นาที (หักตั้งแต่นาทีที่ 1)
--   - คลังสินค้า, Service, warehouse → 5 นาที
--   - แอดมินออนไลน์, Admin Online → 0 นาที
--   - Marketing, HR, Accounting, Sale Offline, Brand Shop, Dealer,
--     Support, KAM, Content, Graphic, MC Live Streaming, TikTok,
--     บริหาร → 10 นาที
--   - อื่นๆ → 0 นาที (default)
--
-- 📌 ปรับช่วงวันที่ในแต่ละ query (default: 2026-04-22 → 2026-05-21)
-- ════════════════════════════════════════════════════════════════════

-- ═══ 0) Preview: รายชื่อพนักงาน + grace ที่ระบบจะใช้ ═══
SELECT
  e.employee_code,
  e.first_name_th,
  e.last_name_th,
  d.name AS department,
  c.code AS company_code,
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
  END AS grace_minutes
FROM employees e
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN companies   c ON c.id = e.company_id
WHERE e.is_active = true
ORDER BY c.code, d.name, e.employee_code;

-- ═══ 1) Preview: attendance records ในช่วงที่จะถูก recalculate ═══
SELECT
  count(*)                                           AS total_records,
  count(*) FILTER (WHERE clock_in IS NOT NULL)       AS with_clock_in,
  sum(late_minutes)                                  AS current_total_late_minutes,
  sum(early_out_minutes)                             AS current_total_early_minutes
FROM attendance_records
WHERE work_date >= '2026-04-22'
  AND work_date <= '2026-05-21';

-- ═══ 2) นับจำนวน record ที่มี late > 0 ตอนนี้ — แยกตามแผนก/บริษัท ═══
SELECT
  c.code AS company,
  d.name AS department,
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
  END AS grace_minutes,
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

-- ═══ 3) Effective grace per พนักงาน (รวม per-employee override) ═══
-- ระบบมี 2 ระดับ:
--   (a) work_schedules.late_threshold_minutes — override per-คน per-ช่วงเวลา
--   (b) getLateThreshold(dept, company) — default ตามแผนก/บริษัท
SELECT
  e.employee_code,
  e.first_name_th, e.last_name_th,
  c.code AS company,
  d.name AS department,
  ws.late_threshold_minutes AS per_employee_override,
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
  END AS dept_default,
  -- effective = override ถ้ามี, fallback default
  COALESCE(ws.late_threshold_minutes,
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
LEFT JOIN LATERAL (
  SELECT late_threshold_minutes
  FROM work_schedules
  WHERE employee_id = e.id
    AND effective_to IS NULL
  ORDER BY effective_from DESC
  LIMIT 1
) ws ON true
WHERE e.is_active = true
ORDER BY c.code, d.name, e.employee_code;

-- ════════════════════════════════════════════════════════════════════
-- ✅ วิธีรีเฟชจริง (ไม่ต้องรัน SQL):
--   ไปที่หน้า /admin/attendance → เลือกช่วงวันที่ → กด "คำนวณเวลาใหม่"
--     - API: POST /api/attendance/recalc-late
--     - Recompute late/early/status ตามกฎ grace period ปัจจุบัน
--       (ตอนนี้ honor per-employee override จาก work_schedules แล้ว)
--     - Trigger payroll bulk recompute ให้ทุก period ที่กระทบ
--       (ยกเว้นงวด status=paid — งวดที่ปิดแล้วจะไม่ถูกแตะ)
--     - รองรับ overnight shift + ลาครึ่งวัน + exempt employees
-- ════════════════════════════════════════════════════════════════════
