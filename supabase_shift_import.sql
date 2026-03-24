-- ════════════════════════════════════════════════════════════════════
-- GOODHR: Shift Schedule Import from Excel (327 employees)
-- Generated: 2026-03-24
-- Run this in Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ═══ Step 1: สร้าง Shift Templates (ถ้ายังไม่มี) ═══

INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes, is_active)
SELECT c.id, 'กะเช้า 09:00-18:00', 'normal'::shift_type, '09:00:00', '18:00:00', 60, false, 30, true
FROM companies c WHERE c.is_active = true
  AND NOT EXISTS (SELECT 1 FROM shift_templates st WHERE st.company_id = c.id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00');

INSERT INTO shift_templates (company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes, is_active)
SELECT c.id, 'กะสาย 11:00-20:00', 'normal'::shift_type, '11:00:00', '20:00:00', 60, false, 30, true
FROM companies c WHERE c.is_active = true
  AND NOT EXISTS (SELECT 1 FROM shift_templates st WHERE st.company_id = c.id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00');

-- ═══ Step 2: สร้าง/อัปเดต Employee Schedule Profiles ═══

-- 127 employees: 09:00:00 / fixed / dayoff={sat,sun}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'fixed',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  '{sat,sun}'::text[]
FROM employees e WHERE e.employee_code IN ('67000124','68000254','Chinese-002','64000075','68000140','66000134','66000015','62000002','66000155','64000108','63000009','64000109','66000059','66000085','67000043','67000044','67000058','67000111','67000144','67000235','68000183','68000190','66000158','68000162','68000172','66000034','66000037','66000131','67000056','68000068','68000095','68000110','68000176','68000199','68000250','68000256','68000159','67000099','68000069','69000037','68000088','68000089','63000021','68000151','68000197','65000035','0007','66000067','66000147','68000086','68000182','68000202','LN027','66000012','68100023','68100024','68100029','67000146','67000200','67000211','68000161','68000178','68000179','68000180','68000252','61000001','62000008','64000076','65000027','63000007','63000030','64000037','65000004','66000017','66000069','67000024','67000077','67000135','68000237','66000055','68000105','68000137','68000265','64000007','66000060','66000062','67000006','67000007','67000017','67000106','67000145','67000166','67000170','67000172','67000194','67000212','67000221','67000222','67000234','67000239','68000016','68000023','68000091','68000107','68000236','68000259','67000138','66000086','67000136','67000137','67000230','68000215','67000018','67000039','67000040','67000041','67000078','67000113','67000114','67000139','67000192','67000199','67000217','67000228','67000231','68000098','68000253')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- 94 employees: 09:00:00 / fixed / dayoff={sun}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'fixed',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  '{sun}'::text[]
FROM employees e WHERE e.employee_code IN ('66000123','66000127','65000045','66000153','67000087','68000047','68000244','69000012','69000014','67000186','68000008','68000097','68000158','68000188','68000198','68000251','69000001','69000015','69000036','62000004','62000006','63000036','65000003','66000029','66000035','66000104','67000101','67000195','68000015','68000077','68000102','68000119','68000145','68000177','68000232','61000002','61000004','61000005','64000046','64000101','64000104','64000107','65000002','65000010','65000063','65000067','66000113','66000115','67000096','67000128','67000224','67000233','68000053','68000078','68000084','68000096','68000099','68000103','68000112','68100004','68100005','68100006','68100008','68100010','68100011','68100013','68100014','68100015','68100019','68100022','68100026','68100031','68100033','68100034','68100037','69000002','69000007','69000008','69000024','69000025','69000032','69000033','67000174','67000183','67000202','67000203','67000213','67000238','67000242','68000001','68000022','68000026','68000027','66000110')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- 2 employees: 09:00:00 / fixed / dayoff={wed}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'fixed',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  '{wed}'::text[]
FROM employees e WHERE e.employee_code IN ('68000212','68000213')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- 33 employees: 09:00:00 / variable / dayoff={}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'variable',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  '{}'::text[]
FROM employees e WHERE e.employee_code IN ('63000004','63000013','66000103','67000016','67000047','67000048','67000079','67000122','67000131','67000141','67000142','68000083','68000092','68000181','68000191','65000026','66000043','66000057','66000065','66000081','66000090','67000025','67000030','67000121','67000155','67000206','67000216','68000031','68000238','68000247','68000257','69000041','69000026')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- 27 employees: 09:00:00 / fixed / dayoff={}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'fixed',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  '{}'::text[]
FROM employees e WHERE e.employee_code IN ('68000184','68000185','66000117','66000122','67000067','67000148','68000207','68000243','69000027','67000187','68000050','68000052','68000057','69000010','69000035','66000157','67000005','67000063','67000179','68000009','68000248','68000090','68000101','68000125','68000146','69000030','69000031')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- 8 employees: 11:00:00 / fixed / dayoff={}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'fixed',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1),
  '{}'::text[]
FROM employees e WHERE e.employee_code IN ('68000010','69000023','69000039','68000156','68000187','69000043','69000034','68000230')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- 36 employees: 11:00:00 / variable / dayoff={}
INSERT INTO employee_schedule_profiles (employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs)
SELECT e.id, e.company_id, 'variable',
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1),
  '{}'::text[]
FROM employees e WHERE e.employee_code IN ('68000109','69000017','69000018','67000160','68000240','68000255','68000160','68000071','68000200','68000192','68000217','66000142','67000074','67000158','68000147','68000148','68000064','68000208','68000216','69000021','69000028','67000057','69000005','68000233','68000150','68000186','68000193','69000004','67000103','68000029','68000204','68000167','68000195','68000130','68000124','69000016')
ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type = EXCLUDED.schedule_type,
  default_shift_id = EXCLUDED.default_shift_id,
  fixed_dayoffs = EXCLUDED.fixed_dayoffs;

-- ═══ Step 3: สร้างตารางกะรายเดือน มี.ค. + เม.ย. 2569 ═══
-- ใช้ generate_series เพื่อสร้างวันทั้งเดือนอัตโนมัติ

-- ── มี.ค. 2569 ──

-- 127 employees: 09:00:00 / dayoff={sat,sun}
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0,6) THEN NULL
       ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0,6) THEN 'dayoff' ELSE 'work' END
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('67000124','68000254','Chinese-002','64000075','68000140','66000134','66000015','62000002','66000155','64000108','63000009','64000109','66000059','66000085','67000043','67000044','67000058','67000111','67000144','67000235','68000183','68000190','66000158','68000162','68000172','66000034','66000037','66000131','67000056','68000068','68000095','68000110','68000176','68000199','68000250','68000256','68000159','67000099','68000069','69000037','68000088','68000089','63000021','68000151','68000197','65000035','0007','66000067','66000147','68000086','68000182','68000202','LN027','66000012','68100023','68100024','68100029','67000146','67000200','67000211','68000161','68000178','68000179','68000180','68000252','61000001','62000008','64000076','65000027','63000007','63000030','64000037','65000004','66000017','66000069','67000024','67000077','67000135','68000237','66000055','68000105','68000137','68000265','64000007','66000060','66000062','67000006','67000007','67000017','67000106','67000145','67000166','67000170','67000172','67000194','67000212','67000221','67000222','67000234','67000239','68000016','68000023','68000091','68000107','68000236','68000259','67000138','66000086','67000136','67000137','67000230','68000215','67000018','67000039','67000040','67000041','67000078','67000113','67000114','67000139','67000192','67000199','67000217','67000228','67000231','68000098','68000253')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 94 employees: 09:00:00 / dayoff={sun}
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0) THEN NULL
       ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0) THEN 'dayoff' ELSE 'work' END
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('66000123','66000127','65000045','66000153','67000087','68000047','68000244','69000012','69000014','67000186','68000008','68000097','68000158','68000188','68000198','68000251','69000001','69000015','69000036','62000004','62000006','63000036','65000003','66000029','66000035','66000104','67000101','67000195','68000015','68000077','68000102','68000119','68000145','68000177','68000232','61000002','61000004','61000005','64000046','64000101','64000104','64000107','65000002','65000010','65000063','65000067','66000113','66000115','67000096','67000128','67000224','67000233','68000053','68000078','68000084','68000096','68000099','68000103','68000112','68100004','68100005','68100006','68100008','68100010','68100011','68100013','68100014','68100015','68100019','68100022','68100026','68100031','68100033','68100034','68100037','69000002','69000007','69000008','69000024','69000025','69000032','69000033','67000174','67000183','67000202','67000203','67000213','67000238','67000242','68000001','68000022','68000026','68000027','66000110')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 2 employees: 09:00:00 / dayoff={wed}
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (3) THEN NULL
       ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (3) THEN 'dayoff' ELSE 'work' END
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000212','68000213')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 33 employees: 09:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('63000004','63000013','66000103','67000016','67000047','67000048','67000079','67000122','67000131','67000141','67000142','68000083','68000092','68000181','68000191','65000026','66000043','66000057','66000065','66000081','66000090','67000025','67000030','67000121','67000155','67000206','67000216','68000031','68000238','68000247','68000257','69000041','69000026')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 27 employees: 09:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000184','68000185','66000117','66000122','67000067','67000148','68000207','68000243','69000027','67000187','68000050','68000052','68000057','69000010','69000035','66000157','67000005','67000063','67000179','68000009','68000248','68000090','68000101','68000125','68000146','69000030','69000031')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 8 employees: 11:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000010','69000023','69000039','68000156','68000187','69000043','69000034','68000230')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 36 employees: 11:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-03-01'::date, '2026-03-31'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000109','69000017','69000018','67000160','68000240','68000255','68000160','68000071','68000200','68000192','68000217','66000142','67000074','67000158','68000147','68000148','68000064','68000208','68000216','69000021','69000028','67000057','69000005','68000233','68000150','68000186','68000193','69000004','67000103','68000029','68000204','68000167','68000195','68000130','68000124','69000016')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- ── เม.ย. 2569 ──

-- 127 employees: 09:00:00 / dayoff={sat,sun}
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0,6) THEN NULL
       ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0,6) THEN 'dayoff' ELSE 'work' END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('67000124','68000254','Chinese-002','64000075','68000140','66000134','66000015','62000002','66000155','64000108','63000009','64000109','66000059','66000085','67000043','67000044','67000058','67000111','67000144','67000235','68000183','68000190','66000158','68000162','68000172','66000034','66000037','66000131','67000056','68000068','68000095','68000110','68000176','68000199','68000250','68000256','68000159','67000099','68000069','69000037','68000088','68000089','63000021','68000151','68000197','65000035','0007','66000067','66000147','68000086','68000182','68000202','LN027','66000012','68100023','68100024','68100029','67000146','67000200','67000211','68000161','68000178','68000179','68000180','68000252','61000001','62000008','64000076','65000027','63000007','63000030','64000037','65000004','66000017','66000069','67000024','67000077','67000135','68000237','66000055','68000105','68000137','68000265','64000007','66000060','66000062','67000006','67000007','67000017','67000106','67000145','67000166','67000170','67000172','67000194','67000212','67000221','67000222','67000234','67000239','68000016','68000023','68000091','68000107','68000236','68000259','67000138','66000086','67000136','67000137','67000230','68000215','67000018','67000039','67000040','67000041','67000078','67000113','67000114','67000139','67000192','67000199','67000217','67000228','67000231','68000098','68000253')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 94 employees: 09:00:00 / dayoff={sun}
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0) THEN NULL
       ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (0) THEN 'dayoff' ELSE 'work' END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('66000123','66000127','65000045','66000153','67000087','68000047','68000244','69000012','69000014','67000186','68000008','68000097','68000158','68000188','68000198','68000251','69000001','69000015','69000036','62000004','62000006','63000036','65000003','66000029','66000035','66000104','67000101','67000195','68000015','68000077','68000102','68000119','68000145','68000177','68000232','61000002','61000004','61000005','64000046','64000101','64000104','64000107','65000002','65000010','65000063','65000067','66000113','66000115','67000096','67000128','67000224','67000233','68000053','68000078','68000084','68000096','68000099','68000103','68000112','68100004','68100005','68100006','68100008','68100010','68100011','68100013','68100014','68100015','68100019','68100022','68100026','68100031','68100033','68100034','68100037','69000002','69000007','69000008','69000024','69000025','69000032','69000033','67000174','67000183','67000202','67000203','67000213','67000238','67000242','68000001','68000022','68000026','68000027','66000110')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 2 employees: 09:00:00 / dayoff={wed}
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (3) THEN NULL
       ELSE (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1)
  END,
  CASE WHEN EXTRACT(DOW FROM d.dt) IN (3) THEN 'dayoff' ELSE 'work' END
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000212','68000213')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 33 employees: 09:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('63000004','63000013','66000103','67000016','67000047','67000048','67000079','67000122','67000131','67000141','67000142','68000083','68000092','68000181','68000191','65000026','66000043','66000057','66000065','66000081','66000090','67000025','67000030','67000121','67000155','67000206','67000216','68000031','68000238','68000247','68000257','69000041','69000026')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 27 employees: 09:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '09:00:00' AND st.work_end = '18:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000184','68000185','66000117','66000122','67000067','67000148','68000207','68000243','69000027','67000187','68000050','68000052','68000057','69000010','69000035','66000157','67000005','67000063','67000179','68000009','68000248','68000090','68000101','68000125','68000146','69000030','69000031')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 8 employees: 11:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000010','69000023','69000039','68000156','68000187','69000043','69000034','68000230')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

-- 36 employees: 11:00:00 / variable-no-dayoff
INSERT INTO monthly_shift_assignments (employee_id, company_id, work_date, shift_id, assignment_type)
SELECT e.id, e.company_id, d.dt::date,
  (SELECT st.id FROM shift_templates st WHERE st.company_id = e.company_id AND st.work_start = '11:00:00' AND st.work_end = '20:00:00' LIMIT 1),
  'work'
FROM employees e
CROSS JOIN generate_series('2026-04-01'::date, '2026-04-30'::date, '1 day') AS d(dt)
WHERE e.employee_code IN ('68000109','69000017','69000018','67000160','68000240','68000255','68000160','68000071','68000200','68000192','68000217','66000142','67000074','67000158','68000147','68000148','68000064','68000208','68000216','69000021','69000028','67000057','69000005','68000233','68000150','68000186','68000193','69000004','67000103','68000029','68000204','68000167','68000195','68000130','68000124','69000016')
ON CONFLICT (employee_id, work_date) DO UPDATE SET
  shift_id = EXCLUDED.shift_id, assignment_type = EXCLUDED.assignment_type;

COMMIT;

-- ✅ สรุป: 327 พนักงาน x 61 วัน = ~19947 assignments
-- Shift templates + profiles + ตารางกะ มี.ค.-เม.ย. 2569 ครบ!