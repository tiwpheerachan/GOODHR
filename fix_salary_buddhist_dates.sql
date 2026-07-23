-- ═══════════════════════════════════════════════════════════════════
-- แก้ "หลายคนเงินเดือนไม่ขึ้น" — โครงเงินเดือนลงวันที่เป็นปี พ.ศ. (2569/2565)
--   payroll เลือกโครงที่ effective_from <= สิ้นรอบ → ปี พ.ศ. (>2100) ไม่เคยถูกเลือก
--   → base = 0 / ว่าง  (กระทบ 10 คน: ฟลุ๊ค/แอน/มีมี่/มาร์ติน/กาโม่/ติ๋ม/ปณิตา ฯลฯ)
-- วิธีแก้: ลบ 543 ปี (2569→2026, 2565→2022) ทั้ง effective_from และ effective_to
--
-- ROLLBACK (ถ้าต้องคืน): เปลี่ยน '- INTERVAL' เป็น '+ INTERVAL' และเงื่อนไข < '2000-01-01'
-- ═══════════════════════════════════════════════════════════════════

-- ดูก่อนแก้ (optional)
-- SELECT id, employee_id, base_salary, effective_from, effective_to
-- FROM salary_structures WHERE effective_from > '2100-01-01' OR effective_to > '2100-01-01';

BEGIN;

UPDATE salary_structures
SET effective_from = effective_from - INTERVAL '543 years'
WHERE effective_from > '2100-01-01';

UPDATE salary_structures
SET effective_to = effective_to - INTERVAL '543 years'
WHERE effective_to > '2100-01-01';

-- ตรวจว่าไม่เหลือปี พ.ศ. แล้ว (ควรได้ 0)
-- SELECT COUNT(*) FROM salary_structures WHERE effective_from > '2100-01-01' OR effective_to > '2100-01-01';

COMMIT;

-- เผื่อมีตารางอื่นลงปี พ.ศ. ด้วย (ตรวจเพิ่ม — ยังไม่แก้อัตโนมัติ):
-- SELECT 'employees.hire_date' t, COUNT(*) FROM employees WHERE hire_date > '2100-01-01'
-- UNION ALL SELECT 'employees.phase2_start_date', COUNT(*) FROM employees WHERE phase2_start_date > '2100-01-01'
-- UNION ALL SELECT 'kpi_bonus_settings.effective_from', COUNT(*) FROM kpi_bonus_settings WHERE effective_from > '2100-01-01';
