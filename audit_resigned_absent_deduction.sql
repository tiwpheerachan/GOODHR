-- ════════════════════════════════════════════════════════════════════
-- Audit: หาคนที่ลาออกแล้วยังถูกหัก absent ในงวดเงินเดือน
--   bug เดิม: ระบบนับ absent ทั้งงวดแม้พนักงานจะ resign ระหว่างงวด
--   หลังจากแก้ API แล้ว → กดปุ่ม "คำนวณใหม่" จะแก้อัตโนมัติ
--
--   SQL นี้ใช้ตรวจสอบเฉพาะ — ไม่ได้แก้ข้อมูล
--   เปลี่ยน v_year/v_month ถ้าอยากเช็คงวดอื่น
-- ════════════════════════════════════════════════════════════════════

-- ─── (1) สรุปจำนวนคนที่ได้รับผลกระทบ + ยอดรวมที่หักไป ────────────────
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  WHERE year = 2026 AND month = 6      -- ⚠️ ปรับ year/month ตามต้องการ
  LIMIT 1
),
affected AS (
  SELECT
    pr.id            AS payroll_record_id,
    e.employee_code,
    e.first_name_th || ' ' || e.last_name_th        AS full_name,
    e.nickname,
    e.hire_date,
    e.resign_date,
    e.employment_status,
    pr.base_salary,
    pr.absent_days,
    pr.present_days,
    pr.deduct_absent,
    pr.net_salary,
    p.start_date AS period_start,
    p.end_date   AS period_end,
    -- จำนวนวันที่ "หลัง resign" ในงวดนี้ (เฉพาะถ้า resign ก่อน period_end)
    GREATEST(0, (p.end_date - GREATEST(e.resign_date, p.start_date))) AS days_after_resign_in_period
  FROM payroll_records pr
  JOIN p ON p.id = pr.payroll_period_id
  JOIN employees e ON e.id = pr.employee_id
  WHERE e.resign_date IS NOT NULL
    AND e.resign_date <= p.end_date           -- ลาออกในงวดหรือก่อนงวด
    AND pr.deduct_absent > 0                   -- ระบบมีหัก absent
)
SELECT
  COUNT(*)                              AS จำนวนคนที่ได้รับผลกระทบ,
  COALESCE(SUM(deduct_absent), 0)::int  AS ยอดหัก_absent_รวม,
  COALESCE(MIN(deduct_absent), 0)::int  AS หักน้อยสุด,
  COALESCE(MAX(deduct_absent), 0)::int  AS หักมากสุด,
  ROUND(AVG(deduct_absent), 2)          AS หักเฉลี่ย
FROM affected;


-- ─── (2) รายชื่อคนที่โดนหัก — รายละเอียดเต็ม ────────────────────────
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  WHERE year = 2026 AND month = 6
  LIMIT 1
)
SELECT
  e.employee_code                                  AS รหัส,
  e.first_name_th || ' ' || e.last_name_th         AS ชื่อ,
  e.nickname                                       AS ชื่อเล่น,
  e.employment_status                              AS สถานะ,
  e.hire_date                                      AS เริ่มงาน,
  e.resign_date                                    AS ลาออก,
  p.end_date - e.resign_date                       AS วันหลังลาออกในงวด,
  pr.base_salary                                   AS ฐานเงินเดือน,
  pr.absent_days                                   AS วันขาด_ที่ระบบนับ,
  pr.present_days                                  AS วันมาทำงาน,
  pr.deduct_absent::int                            AS หัก_absent_บาท,
  pr.net_salary::int                               AS เงินสุทธิ,
  -- ประมาณ "หักที่ผิด" = ฐาน/30 × วันหลังลาออก
  ROUND((pr.base_salary / 30.0) * GREATEST(0, p.end_date - e.resign_date))::int
                                                   AS ประมาณหักที่ผิด
FROM payroll_records pr
JOIN p              ON p.id = pr.payroll_period_id
JOIN employees e    ON e.id = pr.employee_id
WHERE e.resign_date IS NOT NULL
  AND e.resign_date <= p.end_date
  AND pr.deduct_absent > 0
ORDER BY pr.deduct_absent DESC;


-- ─── (3) นอกจาก resign แล้ว — เช็คคนเข้าใหม่ที่ prorate_days = NULL ──
--    คนใหม่ที่ HR ลืมตั้ง prorate_days → ได้รับ base เต็ม + ยังโดนหัก absent
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  WHERE year = 2026 AND month = 6
  LIMIT 1
)
SELECT
  e.employee_code            AS รหัส,
  e.first_name_th || ' ' || e.last_name_th AS ชื่อ,
  e.hire_date                AS เริ่มงาน,
  p.start_date               AS งวดเริ่ม,
  e.hire_date - p.start_date AS วันที่ขาดจากงวดเริ่ม,
  pr.base_salary             AS ฐาน,
  pr.prorate_days            AS prorate_days,
  pr.absent_days             AS วันขาด,
  pr.deduct_absent::int      AS หัก_absent
FROM payroll_records pr
JOIN p              ON p.id = pr.payroll_period_id
JOIN employees e    ON e.id = pr.employee_id
WHERE e.hire_date > p.start_date     -- เข้างานหลังเริ่มงวด
  AND e.hire_date <= p.end_date
  AND pr.prorate_days IS NULL         -- HR ลืมตั้ง prorate
ORDER BY e.hire_date DESC;
