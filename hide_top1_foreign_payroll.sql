-- ═══════════════════════════════════════════════════════════════════
-- ซ่อนพนักงานทีม TOP1 (จีน/ต่างชาติ) ออกจากหน้าเงินเดือน
--   ตั้ง include_in_payroll = false → ไม่โผล่ในหน้าเงินเดือน + Excel + ไม่สร้าง record
--   ⚠️ เก็บไว้ 2 คน: EX-02 TANG ZHENG, EX-124 Lu Suidi (ไม่แตะ)
--   หมายเหตุ: EX-2 (Ethan) ≠ EX-02 (TANG ZHENG) — คนละรหัส ต้องเป๊ะ
--
-- ROLLBACK: UPDATE employees SET include_in_payroll = true
--           WHERE company_id = (SELECT id FROM companies WHERE name_th ILIKE '%ท็อป วัน%' LIMIT 1)
--             AND employee_code IN ('EX-1','EX-2','EX-3','EX-6','EX-7','EX-8','EX-11','EX-13','EX-17');
-- ═══════════════════════════════════════════════════════════════════
UPDATE employees
SET include_in_payroll = false
WHERE company_id = (SELECT id FROM companies WHERE name_th ILIKE '%ท็อป วัน%' LIMIT 1)
  AND employee_code IN (
    'EX-1',   -- Doris
    'EX-2',   -- Ethan
    'EX-3',   -- Henry
    'EX-6',   -- Lina
    'EX-7',   -- Sunnie
    'EX-8',   -- Veaw
    'EX-13',  -- Coco (廖文静)
    'EX-17'   -- ZHOU NAN (Ash)
  )
RETURNING employee_code, first_name_th, nickname, include_in_payroll;
-- ควรได้ 8 แถว · TANG ZHENG (EX-02) + Lu Suidi (EX-124) ยังคง include_in_payroll = true

-- ── (ทางเลือก) EX-11 "คุณLina" เจอเพิ่มในทีม TOP1 แต่ไม่อยู่ในรายชื่อรูป ──
--    ถ้าต้องการซ่อนด้วย ให้รันบรรทัดนี้:
-- UPDATE employees SET include_in_payroll = false
-- WHERE company_id = (SELECT id FROM companies WHERE name_th ILIKE '%ท็อป วัน%' LIMIT 1)
--   AND employee_code = 'EX-11';
