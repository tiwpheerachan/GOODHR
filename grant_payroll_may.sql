-- ════════════════════════════════════════════════════════════════════
-- เปิดสิทธิ์ดูเงินเดือนให้ may.pradit (แก้เคสอีเมลคนละโดเมน)
-- รันทีละ step ใน Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

-- STEP 1 — หาว่า may.pradit คือ user_id ไหน (ไม่ยึดโดเมน)
SELECT u.id AS user_id, u.employee_id, e.email, e.first_name_th, e.last_name_th
FROM users u
JOIN employees e ON e.id = u.employee_id
WHERE e.email ILIKE '%may.pradit%';
--   ↑ ถ้าไม่ขึ้นแถวเลย → อีเมลใน employees ไม่มี "may.pradit"
--     ลองค้นด้วยชื่อแทน:  SELECT id, email, first_name_th, last_name_th
--                          FROM employees WHERE first_name_th ILIKE '%เมย์%' OR first_name_en ILIKE '%may%';


-- STEP 2 — เปิดสิทธิ์ (จับคู่ email → employee → user อัตโนมัติ ไม่ยึดโดเมน)
--   company_id = NULL → ทุกบริษัท (สิทธิ์เต็ม)
--   ON CONFLICT DO NOTHING (ไม่ระบุคอลัมน์) → ใช้ได้ทุกเวอร์ชันตาราง
INSERT INTO payroll_access (user_id, email, granted_by)
SELECT u.id, e.email, u.id
FROM users u
JOIN employees e ON e.id = u.employee_id
WHERE e.email ILIKE '%may.pradit%'
ON CONFLICT DO NOTHING;


-- STEP 3 — ตรวจว่าเข้าแล้ว (ต้องเห็น may.pradit)
SELECT pa.user_id, pa.email, e.first_name_th, e.last_name_th
FROM payroll_access pa
LEFT JOIN users u    ON u.id = pa.user_id
LEFT JOIN employees e ON e.id = u.employee_id;


-- ────────────────────────────────────────────────────────────────────
-- ทางเลือก (ถ้า STEP 2 ยังไม่เข้า เพราะ join ไม่เจอ):
--   เอา user_id จาก STEP 1 มาใส่ตรงๆ
-- INSERT INTO payroll_access (user_id, email, granted_by)
-- VALUES ('<user_id-จาก-STEP-1>', 'may.pradit.s@shd-company.com', '<user_id-จาก-STEP-1>')
-- ON CONFLICT DO NOTHING;
-- ════════════════════════════════════════════════════════════════════
