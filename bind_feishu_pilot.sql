-- ═══════════════════════════════════════════════════════════════════
-- ผูก Feishu ID จริงให้ 4 คน pilot (ล็อคชั้นที่ 1 — คนอื่นยิงไม่ได้)
--
-- วิธีหา ou_id จริง: ใน Feishu Developer Console / Bot ดึง user_id ของแต่ละคน
--   (ขึ้นต้น ou_ ยาว ~28 ตัว) แล้วเอามาแทน 'ou_XXXX...' ด้านล่าง
--
-- ⚠️ อย่ารันจนกว่าจะมี ou_ จริง — ถ้าใส่ผิดบอทจะ DM ไม่เข้า
-- ═══════════════════════════════════════════════════════════════════

UPDATE employees SET feishu_user_id = 'ou_XXXX_benz'  WHERE nickname = 'เบนซ์' AND first_name_th LIKE '%ณัฐวุฒิ%';
UPDATE employees SET feishu_user_id = 'ou_XXXX_nun'   WHERE employee_code = '68000180';   -- นุ่น (รุ่งวิกรัย)
UPDATE employees SET feishu_user_id = 'ou_XXXX_tiw'   WHERE nickname = 'ทิว';
UPDATE employees SET feishu_user_id = 'ou_XXXX_safe'  WHERE nickname = 'เซฟ' AND first_name_th LIKE '%สรรค์%';

-- ตรวจผลว่าผูกครบ 4 คน + เป็น ou_ จริงแล้ว
SELECT employee_code, first_name_th, nickname, feishu_user_id,
       CASE WHEN feishu_user_id ~ '^(ou_|on_)' THEN 'พร้อมยิง ✅' ELSE 'ยัง placeholder ⚠️' END AS ready
FROM employees
WHERE nickname IN ('เบนซ์','นุ่น','ทิว','เซฟ') OR employee_code = '68000180'
ORDER BY nickname;
