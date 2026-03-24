-- ════════════════════════════════════════════════════════════════
-- ตรวจสอบและเพิ่มกะที่ขาดให้ทุกบริษัท
-- ให้ทุกบริษัทมีกะเหมือนกัน (อิงจาก SHD ที่ครบที่สุด)
-- ════════════════════════════════════════════════════════════════


-- ── STEP 1: ดูกะทั้งหมดแยกตามบริษัท ──
SELECT st.name, st.work_start, st.work_end, st.break_minutes,
       c.code AS company
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start, st.name;


-- ── STEP 2: เพิ่มกะที่ขาดให้ทุกบริษัท ──
-- กะมาตรฐานทั้งหมด (อิงจาก SHD)
-- ใช้ INSERT ... ON CONFLICT DO NOTHING (ถ้ามีอยู่แล้วจะข้าม)

-- สร้าง unique constraint ชั่วคราว (ถ้ายังไม่มี) เพื่อป้องกันซ้ำ
-- ข้ามขั้นตอนนี้ถ้ามี constraint อยู่แล้ว

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
  -- วนทุกบริษัทที่ active
  FOR comp IN SELECT id, code FROM companies WHERE is_active = true
  LOOP
    -- วนทุกกะมาตรฐาน
    FOREACH s SLICE 1 IN ARRAY shifts
    LOOP
      -- เช็คว่ามีกะที่มี work_start + work_end ตรงกันหรือยัง
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


-- ── STEP 3: ตรวจสอบผลลัพธ์ ──
SELECT st.name, st.work_start, st.work_end, st.break_minutes,
       c.code AS company
FROM shift_templates st
JOIN companies c ON c.id = st.company_id
WHERE st.is_active = true
ORDER BY c.code, st.work_start, st.name;
