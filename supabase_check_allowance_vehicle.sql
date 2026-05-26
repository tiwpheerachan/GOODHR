-- ════════════════════════════════════════════════════════════════════
-- ตรวจสอบ + ซ่อมข้อมูล: allowance_vehicle ที่หายเพราะ bug ในฟอร์มแก้เงินเดือน
--
-- บัค: src/app/admin/employees/[id]/page.tsx saveSalary() ลืม insert
--      field `allowance_vehicle` → ค่าที่ HR กรอกในฟอร์ม ไม่เคยถูกบันทึก
-- แก้ไขโค้ดแล้ว ตั้งแต่ commit นี้
-- ════════════════════════════════════════════════════════════════════

-- ═══ 1) Diagnose: salary_structures ที่ allowance_vehicle = 0/NULL ─────
-- (ตรวจดูภาพรวมก่อน — ดูพนักงานที่มี allowance อื่นแต่ vehicle = 0)
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  c.code AS company,
  s.base_salary,
  s.allowance_position, s.allowance_food, s.allowance_phone,
  s.allowance_housing,
  s.allowance_vehicle,
  s.effective_from
FROM salary_structures s
JOIN employees e ON e.id = s.employee_id
LEFT JOIN companies c ON c.id = e.company_id
WHERE s.effective_to IS NULL
  AND COALESCE(s.allowance_vehicle, 0) = 0
  AND (s.allowance_position > 0 OR s.allowance_food > 0
       OR s.allowance_phone > 0 OR s.allowance_housing > 0)
  AND e.is_active = true
ORDER BY c.code, e.employee_code;

-- ═══ 2) ดูใบเงินเดือนเดือนปัจจุบันที่ allowance_vehicle = 0 (แต่บริษัทเช่น SHD) ─
SELECT
  e.employee_code,
  e.first_name_th || ' ' || e.last_name_th AS name,
  pr.year, pr.month,
  pr.base_salary,
  pr.allowance_vehicle AS payroll_vehicle,
  s.allowance_vehicle  AS structure_vehicle
FROM payroll_records pr
JOIN employees e ON e.id = pr.employee_id
LEFT JOIN companies c ON c.id = e.company_id
LEFT JOIN salary_structures s
  ON s.employee_id = e.id AND s.effective_to IS NULL
WHERE pr.year = 2026 AND pr.month = 5
  AND COALESCE(pr.allowance_vehicle, 0) = 0
  AND c.code = 'SHD'
ORDER BY e.employee_code;

-- ═══ 3) Manual fix template ───────────────────────────────────────────
-- ใช้สำหรับแก้ allowance_vehicle ของพนักงานที่ระบุ
-- ⚠️ HR ต้องบอกรหัสพนักงาน + จำนวนเงินจริงที่ควรเป็น
/*
-- ตัวอย่าง: SHD employee_code = 'XXXXXXXX' → ค่าเสื่อมรถยนต์ 3000
UPDATE salary_structures
SET allowance_vehicle = 3000, updated_at = now()
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = 'XXXXXXXX')
  AND effective_to IS NULL;

-- หลัง UPDATE → ให้ admin กดปุ่ม "🔄 รีเฟรช" บนใบแจ้งเงินเดือน
-- หรือเรียก POST /api/payroll/bulk เพื่อให้ payroll_records ตามค่าใหม่
*/

-- ════════════════════════════════════════════════════════════════════
-- 📋 วิธีใช้:
-- 1. รัน section 1 → ดูใครบ้างที่ค่าเสื่อมรถยนต์ = 0 (อาจเป็น 0 จริง หรือ
--    เป็น 0 เพราะ bug)
-- 2. รัน section 2 → ดูใบเงินเดือน SHD ที่กระทบ
-- 3. ส่งรายชื่อให้ HR ยืนยันว่าคนไหนควรได้กี่บาท
-- 4. รัน section 3 (UPDATE template) ทีละคน
-- 5. กดรีเฟรช payslip dialog
-- ════════════════════════════════════════════════════════════════════
