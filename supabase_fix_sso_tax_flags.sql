-- ════════════════════════════════════════════════════════════════════
-- Fix: พนักงานที่ตั้ง is_sso_exempt / is_tax_3pct แต่ payroll ยังหักเหมือนเดิม
--
-- บัค: ใน /api/payroll/bulk เดิม ใช้ pattern:
--   "ถ้า is_manual_override = true → ใช้ค่าเก่าใน payroll_records"
--   แม้ admin จะ toggle flags ใน salary_structures ใหม่ก็ตาม
-- แก้แล้ว: structural flags (is_sso_exempt / is_tax_3pct) ชนะ manual เสมอ
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) หาพนักงานที่ตั้ง flags แต่ payroll record ยังเก็บค่าผิด ═══
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  c.code AS company,
  s.is_sso_exempt,
  s.is_tax_3pct,
  pr.year, pr.month,
  pr.gross_income,
  pr.social_security_amount AS sso_in_payroll,
  pr.monthly_tax_withheld   AS tax_in_payroll,
  pr.is_manual_override,
  CASE
    WHEN s.is_sso_exempt = true AND COALESCE(pr.social_security_amount, 0) > 0
      THEN '❌ ตั้ง exempt แต่ยังหัก SSO ' || pr.social_security_amount
    WHEN s.is_tax_3pct = true
         AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1
      THEN '❌ ตั้ง 3% แต่หัก ' || pr.monthly_tax_withheld || ' (ควร ' || ROUND(pr.gross_income * 0.03) || ')'
    ELSE '✓ ปกติ'
  END AS issue
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN salary_structures s
  ON s.employee_id = e.id AND s.effective_to IS NULL
WHERE pr.year = 2026 AND pr.month = 5
  AND (
    (s.is_sso_exempt = true AND COALESCE(pr.social_security_amount, 0) > 0)
    OR (s.is_tax_3pct = true
        AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1)
  )
ORDER BY c.code, e.employee_code;

-- ═══ 2) Fix SSO: คนที่ is_sso_exempt = true → force sso = 0 ═══
UPDATE payroll_records pr
SET
  social_security_amount = 0,
  -- recompute taxable_income + total_deductions + net
  taxable_income = pr.gross_income,
  total_deductions = GREATEST(0, pr.total_deductions - COALESCE(pr.social_security_amount, 0)),
  net_salary = pr.net_salary + COALESCE(pr.social_security_amount, 0),
  updated_at = now()
FROM salary_structures s
WHERE s.employee_id = pr.employee_id
  AND s.effective_to IS NULL
  AND s.is_sso_exempt = true
  AND pr.year = 2026 AND pr.month = 5
  AND COALESCE(pr.social_security_amount, 0) > 0;

-- ═══ 3) Fix Tax 3%: คนที่ is_tax_3pct = true → force tax = 3% × gross ═══
WITH targets AS (
  SELECT
    pr.id,
    ROUND(pr.gross_income * 0.03) AS correct_tax,
    pr.monthly_tax_withheld       AS old_tax
  FROM payroll_records pr
  JOIN salary_structures s ON s.employee_id = pr.employee_id AND s.effective_to IS NULL
  WHERE s.is_tax_3pct = true
    AND pr.year = 2026 AND pr.month = 5
    AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1
)
UPDATE payroll_records pr
SET
  monthly_tax_withheld = t.correct_tax,
  total_deductions = pr.total_deductions - t.old_tax + t.correct_tax,
  net_salary = pr.net_salary + t.old_tax - t.correct_tax,
  updated_at = now()
FROM targets t
WHERE pr.id = t.id;

-- ═══ 4) Verify: หลัง fix ควรไม่เหลือ ═══
SELECT
  count(*) AS still_wrong
FROM payroll_records pr
LEFT JOIN salary_structures s
  ON s.employee_id = pr.employee_id AND s.effective_to IS NULL
WHERE pr.year = 2026 AND pr.month = 5
  AND (
    (s.is_sso_exempt = true AND COALESCE(pr.social_security_amount, 0) > 0)
    OR (s.is_tax_3pct = true
        AND ABS(COALESCE(pr.monthly_tax_withheld, 0) - ROUND(pr.gross_income * 0.03)) > 1)
  );

-- ════════════════════════════════════════════════════════════════════
-- ✅ หลังรัน section 2 + 3:
--   - SSO = 0 สำหรับคนที่ตั้ง exempt
--   - Tax = 3% × gross สำหรับคนที่ตั้ง is_tax_3pct
--   - net_salary, total_deductions, taxable_income ปรับให้สมดุล
--   - หน้าใบแจ้งเงินเดือนจะแสดงค่าใหม่หลัง refresh
-- ════════════════════════════════════════════════════════════════════
