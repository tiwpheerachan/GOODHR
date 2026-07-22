-- ═══════════════════════════════════════════════════════════════════
-- เช็คสถานะการผูก Feishu ของพนักงาน
-- Feishu open_id จริง = ขึ้นต้น ou_ (user) หรือ on_ (union) ยาว ~28 ตัว
-- ถ้าเป็นรหัสพนักงาน (ตัวเลขล้วน / สั้น) = placeholder ยังยิง DM ไม่ได้
-- ═══════════════════════════════════════════════════════════════════

-- 1) สรุปภาพรวม: ผูกจริง / placeholder / ยังไม่ผูก
SELECT
  CASE
    WHEN feishu_user_id IS NULL OR feishu_user_id = '' THEN 'ยังไม่ผูก (null)'
    WHEN feishu_user_id ~ '^(ou_|on_)' THEN 'ผูก Feishu จริง ✅'
    ELSE 'placeholder (รหัส/อื่นๆ) ⚠️'
  END AS binding_status,
  COUNT(*) AS n
FROM employees
WHERE employment_status NOT IN ('resigned','terminated')
GROUP BY 1
ORDER BY n DESC;

-- 2) รายชื่อคนที่ผูก Feishu "จริง" แล้ว (ควรมี 4 คน pilot: Benz/Nun/Tiw/Safe)
SELECT employee_code, first_name_th, last_name_th, nickname, feishu_user_id,
       (SELECT name FROM departments d WHERE d.id = e.department_id) AS dept
FROM employees e
WHERE feishu_user_id ~ '^(ou_|on_)'
  AND employment_status NOT IN ('resigned','terminated')
ORDER BY employee_code;

-- 3) เช็คเจาะจง 4 คน pilot ว่าผูกจริงหรือยัง (แก้ชื่อ/รหัสตามจริง)
SELECT employee_code, first_name_th, nickname, feishu_user_id,
       CASE WHEN feishu_user_id ~ '^(ou_|on_)' THEN 'พร้อมยิง ✅' ELSE 'ยังเป็น placeholder ⚠️' END AS ready
FROM employees
WHERE nickname IN ('เบนซ์','นุ่น','ทิว','เซฟ')
   OR first_name_th IN ('ณัฐวุฒิ','รุ่งวิกรัย','พีรชาญ','สรรค์')
ORDER BY nickname;
