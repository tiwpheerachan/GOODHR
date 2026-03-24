-- ════════════════════════════════════════════════════════════════
-- Cleanup กะซ้ำ + แก้กะ PTC ที่เวลาผิด + เติมกะที่ขาด
-- รันทีละ STEP (copy แต่ละ STEP ไปรันทีละอัน)
-- ════════════════════════════════════════════════════════════════


-- ════════════════════════════════════════════════════════════════
-- STEP 1: แก้ PTC กะ "กะ 12.00-21.00" ที่ work_start = 00:00 → 12:00
-- ════════════════════════════════════════════════════════════════

UPDATE shift_templates st
SET work_start = '12:00'::time,
    name = 'กะ 12:00-21:00'
FROM companies c
WHERE c.id = st.company_id
  AND c.code = 'PTC'
  AND st.work_start = '00:00'::time
  AND st.work_end = '21:00'::time
  AND st.is_active = true;

-- ตรวจสอบ
SELECT st.name, st.work_start, st.work_end, c.code AS company
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE c.code = 'PTC' AND st.is_active = true
ORDER BY st.work_start;


-- ════════════════════════════════════════════════════════════════
-- STEP 2: ลบกะซ้ำ (work_start + work_end เดียวกัน ในบริษัทเดียวกัน)
--         เก็บตัวเก่าที่สุด (id น้อยที่สุด) ลบ/deactivate ตัวที่เหลือ
--         ⚠️ ย้าย attendance_records ก่อนลบ
-- ════════════════════════════════════════════════════════════════

-- 2a: สร้าง mapping ตัวซ้ำ → ตัวหลัก
CREATE TEMP TABLE shift_dup_map AS
SELECT dup.id AS dup_id, keeper.id AS keeper_id, keeper.name AS keeper_name,
       dup.name AS dup_name, c.code AS company
FROM (
  SELECT id, company_id, name, work_start, work_end,
         ROW_NUMBER() OVER (
           PARTITION BY company_id, work_start, work_end
           ORDER BY id ASC
         ) AS rn
  FROM shift_templates
  WHERE is_active = true
) dup
JOIN (
  SELECT id, company_id, name, work_start, work_end
  FROM (
    SELECT id, company_id, name, work_start, work_end,
           ROW_NUMBER() OVER (
             PARTITION BY company_id, work_start, work_end
             ORDER BY id ASC
           ) AS rn
    FROM shift_templates
    WHERE is_active = true
  ) x WHERE x.rn = 1
) keeper ON keeper.company_id = dup.company_id
        AND keeper.work_start = dup.work_start
        AND keeper.work_end = dup.work_end
JOIN companies c ON c.id = dup.company_id
WHERE dup.rn > 1;

-- ดูว่ามีตัวซ้ำอะไรบ้าง
SELECT * FROM shift_dup_map;


-- ════════════════════════════════════════════════════════════════
-- STEP 3: ย้าย attendance_records จากกะซ้ำ → กะหลัก แล้ว deactivate
-- ════════════════════════════════════════════════════════════════

-- 3a: ย้าย attendance_records ที่อ้างอิงกะซ้ำ
UPDATE attendance_records ar
SET shift_template_id = dm.keeper_id
FROM shift_dup_map dm
WHERE ar.shift_template_id = dm.dup_id;

-- 3b: deactivate ตัวซ้ำ
UPDATE shift_templates SET is_active = false
WHERE id IN (SELECT dup_id FROM shift_dup_map);

DROP TABLE shift_dup_map;

-- ตรวจสอบ
SELECT st.name, st.work_start, st.work_end, c.code AS company
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start;


-- ════════════════════════════════════════════════════════════════
-- STEP 4: ตั้งชื่อกะให้เป็นมาตรฐานเดียวกัน (กะ HH:MM-HH:MM)
-- ════════════════════════════════════════════════════════════════

UPDATE shift_templates
SET name = 'กะ ' || TO_CHAR(work_start, 'HH24:MI') || '-' || TO_CHAR(work_end, 'HH24:MI')
WHERE is_active = true
  AND name != 'กะ ' || TO_CHAR(work_start, 'HH24:MI') || '-' || TO_CHAR(work_end, 'HH24:MI');

-- ตรวจสอบ
SELECT st.name, st.work_start, st.work_end, c.code AS company
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start;


-- ════════════════════════════════════════════════════════════════
-- STEP 5: เพิ่มกะที่ขาดให้ทุกบริษัทครบ 8 กะมาตรฐาน
-- ════════════════════════════════════════════════════════════════

DO $$
DECLARE
  comp RECORD;
  shifts TEXT[][] := ARRAY[
    ARRAY['กะ 09:00-18:00', '09:00', '18:00', '60'],
    ARRAY['กะ 10:00-19:00', '10:00', '19:00', '60'],
    ARRAY['กะ 10:30-19:30', '10:30', '19:30', '60'],
    ARRAY['กะ 11:00-20:00', '11:00', '20:00', '60'],
    ARRAY['กะ 12:00-21:00', '12:00', '21:00', '60'],
    ARRAY['กะ 12:30-21:30', '12:30', '21:30', '60'],
    ARRAY['กะ 13:00-22:00', '13:00', '22:00', '60'],
    ARRAY['กะ 15:30-00:30', '15:30', '00:30', '60']
  ];
  s TEXT[];
BEGIN
  FOR comp IN SELECT id, code FROM companies WHERE is_active = true
  LOOP
    FOREACH s SLICE 1 IN ARRAY shifts
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM shift_templates
        WHERE company_id = comp.id
          AND work_start = s[2]::time
          AND work_end   = s[3]::time
          AND is_active = true
      ) THEN
        INSERT INTO shift_templates (company_id, name, work_start, work_end, break_minutes, is_active)
        VALUES (comp.id, s[1], s[2]::time, s[3]::time, s[4]::int, true);
        RAISE NOTICE 'เพิ่มกะ % ให้ %', s[1], comp.code;
      END IF;
    END LOOP;
  END LOOP;
END $$;


-- ════════════════════════════════════════════════════════════════
-- STEP 6: ตรวจสอบผลลัพธ์สุดท้าย
-- ════════════════════════════════════════════════════════════════

SELECT st.name, st.work_start, st.work_end, st.break_minutes,
       c.code AS company
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start, st.name;

-- นับจำนวนกะต่อบริษัท (ต้องได้ 8 เท่ากันหมด)
SELECT c.code AS company, COUNT(*) AS shift_count
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
GROUP BY c.code
ORDER BY c.code;
