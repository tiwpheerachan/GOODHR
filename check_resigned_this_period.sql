-- ════════════════════════════════════════════════════════════════════
-- ตรวจคนที่ "ลาออกในรอบเงินเดือนนี้"
--   = resign_date อยู่ระหว่าง period.start_date ถึง period.end_date
--   ของงวดเงินเดือนล่าสุด
--
--   ใช้สำหรับเช็คว่าคนกลุ่มนี้ยัง:
--   - แสดงในตาราง /admin/payroll (ระบบใหม่จะไม่ซ่อน เพราะลาออกในงวดนี้)
--   - มี payroll_record (ต้องคำนวณเงินสุดท้าย)
--   - บัญชี active หรือ inactive
-- ════════════════════════════════════════════════════════════════════

-- ─── (0) ดู "งวดเงินเดือนปัจจุบัน" ที่จะใช้อ้างอิง ──────────────────
SELECT id, year, month, period_name, start_date, end_date, status
FROM payroll_periods
ORDER BY end_date DESC
LIMIT 1;


-- ─── (1) สรุปคนลาออกในงวดล่าสุด ────────────────────────────────────
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT
  COUNT(*) FILTER (WHERE e.resign_date BETWEEN p.start_date AND p.end_date)
                                                                AS ลาออกในงวดนี้,
  COUNT(*) FILTER (WHERE e.resign_date BETWEEN p.start_date AND p.end_date
                       AND pr.id IS NOT NULL)                   AS มี_payroll_record,
  COUNT(*) FILTER (WHERE e.resign_date BETWEEN p.start_date AND p.end_date
                       AND e.is_active = false)                 AS บัญชีถูกปิดเเล้ว,
  COUNT(*) FILTER (WHERE e.resign_date BETWEEN p.start_date AND p.end_date
                       AND e.is_active = true)                  AS บัญชียัง_active
FROM employees e
CROSS JOIN p
LEFT JOIN payroll_records pr
       ON pr.employee_id = e.id AND pr.payroll_period_id = p.id
WHERE e.resign_date IS NOT NULL;


-- ─── (2) รายชื่อคนลาออกในงวดนี้ — รายละเอียดเต็ม ──────────────────
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT
  e.employee_code                              AS รหัส,
  e.first_name_th || ' ' || e.last_name_th     AS ชื่อ,
  e.nickname                                   AS ชื่อเล่น,
  d.name                                       AS แผนก,
  pos.name                                     AS ตำแหน่ง,
  c.code                                       AS บริษัท,
  e.employment_status                          AS สถานะการจ้าง,
  e.is_active                                  AS บัญชี_active,
  e.hire_date                                  AS เริ่มงาน,
  e.resign_date                                AS ลาออก,
  (e.resign_date - p.start_date + 1)           AS วันทำงานในงวด,
  (p.end_date - e.resign_date)                 AS วันหลังลาออกในงวด,
  -- payroll record (ถ้ามี)
  pr.id IS NOT NULL                            AS มี_payroll_record,
  pr.base_salary                               AS ฐานเงินเดือน,
  pr.prorate_days                              AS prorate_days,
  pr.absent_days                               AS วันขาด_นับ,
  pr.deduct_absent::int                        AS หัก_absent,
  pr.net_salary::int                           AS เงินสุทธิ,
  CASE
    WHEN e.is_active = false THEN '🔒 ปิดบัญชีแล้ว'
    WHEN e.is_active = true  THEN '🟢 บัญชียังเปิด'
  END                                          AS สถานะบัญชี
FROM employees e
CROSS JOIN p
LEFT JOIN payroll_records pr
       ON pr.employee_id = e.id AND pr.payroll_period_id = p.id
LEFT JOIN departments d   ON d.id = e.department_id
LEFT JOIN positions pos   ON pos.id = e.position_id
LEFT JOIN companies c     ON c.id = e.company_id
WHERE e.resign_date IS NOT NULL
  AND e.resign_date BETWEEN p.start_date AND p.end_date
ORDER BY e.resign_date, e.employee_code;


-- ─── (3) เคสน่ากังวล: ลาออกในงวด + ปิดบัญชีแล้ว + ไม่มี payroll_record ──
--    คนกลุ่มนี้ "หายไป" — ไม่มีอะไรคำนวณเงินเดือนสุดท้ายให้
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT
  e.employee_code                              AS รหัส,
  e.first_name_th || ' ' || e.last_name_th     AS ชื่อ,
  e.nickname                                   AS ชื่อเล่น,
  e.is_active                                  AS active,
  e.deleted_at                                 AS deleted_at,
  e.resign_date                                AS ลาออก,
  '⚠️ ต้องสร้าง payroll record ให้ก่อนปิดบัญชี' AS แจ้งเตือน
FROM employees e
CROSS JOIN p
LEFT JOIN payroll_records pr
       ON pr.employee_id = e.id AND pr.payroll_period_id = p.id
WHERE e.resign_date BETWEEN p.start_date AND p.end_date
  AND pr.id IS NULL
ORDER BY e.resign_date;


-- ─── (4) เคสน่ากังวล: ลาออกในงวด + มี payroll + ระบบนับ absent ผิด ──
--    คนลาออกในงวดแต่ระบบยังหัก absent เยอะ (น่าจะเป็น bug ที่เพิ่งแก้)
WITH p AS (
  SELECT id, year, month, start_date, end_date
  FROM payroll_periods
  ORDER BY end_date DESC
  LIMIT 1
)
SELECT
  e.employee_code                              AS รหัส,
  e.first_name_th || ' ' || e.last_name_th     AS ชื่อ,
  e.resign_date                                AS ลาออก,
  (p.end_date - e.resign_date)                 AS วันหลังลาออก,
  pr.absent_days                               AS วันขาด_ระบบนับ,
  pr.deduct_absent::int                        AS หัก_absent_บาท,
  -- ประมาณ "หักที่ควรจะลด" หลังกด "คำนวณใหม่"
  ROUND((pr.base_salary / 30.0) * GREATEST(0, p.end_date - e.resign_date))::int
                                               AS ประมาณหักที่ลดได้
FROM employees e
JOIN p ON true
JOIN payroll_records pr
  ON pr.employee_id = e.id AND pr.payroll_period_id = p.id
WHERE e.resign_date BETWEEN p.start_date AND p.end_date
  AND pr.absent_days > 0                       -- ระบบมีนับ absent
ORDER BY pr.deduct_absent DESC;
