-- ════════════════════════════════════════════════════════════════════
-- GOODHR: ตารางกะ เม.ย. - ธ.ค. 2569 (327 พนักงาน)
-- + วันหยุดประจำปีแยกตามบริษัท (SHD 17, TOP1 17, RABBIT 17, PTC 13)
-- Generated: 2026-03-24  |  ใช้ company code lookup (ไม่ hardcode UUID)
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- STEP 1: ลบวันหยุดเก่าปี 2026 แล้วใส่ใหม่ให้ถูกต้องตามแต่ละบริษัท
-- ═══════════════════════════════════════════════════════════════════

DELETE FROM company_holidays WHERE date >= '2026-01-01' AND date <= '2026-12-31';

-- ── 🟡 SHD TECHNOLOGY — 17 วัน ──────────────────────────────────
INSERT INTO company_holidays (id, company_id, date, name, is_active)
SELECT gen_random_uuid(), c.id, d.holiday_date, d.holiday_name, true
FROM companies c
CROSS JOIN (VALUES
  ('2026-01-01'::date, 'วันขึ้นปีใหม่'),
  ('2026-01-02', 'วันหยุดพิเศษวันขึ้นปีใหม่'),
  ('2026-02-17', 'วันตรุษจีน'),
  ('2026-03-03', 'วันมาฆบูชา'),
  ('2026-04-13', 'วันสงกรานต์'),
  ('2026-04-14', 'วันสงกรานต์'),
  ('2026-04-15', 'วันสงกรานต์'),
  ('2026-05-01', 'วันแรงงานแห่งชาติ'),
  ('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา'),
  ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10'),
  ('2026-08-12', 'วันแม่แห่งชาติ'),
  ('2026-10-13', 'วันคล้ายวันสวรรคต ร.9'),
  ('2026-10-23', 'วันปิยมหาราช'),
  ('2026-10-26', 'วันออกพรรษา'),
  ('2026-12-07', 'วันหยุดชดเชยวันพ่อแห่งชาติ'),
  ('2026-12-31', 'วันสิ้นปี')
) AS d(holiday_date, holiday_name)
WHERE c.code = 'SHD'
ON CONFLICT (company_id, date) DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- ── 🔵 TOP ONE DISTRIBUTION — 17 วัน ────────────────────────────
INSERT INTO company_holidays (id, company_id, date, name, is_active)
SELECT gen_random_uuid(), c.id, d.holiday_date, d.holiday_name, true
FROM companies c
CROSS JOIN (VALUES
  ('2026-01-01'::date, 'วันขึ้นปีใหม่'),
  ('2026-01-02', 'วันหยุดพิเศษวันขึ้นปีใหม่'),
  ('2026-02-17', 'วันตรุษจีน'),
  ('2026-03-03', 'วันมาฆบูชา'),
  ('2026-04-13', 'วันสงกรานต์'),
  ('2026-04-14', 'วันสงกรานต์'),
  ('2026-04-15', 'วันสงกรานต์'),
  ('2026-05-01', 'วันแรงงานแห่งชาติ'),
  ('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา'),
  ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10'),
  ('2026-08-12', 'วันแม่แห่งชาติ'),
  ('2026-10-13', 'วันคล้ายวันสวรรคต ร.9'),
  ('2026-10-23', 'วันปิยมหาราช'),
  ('2026-10-26', 'วันออกพรรษา'),
  ('2026-12-07', 'วันหยุดชดเชยวันพ่อแห่งชาติ'),
  ('2026-12-31', 'วันสิ้นปี')
) AS d(holiday_date, holiday_name)
WHERE c.code IN ('TOP_ONE','TOP1','TOPONE')
ON CONFLICT (company_id, date) DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- ── 🟢 RABBIT (THAILAND) — 17 วัน ───────────────────────────────
-- ⚠️ ต่างจาก SHD/TOP1: ใช้ 5 ธ.ค. (วันจริง) แทน 7 ธ.ค. (ชดเชย)
INSERT INTO company_holidays (id, company_id, date, name, is_active)
SELECT gen_random_uuid(), c.id, d.holiday_date, d.holiday_name, true
FROM companies c
CROSS JOIN (VALUES
  ('2026-01-01'::date, 'วันขึ้นปีใหม่'),
  ('2026-01-02', 'วันหยุดพิเศษวันขึ้นปีใหม่'),
  ('2026-02-17', 'วันตรุษจีน'),
  ('2026-03-03', 'วันมาฆบูชา'),
  ('2026-04-13', 'วันสงกรานต์'),
  ('2026-04-14', 'วันสงกรานต์'),
  ('2026-04-15', 'วันสงกรานต์'),
  ('2026-05-01', 'วันแรงงานแห่งชาติ'),
  ('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา'),
  ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10'),
  ('2026-08-12', 'วันแม่แห่งชาติ'),
  ('2026-10-13', 'วันคล้ายวันสวรรคต ร.9'),
  ('2026-10-23', 'วันปิยมหาราช'),
  ('2026-10-26', 'วันออกพรรษา'),
  ('2026-12-05', 'วันพ่อแห่งชาติ'),
  ('2026-12-31', 'วันสิ้นปี')
) AS d(holiday_date, holiday_name)
WHERE c.code = 'RABBIT'
ON CONFLICT (company_id, date) DO UPDATE SET name = EXCLUDED.name, is_active = true;

-- ── ⚪ PTC DISTRIBUTION — 13 วัน ─────────────────────────────────
-- ⚠️ ไม่มี: 2 ม.ค., 3 มี.ค., 23 ต.ค., 26 ต.ค., 7 ธ.ค.
INSERT INTO company_holidays (id, company_id, date, name, is_active)
SELECT gen_random_uuid(), c.id, d.holiday_date, d.holiday_name, true
FROM companies c
CROSS JOIN (VALUES
  ('2026-01-01'::date, 'วันขึ้นปีใหม่'),
  ('2026-02-17', 'วันตรุษจีน'),
  ('2026-04-13', 'วันสงกรานต์'),
  ('2026-04-14', 'วันสงกรานต์'),
  ('2026-04-15', 'วันสงกรานต์'),
  ('2026-05-01', 'วันแรงงานแห่งชาติ'),
  ('2026-06-01', 'วันหยุดชดเชยวันวิสาขบูชา'),
  ('2026-06-03', 'วันเฉลิมพระชนมพรรษาสมเด็จพระราชินี'),
  ('2026-07-28', 'วันเฉลิมพระชนมพรรษา ร.10'),
  ('2026-08-12', 'วันแม่แห่งชาติ'),
  ('2026-10-13', 'วันคล้ายวันสวรรคต ร.9'),
  ('2026-12-05', 'วันพ่อแห่งชาติ'),
  ('2026-12-31', 'วันสิ้นปี')
) AS d(holiday_date, holiday_name)
WHERE c.code = 'PTC'
ON CONFLICT (company_id, date) DO UPDATE SET name = EXCLUDED.name, is_active = true;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 2: สร้างตารางกะ เม.ย. - ธ.ค. 2569 (7 กลุ่ม)
-- ใช้ generate_series: 2026-04-01 → 2026-12-31 (275 วัน)
-- วันหยุดจะ check จาก company_holidays ตาม company_id ของพนักงานแต่ละคน
-- ═══════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 1: 127 คน — กะ 09:00-18:00 / fixed / หยุดเสาร์-อาทิตย์
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    WHEN EXTRACT(DOW FROM d.dt) IN (0,6) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    WHEN EXTRACT(DOW FROM d.dt) IN (0,6) THEN 'dayoff'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('67000124','68000254','Chinese-002','64000075','68000140','66000134','66000015','62000002','66000155','64000108','63000009','64000109','66000059','66000085','67000043','67000044','67000058','67000111','67000144','67000235','68000183','68000190','66000158','68000162','68000172','66000034','66000037','66000131','67000056','68000068','68000095','68000110','68000176','68000199','68000250','68000256','68000159','67000099','68000069','69000037','68000088','68000089','63000021','68000151','68000197','65000035','0007','66000067','66000147','68000086','68000182','68000202','LN027','66000012','68100023','68100024','68100029','67000146','67000200','67000211','68000161','68000178','68000179','68000180','68000252','61000001','62000008','64000076','65000027','63000007','63000030','64000037','65000004','66000017','66000069','67000024','67000077','67000135','68000237','66000055','68000105','68000137','68000265','64000007','66000060','66000062','67000006','67000007','67000017','67000106','67000145','67000166','67000170','67000172','67000194','67000212','67000221','67000222','67000234','67000239','68000016','68000023','68000091','68000107','68000236','68000259','67000138','66000086','67000136','67000137','67000230','68000215','67000018','67000039','67000040','67000041','67000078','67000113','67000114','67000139','67000192','67000199','67000217','67000228','67000231','68000098','68000253')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 2: 94 คน — กะ 09:00-18:00 / fixed / หยุดอาทิตย์
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    WHEN EXTRACT(DOW FROM d.dt) IN (0) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    WHEN EXTRACT(DOW FROM d.dt) IN (0) THEN 'dayoff'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('66000123','66000127','65000045','66000153','67000087','68000047','68000244','69000012','69000014','67000186','68000008','68000097','68000158','68000188','68000198','68000251','69000001','69000015','69000036','62000004','62000006','63000036','65000003','66000029','66000035','66000104','67000101','67000195','68000015','68000077','68000102','68000119','68000145','68000177','68000232','61000002','61000004','61000005','64000046','64000101','64000104','64000107','65000002','65000010','65000063','65000067','66000113','66000115','67000096','67000128','67000224','67000233','68000053','68000078','68000084','68000096','68000099','68000103','68000112','68100004','68100005','68100006','68100008','68100010','68100011','68100013','68100014','68100015','68100019','68100022','68100026','68100031','68100033','68100034','68100037','69000002','69000007','69000008','69000024','69000025','69000032','69000033','67000174','67000183','67000202','67000203','67000213','67000238','67000242','68000001','68000022','68000026','68000027','66000110')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 3: 2 คน — กะ 09:00-18:00 / fixed / หยุดพุธ
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    WHEN EXTRACT(DOW FROM d.dt) IN (3) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    WHEN EXTRACT(DOW FROM d.dt) IN (3) THEN 'dayoff'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000212','68000213')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 4: 33 คน — กะ 09:00-18:00 / variable / ไม่มีวันหยุดแน่นอน
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('63000004','63000013','66000103','67000016','67000047','67000048','67000079','67000122','67000131','67000141','67000142','68000083','68000092','68000181','68000191','65000026','66000043','66000057','66000065','66000081','66000090','67000025','67000030','67000121','67000155','67000206','67000216','68000031','68000238','68000247','68000257','69000041','69000026')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 5: 27 คน — กะ 09:00-18:00 / variable / ไม่มีวันหยุดแน่นอน (Brand Shop/Sale)
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000184','68000185','66000117','66000122','67000067','67000148','68000207','68000243','69000027','67000187','68000050','68000052','68000057','69000010','69000035','66000157','67000005','67000063','67000179','68000009','68000248','68000090','68000101','68000125','68000146','69000030','69000031')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 6: 8 คน — กะ 11:00-20:00 / fixed / ไม่มีวันหยุดแน่นอน
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000010','69000023','69000039','68000156','68000187','69000043','69000034','68000230')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ────────────────────────────────────────────────────────────────────
-- กลุ่ม 7: 36 คน — กะ 11:00-20:00 / variable / ไม่มีวันหยุดแน่นอน
-- ────────────────────────────────────────────────────────────────────
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN NULL
    ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1)
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM company_holidays ch WHERE ch.company_id = e.company_id AND ch.date = d.dt::date AND ch.is_active = true) THEN 'holiday'
    ELSE 'work'
  END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-12-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000109','69000017','69000018','67000160','68000240','68000255','68000160','68000071','68000200','68000192','68000217','66000142','67000074','67000158','68000147','68000148','68000064','68000208','68000216','69000021','69000028','67000057','69000005','68000233','68000150','68000186','68000193','69000004','67000103','68000029','68000204','68000167','68000195','68000130','68000124','69000016')
  AND e.is_active = true
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 3: ตรวจสอบผลลัพธ์
-- ═══════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_shd INT; v_top INT; v_rabbit INT; v_ptc INT;
  v_total BIGINT; v_holidays BIGINT; v_work BIGINT; v_dayoff BIGINT;
  v_shd_id UUID; v_top_id UUID; v_rabbit_id UUID; v_ptc_id UUID;
BEGIN
  SELECT id INTO v_shd_id FROM companies WHERE code IN ('SHD') LIMIT 1;
  SELECT id INTO v_top_id FROM companies WHERE code IN ('TOP_ONE','TOP1','TOPONE') LIMIT 1;
  SELECT id INTO v_rabbit_id FROM companies WHERE code IN ('RABBIT') LIMIT 1;
  SELECT id INTO v_ptc_id FROM companies WHERE code IN ('PTC') LIMIT 1;

  SELECT COUNT(*) INTO v_shd FROM company_holidays WHERE company_id = v_shd_id AND date >= '2026-01-01' AND date <= '2026-12-31' AND is_active = true;
  SELECT COUNT(*) INTO v_top FROM company_holidays WHERE company_id = v_top_id AND date >= '2026-01-01' AND date <= '2026-12-31' AND is_active = true;
  SELECT COUNT(*) INTO v_rabbit FROM company_holidays WHERE company_id = v_rabbit_id AND date >= '2026-01-01' AND date <= '2026-12-31' AND is_active = true;
  SELECT COUNT(*) INTO v_ptc FROM company_holidays WHERE company_id = v_ptc_id AND date >= '2026-01-01' AND date <= '2026-12-31' AND is_active = true;

  RAISE NOTICE '══════════════════════════════════════════';
  RAISE NOTICE 'วันหยุดประจำปี 2569:';
  RAISE NOTICE '  SHD:     % วัน', v_shd;
  RAISE NOTICE '  TOP ONE: % วัน', v_top;
  RAISE NOTICE '  RABBIT:  % วัน', v_rabbit;
  RAISE NOTICE '  PTC:     % วัน', v_ptc;
  RAISE NOTICE '══════════════════════════════════════════';

  SELECT COUNT(*) INTO v_total
  FROM monthly_shift_assignments
  WHERE work_date >= '2026-04-01' AND work_date <= '2026-12-31';

  SELECT COUNT(*) INTO v_holidays
  FROM monthly_shift_assignments
  WHERE work_date >= '2026-04-01' AND work_date <= '2026-12-31'
    AND assignment_type = 'holiday';

  SELECT COUNT(*) INTO v_work
  FROM monthly_shift_assignments
  WHERE work_date >= '2026-04-01' AND work_date <= '2026-12-31'
    AND assignment_type = 'work';

  SELECT COUNT(*) INTO v_dayoff
  FROM monthly_shift_assignments
  WHERE work_date >= '2026-04-01' AND work_date <= '2026-12-31'
    AND assignment_type = 'dayoff';

  RAISE NOTICE 'ตารางกะ เม.ย. - ธ.ค. 2569:';
  RAISE NOTICE '  รวมทั้งหมด:           % records', v_total;
  RAISE NOTICE '  วันทำงาน (work):       %', v_work;
  RAISE NOTICE '  วันหยุดประจำสัปดาห์:    %', v_dayoff;
  RAISE NOTICE '  วันหยุดนักขัตฤกษ์:     %', v_holidays;
  RAISE NOTICE '══════════════════════════════════════════';
END $$;

COMMIT;
