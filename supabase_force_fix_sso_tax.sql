-- ════════════════════════════════════════════════════════════════════
-- FORCE FIX: SSO + Tax สำหรับงวดเดือน 5/2026
--
-- รันได้หลายรอบ — idempotent (ถ้าค่าถูกแล้วจะข้าม)
-- ใช้กับ 3 คนนี้: ธนบดี, มงคล, ณรงค์ฤทธิ์ + คนอื่นที่ตั้ง flag เหมือนกัน
--
-- ⚠️ คำเตือน: รันทุก section ต่อกัน (1 → 2 → 3 → 4)
--    ไม่ต้องเปิด/ปิด/รอ — รันทั้งหมดเป็น batch
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) BEFORE: state ปัจจุบัน ═══
SELECT '── BEFORE ──' AS phase, count(*) AS rows_to_fix
FROM payroll_records pr
LEFT JOIN salary_structures s ON s.employee_id = pr.employee_id AND s.effective_to IS NULL
WHERE pr.year = 2026 AND pr.month = 5
  AND (
    (s.is_sso_exempt = true AND COALESCE(pr.social_security_amount, 0) > 0)
    OR (s.is_tax_3pct = true
        AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1)
  );

-- ═══ 2) FIX SSO: force 0 สำหรับคนที่ is_sso_exempt = true ═══
UPDATE payroll_records pr
SET
  social_security_amount = 0,
  taxable_income = pr.gross_income,
  total_deductions = GREATEST(0, COALESCE(pr.total_deductions, 0) - COALESCE(pr.social_security_amount, 0)),
  net_salary = COALESCE(pr.net_salary, 0) + COALESCE(pr.social_security_amount, 0),
  updated_at = now()
FROM salary_structures s
WHERE s.employee_id = pr.employee_id
  AND s.effective_to IS NULL
  AND s.is_sso_exempt = true
  AND pr.year = 2026 AND pr.month = 5
  AND COALESCE(pr.social_security_amount, 0) > 0;

-- ═══ 3) FIX TAX: force 3% × gross สำหรับคนที่ is_tax_3pct = true ═══
-- ใช้ subquery สดเพื่อให้ correct_tax อ่าน gross_income หลัง section 2 update
WITH targets AS (
  SELECT
    pr.id,
    ROUND(pr.gross_income * 0.03) AS correct_tax,
    COALESCE(pr.monthly_tax_withheld, 0) AS old_tax,
    COALESCE(pr.total_deductions, 0)     AS old_total_ded,
    COALESCE(pr.net_salary, 0)           AS old_net
  FROM payroll_records pr
  JOIN salary_structures s ON s.employee_id = pr.employee_id AND s.effective_to IS NULL
  WHERE s.is_tax_3pct = true
    AND pr.year = 2026 AND pr.month = 5
    AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1
)
UPDATE payroll_records pr
SET
  monthly_tax_withheld = t.correct_tax,
  total_deductions     = t.old_total_ded - t.old_tax + t.correct_tax,
  net_salary           = t.old_net + t.old_tax - t.correct_tax,
  updated_at           = now()
FROM targets t
WHERE pr.id = t.id;

-- ═══ 4) AFTER: verify ═══
SELECT '── AFTER ──' AS phase, count(*) AS rows_still_wrong
FROM payroll_records pr
LEFT JOIN salary_structures s ON s.employee_id = pr.employee_id AND s.effective_to IS NULL
WHERE pr.year = 2026 AND pr.month = 5
  AND (
    (s.is_sso_exempt = true AND COALESCE(pr.social_security_amount, 0) > 0)
    OR (s.is_tax_3pct = true
        AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1)
  );

-- ═══ 5) แสดง state ใหม่ของพนักงานที่กระทบ ═══
SELECT
  e.employee_code,
  e.first_name_th,
  s.is_sso_exempt, s.is_tax_3pct,
  pr.gross_income,
  pr.social_security_amount AS sso,
  pr.monthly_tax_withheld   AS tax,
  pr.total_deductions,
  pr.net_salary
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
LEFT JOIN salary_structures s ON s.employee_id = pr.employee_id AND s.effective_to IS NULL
WHERE pr.year = 2026 AND pr.month = 5
  AND (s.is_sso_exempt = true OR s.is_tax_3pct = true)
ORDER BY e.employee_code;

-- ════════════════════════════════════════════════════════════════════
-- ⚠️ ระวัง: bgRecalculate อาจทับค่าที่ fix นี้ ถ้า code ใหม่ยังไม่ deploy
-- → ต้อง deploy code ใหม่ก่อน หรือป้องกัน bulk recalc ขณะตรวจ
-- ════════════════════════════════════════════════════════════════════
