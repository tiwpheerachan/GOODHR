-- ═══════════════════════════════════════════════════
-- Merge TOPONE + TOP1 → เหลือแค่ TOP1
-- ═══════════════════════════════════════════════════

-- ── STEP 1: Preview — ดูข้อมูลทั้งสองบริษัทก่อน ──
SELECT id, code, name_th, name_en,
  (SELECT count(*) FROM employees e WHERE e.company_id = c.id) AS emp_count,
  (SELECT count(*) FROM branches b WHERE b.company_id = c.id) AS branch_count,
  (SELECT count(*) FROM departments d WHERE d.company_id = c.id) AS dept_count,
  (SELECT count(*) FROM positions p WHERE p.company_id = c.id) AS pos_count,
  (SELECT count(*) FROM shift_templates st WHERE st.company_id = c.id) AS shift_count,
  (SELECT count(*) FROM leave_types lt WHERE lt.company_id = c.id) AS leave_type_count
FROM companies c
WHERE code IN ('TOPONE', 'TOP1')
ORDER BY code;
