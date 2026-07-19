-- ════════════════════════════════════════════════════════════════════
-- แก้เวลาการเข้างาน — พนักงาน 68000178 (พีรชาญ เหม็งทะเหล็ก)
--   • clock_in  : สุ่ม 08:50 – 09:10
--   • clock_out : สุ่ม 18:00 – 18:10
--   • ข้าม      : เสาร์/อาทิตย์ · วันหยุดบริษัท · วันลา (approved+pending)
--                · วันก่อนเริ่มงาน
--   • คำนวณ late_minutes, work_minutes ใหม่ (เริ่มงาน 09:00, หักพักเที่ยง 60 น.)
--   • UPSERT — record เดิม update, ไม่มีก็ insert
--
--   ⚠️  รอบเงินเดือนนี้: 22 มิ.ย. – 19 ก.ค. 2026  (22/6/69 – 19/7/69 พ.ศ.)
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_emp           employees%ROWTYPE;
  v_period_start  DATE := '2026-06-22';
  v_period_end    DATE := '2026-07-19';
  v_emp_code      TEXT := '68000178';

  v_cur           DATE;
  v_yr            INT;
  v_mo            INT;
  v_dy            INT;
  v_clock_in      TIMESTAMPTZ;
  v_clock_out     TIMESTAMPTZ;
  v_expected_in   TIMESTAMPTZ;
  v_expected_out  TIMESTAMPTZ;
  v_in_total_min  INT;           -- 50–70 (= 08:50–09:10)
  v_in_h          INT;
  v_in_m          INT;
  v_in_s          INT;
  v_out_m         INT;           -- 0–10  (= 18:00–18:10)
  v_out_s         INT;
  v_raw_late_min  INT;           -- ก่อนหัก grace
  v_late_min      INT;           -- หลังหัก grace
  v_grace_min     INT := 10;     -- Business Development = 10 นาที
  v_work_min      INT;
  v_dow           INT;
  v_skip          TEXT;
  v_skipped       INT := 0;
  v_updated       INT := 0;
BEGIN
  ----------------------------------------------------------------------
  -- 1) หาพนักงาน
  ----------------------------------------------------------------------
  SELECT * INTO v_emp FROM employees WHERE employee_code = v_emp_code;
  IF v_emp.id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบพนักงานรหัส %', v_emp_code;
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE ' พนักงาน: % % (%)',
    v_emp.first_name_th, v_emp.last_name_th, v_emp.employee_code;
  RAISE NOTICE ' ช่วงวันที่: % → %', v_period_start, v_period_end;
  RAISE NOTICE '═══════════════════════════════════════════════════';

  ----------------------------------------------------------------------
  -- 2) ลูปวันต่อวัน
  ----------------------------------------------------------------------
  v_cur := v_period_start;
  WHILE v_cur <= v_period_end LOOP
    v_dow := EXTRACT(DOW FROM v_cur)::INT;   -- 0=อา, 6=ส
    v_skip := NULL;

    -- ── เงื่อนไขข้าม ──
    IF v_dow IN (0, 6) THEN
      v_skip := 'เสาร์/อาทิตย์';
    ELSIF v_cur < v_emp.hire_date THEN
      v_skip := 'ก่อนเริ่มงาน';
    ELSIF EXISTS (
      SELECT 1 FROM company_holidays
      WHERE company_id = v_emp.company_id
        AND date = v_cur
        AND is_active = TRUE
    ) THEN
      v_skip := 'วันหยุดบริษัท';
    ELSIF EXISTS (
      SELECT 1 FROM leave_requests
      WHERE employee_id = v_emp.id
        AND status IN ('approved', 'pending')
        AND v_cur BETWEEN start_date AND end_date
    ) THEN
      v_skip := 'วันลา';
    END IF;

    IF v_skip IS NOT NULL THEN
      RAISE NOTICE '% (%) — ข้าม: %',
        v_cur, to_char(v_cur, 'Dy'), v_skip;
      v_skipped := v_skipped + 1;
    ELSE
      v_yr := EXTRACT(YEAR  FROM v_cur)::INT;
      v_mo := EXTRACT(MONTH FROM v_cur)::INT;
      v_dy := EXTRACT(DAY   FROM v_cur)::INT;

      -- ── สุ่ม clock_in 08:50 – 09:10 (50–70 นาทีจาก 08:00) ──
      v_in_total_min := 50 + floor(random() * 21)::INT;  -- 50..70
      v_in_h := 8 + (v_in_total_min / 60);                -- 8 หรือ 9
      v_in_m := v_in_total_min % 60;
      v_in_s := floor(random() * 60)::INT;
      v_clock_in := make_timestamptz(v_yr, v_mo, v_dy, v_in_h, v_in_m, v_in_s, 'Asia/Bangkok');

      -- ── สุ่ม clock_out 18:00 – 18:10 ──
      v_out_m := floor(random() * 11)::INT;               -- 0..10
      v_out_s := floor(random() * 60)::INT;
      v_clock_out := make_timestamptz(v_yr, v_mo, v_dy, 18, v_out_m, v_out_s, 'Asia/Bangkok');

      -- ── expected start/end (09:00 – 18:00) ──
      v_expected_in  := make_timestamptz(v_yr, v_mo, v_dy,  9, 0, 0, 'Asia/Bangkok');
      v_expected_out := make_timestamptz(v_yr, v_mo, v_dy, 18, 0, 0, 'Asia/Bangkok');

      -- ── คำนวณสาย: หัก grace period (Business Development = 10 นาที) ──
      v_raw_late_min := GREATEST(0,
        floor(EXTRACT(EPOCH FROM v_clock_in - v_expected_in) / 60)::INT
      );
      v_late_min := GREATEST(0, v_raw_late_min - v_grace_min);
      v_work_min := floor(EXTRACT(EPOCH FROM v_clock_out - v_clock_in) / 60)::INT - 60;

      -- ── upsert ──
      INSERT INTO attendance_records (
        employee_id, company_id, work_date,
        clock_in, clock_out,
        late_minutes, early_out_minutes, work_minutes, ot_minutes,
        status, is_manual,
        clock_in_valid, clock_out_valid,
        expected_start, expected_end
      ) VALUES (
        v_emp.id, v_emp.company_id, v_cur,
        v_clock_in, v_clock_out,
        v_late_min, 0, v_work_min, 0,
        (CASE WHEN v_late_min > 0 THEN 'late' ELSE 'present' END)::attendance_status,
        TRUE, TRUE, TRUE,
        v_expected_in, v_expected_out
      )
      ON CONFLICT (employee_id, work_date) DO UPDATE SET
        clock_in           = EXCLUDED.clock_in,
        clock_out          = EXCLUDED.clock_out,
        late_minutes       = EXCLUDED.late_minutes,
        early_out_minutes  = 0,
        work_minutes       = EXCLUDED.work_minutes,
        ot_minutes         = 0,
        status             = EXCLUDED.status,
        is_manual          = TRUE,
        clock_in_valid     = TRUE,
        clock_out_valid    = TRUE,
        expected_start     = EXCLUDED.expected_start,
        expected_end       = EXCLUDED.expected_end;

      v_updated := v_updated + 1;
      RAISE NOTICE '% (%) — in=% · out=% · สายดิบ %น (หัก grace %น = %น) · ทำงาน %น',
        v_cur, to_char(v_cur, 'Dy'),
        to_char(v_clock_in  AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS'),
        to_char(v_clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS'),
        v_raw_late_min, v_grace_min, v_late_min, v_work_min;
    END IF;

    v_cur := v_cur + 1;
  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE ' สำเร็จ: % วัน · ข้าม % วัน', v_updated, v_skipped;
  RAISE NOTICE '═══════════════════════════════════════════════════';
END $$;

-- ──────────────────────────────────────────────────────────────────
-- ตรวจสอบผลลัพธ์
-- ──────────────────────────────────────────────────────────────────
SELECT
  work_date,
  to_char(work_date, 'Dy')                                                AS dow,
  to_char(clock_in  AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS')            AS in_th,
  to_char(clock_out AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS')            AS out_th,
  late_minutes,
  early_out_minutes,
  work_minutes,
  status
FROM attendance_records
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '68000178')
  AND work_date BETWEEN '2026-06-22' AND '2026-07-19'
ORDER BY work_date;
