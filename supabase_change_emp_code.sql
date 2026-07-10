-- ════════════════════════════════════════════════════════════════════
-- เปลี่ยน employee_code: 4270537019 → 69000118
-- พนักงาน: ธนพรรธน์ ศรีพันธบุตร (ตั้ม) — Product Consultant (PC) ฝ่ายขาย
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) Preview: ดู record ปัจจุบัน ═══
SELECT
  id, employee_code, first_name_th, last_name_th, nickname,
  position_id, department_id, company_id
FROM employees
WHERE employee_code = '4270537019';

-- ═══ 2) ตรวจว่า code ใหม่ยังไม่ถูกใช้ ═══
SELECT
  id, employee_code, first_name_th, last_name_th,
  '❌ มีคนใช้ code นี้แล้ว' AS warning
FROM employees
WHERE employee_code = '69000118';
-- (ถ้า query ข้อ 2 คืน 0 rows = ปลอดภัย รัน UPDATE ด้านล่างได้)

-- ═══ 3) UPDATE: เปลี่ยน employee_code ═══
-- ⚠️ รันหลังตรวจข้อ 2 แล้วว่าไม่มีใครใช้ 69000118
UPDATE employees
SET employee_code = '69000118',
    updated_at = now()
WHERE employee_code = '4270537019';

-- ═══ 3) UPDATE: เปลี่ยน employee_code ═══ 