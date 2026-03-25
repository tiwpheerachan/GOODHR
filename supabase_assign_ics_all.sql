-- ═══════════════════════════════════════════════════════════════
-- สร้างสิทธิ์เช็คอิน ICS Mall ให้พนักงานทุกคน ทุกบริษัท
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- ICS Mall branch ID
-- ตรวจสอบก่อนว่า ICS Mall มีอยู่จริง
SELECT id, name, company_id FROM branches WHERE id = '24e5ed9a-de98-438c-8104-217c4052229f';

-- เพิ่ม ICS Mall ให้พนักงาน active ทุกคนที่ยังไม่มี
INSERT INTO employee_allowed_locations (employee_id, branch_id)
SELECT e.id, '24e5ed9a-de98-438c-8104-217c4052229f'
FROM employees e
WHERE e.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM employee_allowed_locations eal
    WHERE eal.employee_id = e.id
      AND eal.branch_id = '24e5ed9a-de98-438c-8104-217c4052229f'
  );

-- ตรวจผลลัพธ์: นับจำนวนพนักงานที่มี ICS Mall
SELECT
  c.code AS company,
  COUNT(*) AS employees_with_ics
FROM employee_allowed_locations eal
JOIN employees e ON e.id = eal.employee_id
JOIN companies c ON c.id = e.company_id
WHERE eal.branch_id = '24e5ed9a-de98-438c-8104-217c4052229f'
  AND e.is_active = true
GROUP BY c.code
ORDER BY c.code;
