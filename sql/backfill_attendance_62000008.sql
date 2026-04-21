-- ═══════════════════════════════════════════════════════════════════
-- เพิ่มประวัติการเข้างานย้อนหลัง — พนักงาน 62000008 (ประดิษฐ์ แสนแก้ว)
-- ช่วงที่ 1: 22-31 มีนาคม 2569 (2026-03)
-- ช่วงที่ 2: 1-30 เมษายน 2569 (2026-04)
-- เวลาทำงาน: 09:00 - 18:00 (จ-ศ)
-- ลาพักร้อน: 16-17 เมษายน
-- วันหยุด: สงกรานต์ 13-15 เมษายน + เสาร์อาทิตย์
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_emp_id    UUID;
  v_company_id UUID;
  v_date      DATE;
  v_dow       INT;
  v_count     INT := 0;
  v_skip      INT := 0;
  -- วันหยุดสงกรานต์
  v_holidays  DATE[] := ARRAY['2026-04-13','2026-04-14','2026-04-15']::DATE[];
  -- วันลาพักร้อน
  v_leave_days DATE[] := ARRAY['2026-04-16','2026-04-17']::DATE[];
BEGIN
  -- หา employee ID
  SELECT id, company_id INTO v_emp_id, v_company_id
  FROM employees WHERE employee_code = '62000008';

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบพนักงานรหัส 62000008';
  END IF;

  RAISE NOTICE 'พนักงาน: 62000008 (ID: %)', v_emp_id;
  RAISE NOTICE '══════════════════════════════════════';

  -- วนลูป 22 มี.ค. - 30 เม.ย. 2026
  FOR v_date IN SELECT d::date FROM generate_series('2026-03-22'::date, '2026-04-30'::date, '1 day') d
  LOOP
    v_dow := EXTRACT(DOW FROM v_date); -- 0=อาทิตย์, 6=เสาร์

    -- ข้ามเสาร์-อาทิตย์
    IF v_dow IN (0, 6) THEN
      CONTINUE;
    END IF;

    -- ข้ามวันหยุดสงกรานต์
    IF v_date = ANY(v_holidays) THEN
      RAISE NOTICE '  ⏭ % — วันหยุดสงกรานต์', v_date;
      CONTINUE;
    END IF;

    -- ข้ามวันลาพักร้อน (16-17 เม.ย.)
    IF v_date = ANY(v_leave_days) THEN
      RAISE NOTICE '  🏖 % — ลาพักร้อน (ข้าม)', v_date;
      CONTINUE;
    END IF;

    -- ข้ามวันที่ยังไม่ผ่าน (อนาคต)
    IF v_date > CURRENT_DATE THEN
      RAISE NOTICE '  ⏭ % — วันในอนาคต', v_date;
      CONTINUE;
    END IF;

    -- ข้ามถ้ามี record อยู่แล้ว
    IF EXISTS (
      SELECT 1 FROM attendance_records
      WHERE employee_id = v_emp_id AND work_date = v_date
    ) THEN
      RAISE NOTICE '  ✓ % — มี record อยู่แล้ว (ข้าม)', v_date;
      v_skip := v_skip + 1;
      CONTINUE;
    END IF;

    -- ข้ามถ้าตรงกับ company_holidays
    IF EXISTS (
      SELECT 1 FROM company_holidays
      WHERE company_id = v_company_id AND date = v_date AND is_active = true
    ) THEN
      RAISE NOTICE '  ⏭ % — วันหยุดบริษัท', v_date;
      CONTINUE;
    END IF;

    -- เพิ่ม attendance record: 09:00 - 18:00 BKK time
    INSERT INTO attendance_records (
      id, employee_id, company_id, work_date,
      clock_in, clock_out,
      status, late_minutes, early_out_minutes,
      work_minutes, ot_minutes, is_manual
    ) VALUES (
      gen_random_uuid(),
      v_emp_id,
      v_company_id,
      v_date,
      (v_date || 'T09:00:00+07:00')::timestamptz,
      (v_date || 'T18:00:00+07:00')::timestamptz,
      'present',
      0,    -- ไม่สาย
      0,    -- ไม่ออกก่อน
      540,  -- 9 ชม. = 540 นาที
      0,    -- ไม่มี OT
      true  -- เพิ่มด้วยมือ
    );

    v_count := v_count + 1;
    RAISE NOTICE '  ✅ % — เพิ่ม 09:00-18:00 สำเร็จ', v_date;
  END LOOP;

  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'สรุป: เพิ่ม % วัน, ข้าม % วัน (มีอยู่แล้ว)', v_count, v_skip;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- ตรวจสอบผลลัพธ์
-- ═══════════════════════════════════════════════════════════════════
SELECT
  work_date,
  TO_CHAR(work_date, 'Dy') AS day_name,
  TO_CHAR(clock_in AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS clock_in_bkk,
  TO_CHAR(clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI') AS clock_out_bkk,
  status,
  late_minutes,
  work_minutes,
  is_manual
FROM attendance_records
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '62000008')
  AND work_date BETWEEN '2026-03-22' AND '2026-04-30'
ORDER BY work_date;
