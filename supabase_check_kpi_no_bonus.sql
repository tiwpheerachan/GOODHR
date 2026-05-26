-- ════════════════════════════════════════════════════════════════════
-- ตรวจสอบ: ทำไมพนักงานที่มีเกรด KPI แล้ว แต่ไม่มีโบนัส
-- ════════════════════════════════════════════════════════════════════

-- 📌 ปรับงวด (year/month) ตรงนี้ — default: พฤษภาคม 2026
-- ⚠️ "งวดเงินเดือน" ใน DB เก็บเป็น month = เดือนจ่ายจริง (เช่น 25 พ.ค. → month=5)

-- ═══ 1) Diagnostic: ทุกคนที่ "มีเกรด KPI" แต่ "ไม่มี/น้อยมาก" ตัวเงิน ═══
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  p.name AS position,
  d.name AS department,
  c.code AS company,
  pr.kpi_grade,
  pr.kpi_standard_amount      AS std_amt,
  pr.bonus                    AS bonus_paid,
  kbs.standard_amount         AS kpi_bonus_settings_std,
  kbs.is_active               AS kpi_setting_active,
  kf.evaluation_type          AS eval_type,
  kf.incentive_amount         AS form_incentive,
  kf.bonus_amount             AS form_bonus,
  kf.status                   AS form_status,
  CASE
    WHEN pr.kpi_grade = 'D'                            THEN '✓ ตาม policy (D=0)'
    WHEN pr.kpi_grade = 'pending'                      THEN 'ℹ️ รอประเมิน'
    WHEN kbs.standard_amount IS NULL                   THEN '❌ ไม่ได้ตั้งฐาน KPI (kpi_bonus_settings)'
    WHEN COALESCE(kbs.standard_amount, 0) = 0          THEN '❌ ฐาน KPI = 0'
    WHEN kf.id IS NULL                                 THEN '❌ ไม่มี kpi_forms (หัวหน้ายังไม่ประเมิน)'
    WHEN kf.status NOT IN ('approved', 'acknowledged') THEN '⚠️ ฟอร์มยังไม่ approved (status=' || kf.status || ')'
    WHEN pr.bonus > 0                                  THEN '✓ มีเงินแล้ว'
    ELSE                                                    '⚠️ ไม่ทราบสาเหตุ'
  END AS reason
FROM payroll_records pr
JOIN employees   e ON e.id = pr.employee_id
LEFT JOIN positions   p ON p.id = e.position_id
LEFT JOIN departments d ON d.id = e.department_id
LEFT JOIN companies   c ON c.id = e.company_id
LEFT JOIN kpi_bonus_settings kbs
  ON kbs.employee_id = e.id AND kbs.is_active = true
LEFT JOIN kpi_forms kf
  ON kf.employee_id = e.id AND kf.year = pr.year AND kf.month = pr.month
WHERE pr.year  = 2026
  AND pr.month = 5
  AND pr.kpi_grade IN ('A', 'B', 'C')   -- เกรดที่ "ควรได้" เงิน
  AND COALESCE(pr.bonus, 0) = 0          -- แต่ตัวเงิน = 0
ORDER BY c.code, e.employee_code;

-- ═══ 2) Summary: นับว่ามีปัญหาประเภทไหนกี่คน ═══
SELECT
  CASE
    WHEN kbs.standard_amount IS NULL                   THEN '❌ ไม่ได้ตั้งฐาน KPI'
    WHEN COALESCE(kbs.standard_amount, 0) = 0          THEN '❌ ฐาน KPI = 0'
    WHEN kf.id IS NULL                                 THEN '❌ ไม่มี kpi_forms'
    WHEN kf.status NOT IN ('approved', 'acknowledged') THEN '⚠️ ฟอร์มยังไม่ approved'
    ELSE                                                    'อื่นๆ'
  END AS issue,
  count(*) AS pax
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
LEFT JOIN kpi_bonus_settings kbs
  ON kbs.employee_id = e.id AND kbs.is_active = true
LEFT JOIN kpi_forms kf
  ON kf.employee_id = e.id AND kf.year = pr.year AND kf.month = pr.month
WHERE pr.year  = 2026
  AND pr.month = 5
  AND pr.kpi_grade IN ('A', 'B', 'C')
  AND COALESCE(pr.bonus, 0) = 0
GROUP BY issue
ORDER BY pax DESC;

-- ════════════════════════════════════════════════════════════════════
-- 📋 วิธีแก้ตามผลลัพธ์:
--
-- ❌ ไม่ได้ตั้งฐาน KPI → ไปที่ /admin/employees/[id] → แท็บ "เงินเดือน"
--    → ส่วน "KPI Bonus" → ใส่ "ฐานเงินรางวัล" (standard_amount)
--    → แล้วกดรีเฟรชใน payslip dialog หรือรอ bgRecalculate
--
-- ❌ ไม่มี kpi_forms → ให้หัวหน้าประเมินที่ /manager/kpi
--
-- ⚠️ ฟอร์มยังไม่ approved → HR อนุมัติที่ /admin/kpi
--
-- ✓ เกรด D = ไม่ได้ตาม policy (ถ้าอยากให้ได้ → เปลี่ยน evaluation_type เป็น
--   "grade_incentive" ที่ kpi_forms.evaluation_type — จะใช้ตาราง A=5000, B=4000,
--   C=3000, D=2000 แทน)
-- ════════════════════════════════════════════════════════════════════
