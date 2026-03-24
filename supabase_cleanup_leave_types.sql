-- ════════════════════════════════════════════════════════════════
-- ลบประเภทลาซ้ำ + ลบลาพักร้อนที่แยกตามตำแหน่ง
-- ⚠️  จัดการ leave_requests + leave_balances (รวม unique conflict)
-- รันทีละ STEP (copy แต่ละ STEP ไปรันทีละอัน)
-- ════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════
-- STEP 1: ดูรายการทั้งหมดก่อน (diagnostic)
-- ════════════════════════════════════════════════════════════════
SELECT lt.name, lt.code, c.code AS company, lt.is_active,
       lt.days_per_year, lt.is_paid,
       (SELECT COUNT(*) FROM leave_requests lr WHERE lr.leave_type_id = lt.id) AS req_count,
       (SELECT COUNT(*) FROM leave_balances lb WHERE lb.leave_type_id = lt.id) AS bal_count
FROM leave_types lt
LEFT JOIN companies c ON c.id = lt.company_id
WHERE lt.is_active = true
ORDER BY c.code, lt.name;


-- ════════════════════════════════════════════════════════════════
-- STEP 2: จัดการ "ลาพักร้อน (ตำแหน่ง)" ทั้งหมด
--         ย้าย requests + รวม/ลบ balances → ลาพักร้อน ตัวหลัก
-- ════════════════════════════════════════════════════════════════

-- 2a: ย้าย leave_requests → ตัวหลัก
UPDATE leave_requests lr
SET leave_type_id = (
  SELECT m.id FROM leave_types m
  WHERE m.company_id = dup.company_id
    AND m.name = 'ลาพักร้อน'
    AND NOT m.name ~ '\('
  ORDER BY m.created_at ASC NULLS LAST, m.id ASC
  LIMIT 1
)
FROM leave_types dup
WHERE lr.leave_type_id = dup.id
  AND dup.name ~ '^ลาพักร้อน\s*\(';

-- 2b: leave_balances ที่ตัวหลักมีอยู่แล้ว → รวมยอด used_days แล้วลบตัวซ้ำ
-- รวม used_days จากตัวซ้ำเข้าตัวหลัก
UPDATE leave_balances main_lb
SET used_days = main_lb.used_days + dup_lb.used_days
FROM leave_balances dup_lb
JOIN leave_types dup_lt ON dup_lt.id = dup_lb.leave_type_id
WHERE dup_lt.name ~ '^ลาพักร้อน\s*\('
  AND main_lb.employee_id = dup_lb.employee_id
  AND main_lb.year = dup_lb.year
  AND main_lb.leave_type_id = (
    SELECT m.id FROM leave_types m
    WHERE m.company_id = dup_lt.company_id
      AND m.name = 'ลาพักร้อน'
      AND NOT m.name ~ '\('
    ORDER BY m.created_at ASC NULLS LAST, m.id ASC
    LIMIT 1
  );

-- ลบ leave_balances ตัวซ้ำที่รวมยอดไปแล้ว (ตัวที่ main มีอยู่แล้ว)
DELETE FROM leave_balances lb
USING leave_types lt
WHERE lb.leave_type_id = lt.id
  AND lt.name ~ '^ลาพักร้อน\s*\('
  AND EXISTS (
    SELECT 1 FROM leave_balances main_lb
    JOIN leave_types m ON m.id = main_lb.leave_type_id
    WHERE m.company_id = lt.company_id
      AND m.name = 'ลาพักร้อน'
      AND NOT m.name ~ '\('
      AND main_lb.employee_id = lb.employee_id
      AND main_lb.year = lb.year
  );

-- 2c: leave_balances ที่ตัวหลักยังไม่มี → ย้ายไปเลย
UPDATE leave_balances lb
SET leave_type_id = (
  SELECT m.id FROM leave_types m
  WHERE m.company_id = lt.company_id
    AND m.name = 'ลาพักร้อน'
    AND NOT m.name ~ '\('
  ORDER BY m.created_at ASC NULLS LAST, m.id ASC
  LIMIT 1
)
FROM leave_types lt
WHERE lb.leave_type_id = lt.id
  AND lt.name ~ '^ลาพักร้อน\s*\(';


-- ════════════════════════════════════════════════════════════════
-- STEP 3: จัดการตัวซ้ำทั่วไป (ชื่อเดียวกัน + บริษัทเดียวกัน)
--         เก็บตัวเก่าที่สุด (rn=1) ย้ายข้อมูลจาก rn>1
-- ════════════════════════════════════════════════════════════════

-- สร้าง mapping table ชั่วคราว
CREATE TEMP TABLE dup_map AS
SELECT dup.id AS dup_id, keeper.id AS keeper_id
FROM (
  SELECT id, company_id, TRIM(name) AS tname,
         ROW_NUMBER() OVER (
           PARTITION BY company_id, TRIM(name)
           ORDER BY created_at ASC NULLS LAST, id ASC
         ) AS rn
  FROM leave_types
) dup
JOIN (
  SELECT x.id, x.company_id, x.tname
  FROM (
    SELECT id, company_id, TRIM(name) AS tname,
           ROW_NUMBER() OVER (
             PARTITION BY company_id, TRIM(name)
             ORDER BY created_at ASC NULLS LAST, id ASC
           ) AS rn
    FROM leave_types
  ) x WHERE x.rn = 1
) keeper ON keeper.company_id = dup.company_id AND keeper.tname = dup.tname
WHERE dup.rn > 1;

-- 3a: ย้าย leave_requests ของตัวซ้ำ
UPDATE leave_requests lr
SET leave_type_id = dm.keeper_id
FROM dup_map dm
WHERE lr.leave_type_id = dm.dup_id;

-- 3b: leave_balances — รวมยอดถ้า main มีอยู่แล้ว
UPDATE leave_balances main_lb
SET used_days = main_lb.used_days + dup_lb.used_days
FROM leave_balances dup_lb
JOIN dup_map dm ON dm.dup_id = dup_lb.leave_type_id
WHERE main_lb.leave_type_id = dm.keeper_id
  AND main_lb.employee_id = dup_lb.employee_id
  AND main_lb.year = dup_lb.year;

-- ลบ leave_balances ตัวซ้ำที่รวมยอดไปแล้ว
DELETE FROM leave_balances lb
USING dup_map dm
WHERE lb.leave_type_id = dm.dup_id
  AND EXISTS (
    SELECT 1 FROM leave_balances main_lb
    WHERE main_lb.leave_type_id = dm.keeper_id
      AND main_lb.employee_id = lb.employee_id
      AND main_lb.year = lb.year
  );

-- 3c: leave_balances ที่ main ยังไม่มี → ย้ายไปเลย
UPDATE leave_balances lb
SET leave_type_id = dm.keeper_id
FROM dup_map dm
WHERE lb.leave_type_id = dm.dup_id;

DROP TABLE dup_map;


-- ════════════════════════════════════════════════════════════════
-- STEP 4: ลบ "ลาพักร้อน (ตำแหน่ง)" + ลามะ + ตัวซ้ำ
--         (ตอนนี้ไม่มี FK อ้างอิงแล้ว)
-- ════════════════════════════════════════════════════════════════

-- 4a: ลบ "ลาพักร้อน (ตำแหน่ง)"
DELETE FROM leave_types WHERE name ~ '^ลาพักร้อน\s*\('
  AND id NOT IN (SELECT leave_type_id FROM leave_requests WHERE leave_type_id IS NOT NULL)
  AND id NOT IN (SELECT leave_type_id FROM leave_balances WHERE leave_type_id IS NOT NULL);
UPDATE leave_types SET is_active = false
WHERE name ~ '^ลาพักร้อน\s*\(' AND is_active = true;

-- 4b: ลบ "ลามะ"
DELETE FROM leave_types WHERE TRIM(name) = 'ลามะ'
  AND id NOT IN (SELECT leave_type_id FROM leave_requests WHERE leave_type_id IS NOT NULL)
  AND id NOT IN (SELECT leave_type_id FROM leave_balances WHERE leave_type_id IS NOT NULL);
UPDATE leave_types SET is_active = false
WHERE TRIM(name) = 'ลามะ' AND is_active = true;

-- 4c: ลบตัวซ้ำ (rn > 1) — ไม่มี FK แล้ว
DELETE FROM leave_types
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY company_id, TRIM(name)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn FROM leave_types
  ) ranked WHERE rn > 1
)
AND id NOT IN (SELECT leave_type_id FROM leave_requests WHERE leave_type_id IS NOT NULL)
AND id NOT IN (SELECT leave_type_id FROM leave_balances WHERE leave_type_id IS NOT NULL);

-- deactivate ตัวซ้ำที่ลบไม่ได้
UPDATE leave_types SET is_active = false
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY company_id, TRIM(name)
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn FROM leave_types WHERE is_active = true
  ) ranked WHERE rn > 1
);


-- ════════════════════════════════════════════════════════════════
-- STEP 5: ตรวจสอบผลลัพธ์สุดท้าย
-- ════════════════════════════════════════════════════════════════
SELECT lt.name, lt.code, c.code AS company, lt.is_active,
       lt.days_per_year, lt.is_paid,
       (SELECT COUNT(*) FROM leave_requests lr WHERE lr.leave_type_id = lt.id) AS req_count,
       (SELECT COUNT(*) FROM leave_balances lb WHERE lb.leave_type_id = lt.id) AS bal_count
FROM leave_types lt
LEFT JOIN companies c ON c.id = lt.company_id
WHERE lt.is_active = true
ORDER BY c.code, lt.name;
