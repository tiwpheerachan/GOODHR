-- ============================================
-- GOODHR Payroll Import: February 2026
-- Generated: 2026-03-23T11:54:32.776719
-- Total employees: 313
-- ============================================

BEGIN;

-- ============================================
-- STEP 0: Clean existing Feb 2026 data
-- ============================================

DELETE FROM payroll_records
WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2;


DELETE FROM payroll_records
WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2;


DELETE FROM payroll_records
WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2;


DELETE FROM payroll_records
WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2;

-- ============================================
-- STEP 1: Create payroll_periods for Feb 2026
-- ============================================

INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
SELECT
    'e9b97804-2f44-4f75-ba5a-0d66a65df965',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026,
    2,
    'กุมภาพันธ์ 2026',
    '2026-01-22',
    '2026-02-21',
    '2026-02-25',
    'completed'
WHERE NOT EXISTS (
    SELECT 1 FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2
);

UPDATE payroll_periods SET status = 'completed'
WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2;


INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
SELECT
    'b8665bf3-5147-420b-94b6-286fde19fc18',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026,
    2,
    'กุมภาพันธ์ 2026',
    '2026-01-22',
    '2026-02-21',
    '2026-02-25',
    'completed'
WHERE NOT EXISTS (
    SELECT 1 FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2
);

UPDATE payroll_periods SET status = 'completed'
WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2;


INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
SELECT
    'e00d093c-8130-4b7e-b372-e04205c154ec',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026,
    2,
    'กุมภาพันธ์ 2026',
    '2026-01-22',
    '2026-02-21',
    '2026-02-25',
    'completed'
WHERE NOT EXISTS (
    SELECT 1 FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2
);

UPDATE payroll_periods SET status = 'completed'
WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2;


INSERT INTO payroll_periods (id, company_id, year, month, period_name, start_date, end_date, pay_date, status)
SELECT
    '352c3100-9653-4f8e-a74f-7e37add454ed',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026,
    2,
    'กุมภาพันธ์ 2026',
    '2026-01-22',
    '2026-02-21',
    '2026-02-25',
    'completed'
WHERE NOT EXISTS (
    SELECT 1 FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2
);

UPDATE payroll_periods SET status = 'completed'
WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2;

-- ============================================
-- STEP 2: Upsert salary_structures
-- ============================================

--  (64000075) base=80000.0
UPDATE salary_structures
SET base_salary = 80000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e189e7d0-c010-55e8-ba56-99dfb8dbb106'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd696ab9a-4b85-4776-aef2-98e9b2eb7a7c',
    'e189e7d0-c010-55e8-ba56-99dfb8dbb106',
    80000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e189e7d0-c010-55e8-ba56-99dfb8dbb106' AND effective_to IS NULL
);


--  (67000124) base=52000.0
UPDATE salary_structures
SET base_salary = 52000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1fc1c300-7a04-55f6-af90-7a85bdb89621'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '45dfef9a-855e-47b3-b2a3-0a571eeaa186',
    '1fc1c300-7a04-55f6-af90-7a85bdb89621',
    52000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1fc1c300-7a04-55f6-af90-7a85bdb89621' AND effective_to IS NULL
);


--  (68000140) base=160000.0
UPDATE salary_structures
SET base_salary = 160000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'bd592ab4-f6a5-56da-8c9f-e16855727c08'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '630b3d6b-82c9-4216-9456-e7215657ee5a',
    'bd592ab4-f6a5-56da-8c9f-e16855727c08',
    160000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bd592ab4-f6a5-56da-8c9f-e16855727c08' AND effective_to IS NULL
);


--  (Chinese-002) base=45000.0
UPDATE salary_structures
SET base_salary = 45000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5bc1ff1c-0228-580e-b9ac-69f60d749f70'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6faf8952-d987-4bb2-910c-f3a35c85f1ac',
    '5bc1ff1c-0228-580e-b9ac-69f60d749f70',
    45000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5bc1ff1c-0228-580e-b9ac-69f60d749f70' AND effective_to IS NULL
);


--  (64000108) base=23450.0
UPDATE salary_structures
SET base_salary = 23450,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '505100f5-e973-5189-9fdd-ade03c5a9d65'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '2b7415db-6cf7-4c6e-abc7-c80dc9e97525',
    '505100f5-e973-5189-9fdd-ade03c5a9d65',
    23450,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '505100f5-e973-5189-9fdd-ade03c5a9d65' AND effective_to IS NULL
);


--  (66000015) base=28345.0
UPDATE salary_structures
SET base_salary = 28345,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '547d54e5-3b9c-5074-b8ff-7a70c029da58'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f68a867e-3c86-4ca6-8509-fe4f71c51daf',
    '547d54e5-3b9c-5074-b8ff-7a70c029da58',
    28345,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '547d54e5-3b9c-5074-b8ff-7a70c029da58' AND effective_to IS NULL
);


--  (66000134) base=38000.0
UPDATE salary_structures
SET base_salary = 38000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e33a24bf-f250-54bc-8b3e-0eaf4fe62547'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b976fb53-267b-4a7f-b78a-8d86465c92da',
    'e33a24bf-f250-54bc-8b3e-0eaf4fe62547',
    38000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e33a24bf-f250-54bc-8b3e-0eaf4fe62547' AND effective_to IS NULL
);


--  (66000155) base=24170.0
UPDATE salary_structures
SET base_salary = 24170,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '87f33a2c-4186-5d58-824d-71754a1981fc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b282d884-2105-4c6b-a8fb-cd44161d67ec',
    '87f33a2c-4186-5d58-824d-71754a1981fc',
    24170,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '87f33a2c-4186-5d58-824d-71754a1981fc' AND effective_to IS NULL
);


--  (66000034) base=18290.0
UPDATE salary_structures
SET base_salary = 18290,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '182b4acf-db08-5d7e-8f6f-c8ea178d2252'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '81846f0d-0a0a-4e80-b54d-a5766eb1689c',
    '182b4acf-db08-5d7e-8f6f-c8ea178d2252',
    18290,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '182b4acf-db08-5d7e-8f6f-c8ea178d2252' AND effective_to IS NULL
);


--  (66000158) base=60000.0
UPDATE salary_structures
SET base_salary = 60000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a2981567-26e5-5f8c-a3ce-9853f660b533'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7cd64358-678c-48f8-8bd6-44696cce0639',
    'a2981567-26e5-5f8c-a3ce-9853f660b533',
    60000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a2981567-26e5-5f8c-a3ce-9853f660b533' AND effective_to IS NULL
);


--  (67000099) base=17130.0
UPDATE salary_structures
SET base_salary = 17130,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '79209d32-cf9e-5ee5-bffa-920d45dfd7db'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b8e28f38-30e1-44d0-b201-efb25267c21c',
    '79209d32-cf9e-5ee5-bffa-920d45dfd7db',
    17130,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '79209d32-cf9e-5ee5-bffa-920d45dfd7db' AND effective_to IS NULL
);


--  (67000186) base=60000.0
UPDATE salary_structures
SET base_salary = 60000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b41547ed-4e66-5789-ac51-1dfb787e3876'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '143813c0-0ceb-4b08-8bee-947918e5750a',
    'b41547ed-4e66-5789-ac51-1dfb787e3876',
    60000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b41547ed-4e66-5789-ac51-1dfb787e3876' AND effective_to IS NULL
);


--  (68000008) base=80000.0
UPDATE salary_structures
SET base_salary = 80000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ea90425f-ca79-50fc-b7ac-9a29f649f225'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '2a442644-5478-453c-8912-56fd65caf44c',
    'ea90425f-ca79-50fc-b7ac-9a29f649f225',
    80000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ea90425f-ca79-50fc-b7ac-9a29f649f225' AND effective_to IS NULL
);


--  (68000068) base=19600.0
UPDATE salary_structures
SET base_salary = 19600,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ead7fea4-52b0-5044-95d8-a70927211a86'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '69f980f9-a6b5-4eb6-9465-283871f96132',
    'ead7fea4-52b0-5044-95d8-a70927211a86',
    19600,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ead7fea4-52b0-5044-95d8-a70927211a86' AND effective_to IS NULL
);


--  (68000069) base=17460.0
UPDATE salary_structures
SET base_salary = 17460,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd5c61796-bc14-5185-8795-517eef98433f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '623234dd-a50a-4c72-80d5-6e6303d1266b',
    'd5c61796-bc14-5185-8795-517eef98433f',
    17460,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd5c61796-bc14-5185-8795-517eef98433f' AND effective_to IS NULL
);


--  (68000095) base=45930.0
UPDATE salary_structures
SET base_salary = 45930,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'bac13023-3360-5441-8c32-a81ef94010ba'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9b5fef7a-5033-4048-9f32-028346d8acf4',
    'bac13023-3360-5441-8c32-a81ef94010ba',
    45930,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bac13023-3360-5441-8c32-a81ef94010ba' AND effective_to IS NULL
);


--  (68000097) base=28400.0
UPDATE salary_structures
SET base_salary = 28400,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8c7ae749-bd6a-5e65-9601-8b6ae73381ea'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '28a7049d-f24e-4bb4-afc8-cdfdbd3d1872',
    '8c7ae749-bd6a-5e65-9601-8b6ae73381ea',
    28400,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8c7ae749-bd6a-5e65-9601-8b6ae73381ea' AND effective_to IS NULL
);


--  (68000110) base=20130.0
UPDATE salary_structures
SET base_salary = 20130,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '02463fc8-e6c5-5405-ba03-75fb92666043'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '957fc616-0e7c-4d7f-a96b-01508ef60636',
    '02463fc8-e6c5-5405-ba03-75fb92666043',
    20130,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '02463fc8-e6c5-5405-ba03-75fb92666043' AND effective_to IS NULL
);


--  (68000158) base=75000.0
UPDATE salary_structures
SET base_salary = 75000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'faa66085-db71-436c-b823-52231d501b93',
    '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2',
    75000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2' AND effective_to IS NULL
);


--  (68000162) base=50000.0
UPDATE salary_structures
SET base_salary = 50000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e9ca1d07-192c-4954-948e-ee72217bed68',
    'da89221c-cacf-58c8-b46c-1292f3a8956e',
    50000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' AND effective_to IS NULL
);


--  (68000172) base=25000.0
UPDATE salary_structures
SET base_salary = 25000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e9631ebd-681e-5305-b1d4-101405f39833'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'fd78ed9c-9398-4b1c-93c5-0c32dc94f485',
    'e9631ebd-681e-5305-b1d4-101405f39833',
    25000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e9631ebd-681e-5305-b1d4-101405f39833' AND effective_to IS NULL
);


--  (68000176) base=35000.0
UPDATE salary_structures
SET base_salary = 35000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1ecc722f-0dd1-5dca-9110-a02849e56a6c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0e02bc29-1e6d-45f8-9042-1c78a0d1bbdc',
    '1ecc722f-0dd1-5dca-9110-a02849e56a6c',
    35000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1ecc722f-0dd1-5dca-9110-a02849e56a6c' AND effective_to IS NULL
);


--  (68000188) base=47000.0
UPDATE salary_structures
SET base_salary = 47000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7318811e-5e85-56f7-abe0-707e832578bb'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '877c4947-c9d5-4a57-a978-eae5702f7477',
    '7318811e-5e85-56f7-abe0-707e832578bb',
    47000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7318811e-5e85-56f7-abe0-707e832578bb' AND effective_to IS NULL
);


--  (68000198) base=100000.0
UPDATE salary_structures
SET base_salary = 100000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '00aac6c6-27fd-51ca-93f1-9f40deb0787c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c762d733-01d9-41de-8d9c-f2d6a8679e80',
    '00aac6c6-27fd-51ca-93f1-9f40deb0787c',
    100000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '00aac6c6-27fd-51ca-93f1-9f40deb0787c' AND effective_to IS NULL
);


--  (68000212) base=25000.0
UPDATE salary_structures
SET base_salary = 25000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1d51ba79-62b4-4e96-9692-841d5f714f0e',
    'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11',
    25000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' AND effective_to IS NULL
);


--  (68000213) base=25000.0
UPDATE salary_structures
SET base_salary = 25000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '63253821-1301-47f0-be8d-2862da8d0b68',
    '2e0fa686-82fc-54f3-9381-ecca30db2c15',
    25000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15' AND effective_to IS NULL
);


--  (66000123) base=120000.0
UPDATE salary_structures
SET base_salary = 120000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8429e766-c22a-5c55-b79d-9628732e3879'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '86ef3f1c-3c11-40f4-bd3a-03b64092ea41',
    '8429e766-c22a-5c55-b79d-9628732e3879',
    120000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8429e766-c22a-5c55-b79d-9628732e3879' AND effective_to IS NULL
);


--  (66000127) base=74200.0
UPDATE salary_structures
SET base_salary = 74200,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b6e14317-2d6c-49dd-9c96-0d8f5200ba8a',
    '2bcc724a-136a-5e75-ae22-e2a3471e8a41',
    74200,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' AND effective_to IS NULL
);


--  (66000131) base=20000.0
UPDATE salary_structures
SET base_salary = 20000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd9ca3057-049c-5046-8390-95ec35d707b0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '46b045eb-1703-4513-b9d9-f0c7ab1aa06a',
    'd9ca3057-049c-5046-8390-95ec35d707b0',
    20000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd9ca3057-049c-5046-8390-95ec35d707b0' AND effective_to IS NULL
);


--  (68000159) base=17000.0
UPDATE salary_structures
SET base_salary = 17000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c7bbe76c-0220-5ea4-b416-4acd6fca94a4'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ab223338-3c17-4a20-9296-e340c843f8a5',
    'c7bbe76c-0220-5ea4-b416-4acd6fca94a4',
    17000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c7bbe76c-0220-5ea4-b416-4acd6fca94a4' AND effective_to IS NULL
);


--  (66000037) base=67000.0
UPDATE salary_structures
SET base_salary = 67000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '325a4de8-6270-53f1-8d62-ca99f1dfdd8d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3bc4a019-ae21-499b-b98d-11c969bc795b',
    '325a4de8-6270-53f1-8d62-ca99f1dfdd8d',
    67000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '325a4de8-6270-53f1-8d62-ca99f1dfdd8d' AND effective_to IS NULL
);


--  (67000056) base=26840.0
UPDATE salary_structures
SET base_salary = 26840,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd9c22ffa-af8e-4ee6-89df-cf9aa6ba7f0c',
    '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0',
    26840,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0' AND effective_to IS NULL
);


--  (68000199) base=24000.0
UPDATE salary_structures
SET base_salary = 24000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4800ca0d-4d6b-5756-8751-ed4f6d53d984'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cdd4bb0b-926c-46db-800c-73abd1a3b9ed',
    '4800ca0d-4d6b-5756-8751-ed4f6d53d984',
    24000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4800ca0d-4d6b-5756-8751-ed4f6d53d984' AND effective_to IS NULL
);


--  (65000045) base=54000.0
UPDATE salary_structures
SET base_salary = 54000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd5379adf-9d35-535a-9099-98eda97ab38f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5c021a6d-d93b-48ef-8855-ccc214cd1785',
    'd5379adf-9d35-535a-9099-98eda97ab38f',
    54000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' AND effective_to IS NULL
);


--  (66000153) base=21530.0
UPDATE salary_structures
SET base_salary = 21530,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '58fdab55-3165-5db1-a465-d26991330ec5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1bcda82f-4680-4c85-8bbe-666811319ef6',
    '58fdab55-3165-5db1-a465-d26991330ec5',
    21530,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '58fdab55-3165-5db1-a465-d26991330ec5' AND effective_to IS NULL
);


--  (67000087) base=28360.0
UPDATE salary_structures
SET base_salary = 28360,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2b405200-f740-57ad-a488-756ce95fb5d5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '03a960a3-c274-4f06-a39c-8152659d0b7a',
    '2b405200-f740-57ad-a488-756ce95fb5d5',
    28360,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2b405200-f740-57ad-a488-756ce95fb5d5' AND effective_to IS NULL
);


--  (68000047) base=22660.0
UPDATE salary_structures
SET base_salary = 22660,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5d01aff0-34a5-5039-be00-90fd212a84c8'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cc3b5fc6-a34f-40a0-ba67-e5df32650ea9',
    '5d01aff0-34a5-5039-be00-90fd212a84c8',
    22660,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5d01aff0-34a5-5039-be00-90fd212a84c8' AND effective_to IS NULL
);


--  (68000244) base=23000.0
UPDATE salary_structures
SET base_salary = 23000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '61ee7754-22b8-4d92-b1bf-10a733d009de',
    '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3',
    23000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3' AND effective_to IS NULL
);


--  (69000014) base=13333.0
UPDATE salary_structures
SET base_salary = 13333,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5eded7cf-84e9-57fd-b8b0-c3923d7edd34'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '84d09778-145c-4f4f-9095-4cfd5d2e8768',
    '5eded7cf-84e9-57fd-b8b0-c3923d7edd34',
    13333,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5eded7cf-84e9-57fd-b8b0-c3923d7edd34' AND effective_to IS NULL
);


--  (63000009) base=23535.0
UPDATE salary_structures
SET base_salary = 23535,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e098f35b-7b09-5c1d-9542-1b158aed1702'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '61cce4b8-2a59-470b-8ac7-81d4befac9ae',
    'e098f35b-7b09-5c1d-9542-1b158aed1702',
    23535,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e098f35b-7b09-5c1d-9542-1b158aed1702' AND effective_to IS NULL
);


--  (64000109) base=46675.0
UPDATE salary_structures
SET base_salary = 46675,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd219c41b-264d-5125-a1a1-84e81e7cb20f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5742a8a6-5898-4364-ad7f-2fa16daeaba0',
    'd219c41b-264d-5125-a1a1-84e81e7cb20f',
    46675,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd219c41b-264d-5125-a1a1-84e81e7cb20f' AND effective_to IS NULL
);


--  (66000059) base=25740.0
UPDATE salary_structures
SET base_salary = 25740,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '87b3c2cf-1067-5a7e-b717-7b5ea4000c53'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'aa965cda-2029-400b-be80-55e71ba64a8d',
    '87b3c2cf-1067-5a7e-b717-7b5ea4000c53',
    25740,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '87b3c2cf-1067-5a7e-b717-7b5ea4000c53' AND effective_to IS NULL
);


--  (66000085) base=120600.0
UPDATE salary_structures
SET base_salary = 120600,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '286b90b9-c406-4fe6-848c-3a069a92e8e5',
    '5dc95722-7b21-5c28-b14d-406a6de0bb26',
    120600,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' AND effective_to IS NULL
);


--  (67000043) base=34625.0
UPDATE salary_structures
SET base_salary = 34625,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '798d04af-f201-544d-b3d6-d77ae68ec6b2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '057af447-c1f6-4db8-83b1-1c6e0073c070',
    '798d04af-f201-544d-b3d6-d77ae68ec6b2',
    34625,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '798d04af-f201-544d-b3d6-d77ae68ec6b2' AND effective_to IS NULL
);


--  (67000044) base=53120.0
UPDATE salary_structures
SET base_salary = 53120,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b68624a5-e13f-52d4-99cc-2d577b9835e2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f97478c3-4f01-4591-87cc-95c0c0bca529',
    'b68624a5-e13f-52d4-99cc-2d577b9835e2',
    53120,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b68624a5-e13f-52d4-99cc-2d577b9835e2' AND effective_to IS NULL
);


--  (67000058) base=58600.0
UPDATE salary_structures
SET base_salary = 58600,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd6ba75e5-164d-49c6-b004-4edac4816c93',
    '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62',
    58600,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62' AND effective_to IS NULL
);


--  (67000111) base=19100.0
UPDATE salary_structures
SET base_salary = 19100,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3ff757f7-d102-5b85-9c7b-716f3d5d256f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '33f4e5be-e69e-4315-b455-16c54d6de8a7',
    '3ff757f7-d102-5b85-9c7b-716f3d5d256f',
    19100,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3ff757f7-d102-5b85-9c7b-716f3d5d256f' AND effective_to IS NULL
);


--  (67000144) base=21920.0
UPDATE salary_structures
SET base_salary = 21920,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'f9fab60d-d405-5691-9251-2651a4459ff9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '65ecfce6-6784-49be-b1f5-403d7c5c1c63',
    'f9fab60d-d405-5691-9251-2651a4459ff9',
    21920,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f9fab60d-d405-5691-9251-2651a4459ff9' AND effective_to IS NULL
);


--  (67000235) base=49700.0
UPDATE salary_structures
SET base_salary = 49700,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '19cf954f-0e52-4bf8-9567-39c39b7c56d3',
    '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0',
    49700,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0' AND effective_to IS NULL
);


--  (68000183) base=39000.0
UPDATE salary_structures
SET base_salary = 39000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '37165ccc-a53f-50bf-af12-f069ce27e138'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a7d633f8-cba7-468c-96d4-8616eebebdf5',
    '37165ccc-a53f-50bf-af12-f069ce27e138',
    39000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '37165ccc-a53f-50bf-af12-f069ce27e138' AND effective_to IS NULL
);


--  (68000190) base=45000.0
UPDATE salary_structures
SET base_salary = 45000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '54eeadd4-2edb-5c16-935c-584e2da41515'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd26d98ae-2bf9-4d90-9340-95593a47554e',
    '54eeadd4-2edb-5c16-935c-584e2da41515',
    45000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '54eeadd4-2edb-5c16-935c-584e2da41515' AND effective_to IS NULL
);


--  (65000035) base=68500.0
UPDATE salary_structures
SET base_salary = 68500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '065f663e-401f-5593-983a-149cbbad6924'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'af959757-437a-4622-bb5e-e632865a1dcc',
    '065f663e-401f-5593-983a-149cbbad6924',
    68500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '065f663e-401f-5593-983a-149cbbad6924' AND effective_to IS NULL
);


--  (66000012) base=17200.0
UPDATE salary_structures
SET base_salary = 17200,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7dd94e90-8d7b-5c5a-a951-05417269bbe6'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'badeed52-9e30-4bf7-9c87-22d19e85b0bc',
    '7dd94e90-8d7b-5c5a-a951-05417269bbe6',
    17200,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7dd94e90-8d7b-5c5a-a951-05417269bbe6' AND effective_to IS NULL
);


--  (66000067) base=26620.0
UPDATE salary_structures
SET base_salary = 26620,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '37da4d12-64a1-5007-846d-36f1c49d3b23'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e42d03e3-3a47-404e-901f-a4544e100a9e',
    '37da4d12-64a1-5007-846d-36f1c49d3b23',
    26620,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '37da4d12-64a1-5007-846d-36f1c49d3b23' AND effective_to IS NULL
);


--  (66000147) base=16550.0
UPDATE salary_structures
SET base_salary = 16550,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'fd90e1e0-9da3-47cb-9559-36e31b3fc21f',
    '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68',
    16550,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68' AND effective_to IS NULL
);


--  (68000086) base=32850.0
UPDATE salary_structures
SET base_salary = 32850,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '32e2f1e2-b423-4c25-8688-47722219b679',
    '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9',
    32850,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9' AND effective_to IS NULL
);


--  (68000088) base=15125.0
UPDATE salary_structures
SET base_salary = 15125,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '9a1cdbf7-a679-5a4c-8414-ec629c8dba28'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'eef35956-2765-435c-9af0-03b84c3f3098',
    '9a1cdbf7-a679-5a4c-8414-ec629c8dba28',
    15125,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '9a1cdbf7-a679-5a4c-8414-ec629c8dba28' AND effective_to IS NULL
);


--  (68000182) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd2424c33-a067-5999-8787-90624c6de80f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '634e7e2e-98bb-42e8-b0a0-39148291c54e',
    'd2424c33-a067-5999-8787-90624c6de80f',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd2424c33-a067-5999-8787-90624c6de80f' AND effective_to IS NULL
);


--  (68000202) base=24000.0
UPDATE salary_structures
SET base_salary = 24000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1de4da72-36df-5bce-a298-ec902801dc5a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cb749a68-8985-4bc2-9c39-b2fcfa9ebd9f',
    '1de4da72-36df-5bce-a298-ec902801dc5a',
    24000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1de4da72-36df-5bce-a298-ec902801dc5a' AND effective_to IS NULL
);


--  (7) base=25000.0
UPDATE salary_structures
SET base_salary = 25000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '38edda8c-b8e5-4c90-86d0-ca60f05f5922',
    '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451',
    25000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451' AND effective_to IS NULL
);


--  (68100023) base=5000.0
UPDATE salary_structures
SET base_salary = 5000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a0d5f05b-e948-567c-9fab-f55a4aee49af'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8dc3f89d-28f9-4a9b-bd48-6ae99a0ac985',
    'a0d5f05b-e948-567c-9fab-f55a4aee49af',
    5000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a0d5f05b-e948-567c-9fab-f55a4aee49af' AND effective_to IS NULL
);


--  (68100024) base=5000.0
UPDATE salary_structures
SET base_salary = 5000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ee627c60-8120-5a24-97a4-f50c12571d41'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0b3a9bce-d462-4521-8d60-e4f00dbea616',
    'ee627c60-8120-5a24-97a4-f50c12571d41',
    5000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ee627c60-8120-5a24-97a4-f50c12571d41' AND effective_to IS NULL
);


--  (68100029) base=5000.0
UPDATE salary_structures
SET base_salary = 5000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '85b72e61-26c7-5a99-bb0c-15cad1e983db'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '94865470-7dd1-4277-84b4-1d07d8ec8160',
    '85b72e61-26c7-5a99-bb0c-15cad1e983db',
    5000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '85b72e61-26c7-5a99-bb0c-15cad1e983db' AND effective_to IS NULL
);


--  (LN027) base=5000.0
UPDATE salary_structures
SET base_salary = 5000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '6ccf9608-9200-5b8c-8227-28427fbb54fd'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '390f4a12-44b4-441f-b7b5-32eb86ed5682',
    '6ccf9608-9200-5b8c-8227-28427fbb54fd',
    5000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '6ccf9608-9200-5b8c-8227-28427fbb54fd' AND effective_to IS NULL
);


--  (63000021) base=46320.0
UPDATE salary_structures
SET base_salary = 46320,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9f9d6164-0409-4c32-af50-fcd379a93f11',
    '5724ca0e-00ed-5bf6-b350-19bb67a3ca83',
    46320,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' AND effective_to IS NULL
);


--  (68000151) base=56000.0
UPDATE salary_structures
SET base_salary = 56000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '45243a33-d4c9-5e54-85f4-fbb91180eca2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '197d6b41-dbee-40c9-aeb7-1bee79941188',
    '45243a33-d4c9-5e54-85f4-fbb91180eca2',
    56000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '45243a33-d4c9-5e54-85f4-fbb91180eca2' AND effective_to IS NULL
);


--  (68000197) base=40000.0
UPDATE salary_structures
SET base_salary = 40000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '189ba125-bf10-5648-aaa9-442e8791c4ed'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '266c19fc-3376-460e-8279-e8a7e24f2b2c',
    '189ba125-bf10-5648-aaa9-442e8791c4ed',
    40000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '189ba125-bf10-5648-aaa9-442e8791c4ed' AND effective_to IS NULL
);


--  (67000146) base=21080.0
UPDATE salary_structures
SET base_salary = 21080,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e6897d43-b5ae-49b9-b1c1-d772081b993a',
    '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb',
    21080,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb' AND effective_to IS NULL
);


--  (67000200) base=18880.0
UPDATE salary_structures
SET base_salary = 18880,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '03054231-d09f-593c-9614-e3539576a74e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '799434c4-7125-40f3-afbe-de11a9a412fb',
    '03054231-d09f-593c-9614-e3539576a74e',
    18880,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '03054231-d09f-593c-9614-e3539576a74e' AND effective_to IS NULL
);


--  (67000211) base=43980.0
UPDATE salary_structures
SET base_salary = 43980,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '57772cb0-784f-5525-b7df-bddded652e7e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '80201158-bca5-4654-b492-0f9fe95354f4',
    '57772cb0-784f-5525-b7df-bddded652e7e',
    43980,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '57772cb0-784f-5525-b7df-bddded652e7e' AND effective_to IS NULL
);


--  (68000161) base=26000.0
UPDATE salary_structures
SET base_salary = 26000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6c0e7c1e-dc5f-4d42-b92f-480f597bfdc4',
    '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5',
    26000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5' AND effective_to IS NULL
);


--  (68000178) base=30050.0
UPDATE salary_structures
SET base_salary = 30050,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd62503b0-fcc2-53c0-9890-1c98aae5c3a7'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6321d2d5-9d3e-42be-93b9-f4dc0d7c17dd',
    'd62503b0-fcc2-53c0-9890-1c98aae5c3a7',
    30050,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd62503b0-fcc2-53c0-9890-1c98aae5c3a7' AND effective_to IS NULL
);


--  (68000179) base=30050.0
UPDATE salary_structures
SET base_salary = 30050,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'fff2b4aa-c914-52dc-b869-af609eb7a949'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b52f0ade-6166-40b6-9d2a-8a81cb9a8a25',
    'fff2b4aa-c914-52dc-b869-af609eb7a949',
    30050,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'fff2b4aa-c914-52dc-b869-af609eb7a949' AND effective_to IS NULL
);


--  (68000180) base=29750.0
UPDATE salary_structures
SET base_salary = 29750,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2a137c36-1cf5-5c33-8386-cc1db2ec244a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c9e3f9c4-ef70-4664-8b6f-8a9396ced071',
    '2a137c36-1cf5-5c33-8386-cc1db2ec244a',
    29750,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2a137c36-1cf5-5c33-8386-cc1db2ec244a' AND effective_to IS NULL
);


--  (62000002) base=38000.0
UPDATE salary_structures
SET base_salary = 38000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'fbbdec71-7de7-4731-b90d-ddf4744001c2',
    '4cd519ef-216a-5a5b-8a80-3fcd0e85d777',
    38000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' AND effective_to IS NULL
);


--  (68000089) base=44240.0
UPDATE salary_structures
SET base_salary = 44240,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '63a37220-6950-5b93-8af6-60ec35886d6a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1a5fb0b9-7153-46b4-8c23-5fb2fbce82b2',
    '63a37220-6950-5b93-8af6-60ec35886d6a',
    44240,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '63a37220-6950-5b93-8af6-60ec35886d6a' AND effective_to IS NULL
);


--  (68000251) base=40000.0
UPDATE salary_structures
SET base_salary = 40000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '31f98fd2-9493-5f30-9a8b-683d5647c722'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5a609d13-7a6e-4979-b3fb-d8cdfefa5292',
    '31f98fd2-9493-5f30-9a8b-683d5647c722',
    40000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '31f98fd2-9493-5f30-9a8b-683d5647c722' AND effective_to IS NULL
);


--  (68000250) base=17000.0
UPDATE salary_structures
SET base_salary = 17000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '780e64f2-2e21-55cc-ab4d-17132e63c8e6'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9cb4bf94-3c30-401f-914a-790eb068ac3d',
    '780e64f2-2e21-55cc-ab4d-17132e63c8e6',
    17000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '780e64f2-2e21-55cc-ab4d-17132e63c8e6' AND effective_to IS NULL
);


--  (68000254) base=73333.0
UPDATE salary_structures
SET base_salary = 73333,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1127bd3f-a6cb-42db-9d17-ca8d6313aae5',
    'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b',
    73333,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b' AND effective_to IS NULL
);


--  (68000256) base=33333.0
UPDATE salary_structures
SET base_salary = 33333,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e19ac5c8-92ac-44f4-8c66-89887a38d8c7',
    'd8a906e6-41d6-592d-bb22-dd02219a8d57',
    33333,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57' AND effective_to IS NULL
);


--  (69000001) base=20267.0
UPDATE salary_structures
SET base_salary = 20267,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '47edf2aa-8c3b-5d53-87e6-647e4d8ac594'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b8da597f-25ad-4c45-a524-98969cc64b44',
    '47edf2aa-8c3b-5d53-87e6-647e4d8ac594',
    20267,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '47edf2aa-8c3b-5d53-87e6-647e4d8ac594' AND effective_to IS NULL
);


--  (69000015) base=15167.0
UPDATE salary_structures
SET base_salary = 15167,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7a30a6ae-81be-5d24-aa71-3b2dfab8f149'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '82c84e4f-bb73-49b9-8d62-69dee535bc6e',
    '7a30a6ae-81be-5d24-aa71-3b2dfab8f149',
    15167,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7a30a6ae-81be-5d24-aa71-3b2dfab8f149' AND effective_to IS NULL
);


--  (69000012) base=10000.0
UPDATE salary_structures
SET base_salary = 10000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '0baae162-2014-529f-880f-2624bc8a7fa5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0819253e-80c1-41de-8892-583f62191fcd',
    '0baae162-2014-529f-880f-2624bc8a7fa5',
    10000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0baae162-2014-529f-880f-2624bc8a7fa5' AND effective_to IS NULL
);


--  (68000252) base=33500.0
UPDATE salary_structures
SET base_salary = 33500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'bdc5955f-e72d-51ac-9419-71a04cb0e914'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '99bcb048-9a4d-4c96-a27f-f6685e65cfd7',
    'bdc5955f-e72d-51ac-9419-71a04cb0e914',
    33500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bdc5955f-e72d-51ac-9419-71a04cb0e914' AND effective_to IS NULL
);


--  (64000007) base=25770.0
UPDATE salary_structures
SET base_salary = 25770,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd30e684c-33b9-563f-842a-c91c917f42b9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'aa25dd71-619c-4cc6-938b-93fe3eb02d33',
    'd30e684c-33b9-563f-842a-c91c917f42b9',
    25770,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd30e684c-33b9-563f-842a-c91c917f42b9' AND effective_to IS NULL
);


--  (66000060) base=36950.0
UPDATE salary_structures
SET base_salary = 36950,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '802e77f9-2e16-54cb-8074-cff31dc1ad4d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8336ffc7-a150-4f28-95cd-98fe377b5e0a',
    '802e77f9-2e16-54cb-8074-cff31dc1ad4d',
    36950,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '802e77f9-2e16-54cb-8074-cff31dc1ad4d' AND effective_to IS NULL
);


--  (66000062) base=53650.0
UPDATE salary_structures
SET base_salary = 53650,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'f6e156c7-10aa-50b9-8b47-38954627ba02'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ac54fa6f-f636-4d31-ac99-9b874ae212d2',
    'f6e156c7-10aa-50b9-8b47-38954627ba02',
    53650,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f6e156c7-10aa-50b9-8b47-38954627ba02' AND effective_to IS NULL
);


--  (67000006) base=32000.0
UPDATE salary_structures
SET base_salary = 32000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '793a1798-aebf-5b6e-b824-9c0096102698'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '37b9dad6-eada-4d8c-acfa-6fc3c972ff58',
    '793a1798-aebf-5b6e-b824-9c0096102698',
    32000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '793a1798-aebf-5b6e-b824-9c0096102698' AND effective_to IS NULL
);


--  (67000007) base=33470.0
UPDATE salary_structures
SET base_salary = 33470,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a658837b-4b2e-5ea4-873f-75abbf1882e4'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e405fd39-b6d7-4154-85dc-f39f3d59b2d6',
    'a658837b-4b2e-5ea4-873f-75abbf1882e4',
    33470,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a658837b-4b2e-5ea4-873f-75abbf1882e4' AND effective_to IS NULL
);


--  (67000017) base=77000.0
UPDATE salary_structures
SET base_salary = 77000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6a50a102-d8a2-4726-8a8f-270751cbdef3',
    '07011d28-ec15-5afe-8bc7-0a24f4127b26',
    77000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' AND effective_to IS NULL
);


--  (67000106) base=21615.0
UPDATE salary_structures
SET base_salary = 21615,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '13cd8ec0-e612-5049-91af-0e9f93e8e380'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '85cb8621-97b4-47a2-b8db-d14ff1323c6c',
    '13cd8ec0-e612-5049-91af-0e9f93e8e380',
    21615,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '13cd8ec0-e612-5049-91af-0e9f93e8e380' AND effective_to IS NULL
);


--  (67000145) base=28500.0
UPDATE salary_structures
SET base_salary = 28500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3f498c69-11f1-4b3c-a7e9-ac75fca723ce',
    '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42',
    28500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42' AND effective_to IS NULL
);


--  (67000166) base=24406.0
UPDATE salary_structures
SET base_salary = 24406,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '46073041-061c-4263-a074-d512199fa304',
    'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7',
    24406,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7' AND effective_to IS NULL
);


--  (67000170) base=26625.0
UPDATE salary_structures
SET base_salary = 26625,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5a8848e9-1cb3-5147-b7b2-db12ec254d20'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '711d5a89-4141-4efd-bfb2-eae32b7b0379',
    '5a8848e9-1cb3-5147-b7b2-db12ec254d20',
    26625,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5a8848e9-1cb3-5147-b7b2-db12ec254d20' AND effective_to IS NULL
);


--  (67000172) base=20970.0
UPDATE salary_structures
SET base_salary = 20970,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '64137af9-0eea-547a-bae4-73ddc8138906'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4dc1da7b-5fd6-4557-ba64-7bd49f29db96',
    '64137af9-0eea-547a-bae4-73ddc8138906',
    20970,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '64137af9-0eea-547a-bae4-73ddc8138906' AND effective_to IS NULL
);


--  (67000194) base=33260.0
UPDATE salary_structures
SET base_salary = 33260,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1369abad-794f-5ff7-9f9b-be437b1808ba'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9c16ff83-a956-4caa-b732-19a7b6db8eba',
    '1369abad-794f-5ff7-9f9b-be437b1808ba',
    33260,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1369abad-794f-5ff7-9f9b-be437b1808ba' AND effective_to IS NULL
);


--  (67000212) base=24970.0
UPDATE salary_structures
SET base_salary = 24970,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3b01d99f-0cc2-53ec-96ca-e0f09339f37f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c2254218-f9a6-40f9-9c45-483789638b4c',
    '3b01d99f-0cc2-53ec-96ca-e0f09339f37f',
    24970,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3b01d99f-0cc2-53ec-96ca-e0f09339f37f' AND effective_to IS NULL
);


--  (67000221) base=22380.0
UPDATE salary_structures
SET base_salary = 22380,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7290e5f6-41c8-5c86-90d1-2fab07f56bac'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '26c9cb82-d0af-46be-a1c9-c2339dc6c0da',
    '7290e5f6-41c8-5c86-90d1-2fab07f56bac',
    22380,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7290e5f6-41c8-5c86-90d1-2fab07f56bac' AND effective_to IS NULL
);


--  (67000222) base=24500.0
UPDATE salary_structures
SET base_salary = 24500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '77795aab-26bf-50e9-b8f3-064ac641b836'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '988f6b93-380a-46fa-9ed9-18e7f6de90f1',
    '77795aab-26bf-50e9-b8f3-064ac641b836',
    24500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '77795aab-26bf-50e9-b8f3-064ac641b836' AND effective_to IS NULL
);


--  (67000234) base=26835.0
UPDATE salary_structures
SET base_salary = 26835,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ebd63099-b4ee-5f5b-ae09-33845b383555'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8121c71e-5ca2-4dc1-84f0-615433ab5b38',
    'ebd63099-b4ee-5f5b-ae09-33845b383555',
    26835,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ebd63099-b4ee-5f5b-ae09-33845b383555' AND effective_to IS NULL
);


--  (67000239) base=18720.0
UPDATE salary_structures
SET base_salary = 18720,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '625309a9-adc8-5402-a4f6-ea34aaae2b1b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0dbf9cdc-11f1-4f05-b8ee-866d51d57e37',
    '625309a9-adc8-5402-a4f6-ea34aaae2b1b',
    18720,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '625309a9-adc8-5402-a4f6-ea34aaae2b1b' AND effective_to IS NULL
);


--  (68000016) base=20890.0
UPDATE salary_structures
SET base_salary = 20890,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '84f74b39-53f4-537e-b586-22d343f2ce03'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '601cf3fd-e972-46b4-bdde-f69e7bf18513',
    '84f74b39-53f4-537e-b586-22d343f2ce03',
    20890,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '84f74b39-53f4-537e-b586-22d343f2ce03' AND effective_to IS NULL
);


--  (68000023) base=29210.0
UPDATE salary_structures
SET base_salary = 29210,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '48d6ef71-defa-58b7-b39b-7368acce71cc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'dd0b08ad-837f-485f-9f6e-5ea12f8d733b',
    '48d6ef71-defa-58b7-b39b-7368acce71cc',
    29210,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '48d6ef71-defa-58b7-b39b-7368acce71cc' AND effective_to IS NULL
);


--  (68000091) base=30725.0
UPDATE salary_structures
SET base_salary = 30725,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '83657e81-303f-5055-ad23-ec79bc4073fd'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b63063d1-abc1-4503-b6f8-3607310ca1a0',
    '83657e81-303f-5055-ad23-ec79bc4073fd',
    30725,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '83657e81-303f-5055-ad23-ec79bc4073fd' AND effective_to IS NULL
);


--  (68000107) base=29705.0
UPDATE salary_structures
SET base_salary = 29705,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '707b476a-8c5a-5430-89fe-021cbda2fc38'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'bd9cd01e-baa6-40fc-81c4-e9e8f900b641',
    '707b476a-8c5a-5430-89fe-021cbda2fc38',
    29705,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '707b476a-8c5a-5430-89fe-021cbda2fc38' AND effective_to IS NULL
);


--  (68000236) base=25000.0
UPDATE salary_structures
SET base_salary = 25000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1826a0d5-5354-541e-abf9-df791e02c5dd'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f7a9b29d-29fc-4782-bae7-3d686be066cd',
    '1826a0d5-5354-541e-abf9-df791e02c5dd',
    25000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1826a0d5-5354-541e-abf9-df791e02c5dd' AND effective_to IS NULL
);


--  (68000259) base=32000.0
UPDATE salary_structures
SET base_salary = 32000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '6006e3e6-fd6d-53c9-a31b-985b21607ba6'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4be3c3cf-aee9-4e63-8efd-6a32b81f0ed4',
    '6006e3e6-fd6d-53c9-a31b-985b21607ba6',
    32000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '6006e3e6-fd6d-53c9-a31b-985b21607ba6' AND effective_to IS NULL
);


--  (66000086) base=33840.0
UPDATE salary_structures
SET base_salary = 33840,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4bb6362b-264e-42c3-b6bc-0a7570d12e13',
    'f6382597-6a8c-579d-8d94-0a1193902f0f',
    33840,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f' AND effective_to IS NULL
);


--  (67000136) base=23600.0
UPDATE salary_structures
SET base_salary = 23600,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ee734673-cef9-596f-b7fe-5de609bc4f7c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c9d181ab-01cc-4967-bddb-ce89c2db4029',
    'ee734673-cef9-596f-b7fe-5de609bc4f7c',
    23600,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ee734673-cef9-596f-b7fe-5de609bc4f7c' AND effective_to IS NULL
);


--  (67000137) base=22000.0
UPDATE salary_structures
SET base_salary = 22000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2235859b-73c7-5c77-bdd4-0c159adb7624'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd2fac437-2b4d-4f33-9ab8-ba369a3bb9ac',
    '2235859b-73c7-5c77-bdd4-0c159adb7624',
    22000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2235859b-73c7-5c77-bdd4-0c159adb7624' AND effective_to IS NULL
);


--  (67000230) base=22900.0
UPDATE salary_structures
SET base_salary = 22900,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b54351d3-da2f-5d26-8f92-92889a1ca8ab'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3c396727-48fe-4812-8a35-3849bfd4b814',
    'b54351d3-da2f-5d26-8f92-92889a1ca8ab',
    22900,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b54351d3-da2f-5d26-8f92-92889a1ca8ab' AND effective_to IS NULL
);


--  (68000215) base=21000.0
UPDATE salary_structures
SET base_salary = 21000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '09359ced-93b1-5e0b-9ee9-fabb567d48b0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5254fe19-1c49-4e4a-9f11-bed1809edec7',
    '09359ced-93b1-5e0b-9ee9-fabb567d48b0',
    21000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '09359ced-93b1-5e0b-9ee9-fabb567d48b0' AND effective_to IS NULL
);


--  (67000018) base=20810.0
UPDATE salary_structures
SET base_salary = 20810,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c88c6626-a374-539d-930b-306136977997'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '946e8b0e-b68c-4a21-a90f-f004dd17d8fd',
    'c88c6626-a374-539d-930b-306136977997',
    20810,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c88c6626-a374-539d-930b-306136977997' AND effective_to IS NULL
);


--  (67000039) base=21460.0
UPDATE salary_structures
SET base_salary = 21460,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '890906cd-c2df-4682-9a23-83f8ec381888',
    '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b',
    21460,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b' AND effective_to IS NULL
);


--  (67000040) base=21320.0
UPDATE salary_structures
SET base_salary = 21320,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '31073513-e581-4043-97d3-ba7d23562187',
    '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6',
    21320,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6' AND effective_to IS NULL
);


--  (67000041) base=18710.0
UPDATE salary_structures
SET base_salary = 18710,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'bf1ad737-8f17-4ea2-94a1-789aa8b03790',
    '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89',
    18710,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89' AND effective_to IS NULL
);


--  (67000078) base=17000.0
UPDATE salary_structures
SET base_salary = 17000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1b793501-8afc-5531-88c1-205bf90a30e8'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1d2df84a-f9ef-4f01-b125-81c32f6d1598',
    '1b793501-8afc-5531-88c1-205bf90a30e8',
    17000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1b793501-8afc-5531-88c1-205bf90a30e8' AND effective_to IS NULL
);


--  (67000113) base=19050.0
UPDATE salary_structures
SET base_salary = 19050,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a1532a3c-f9d0-53dc-9399-2b253ba98fa1'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f381f507-c724-4a1d-9f9c-bf8c4942bd7a',
    'a1532a3c-f9d0-53dc-9399-2b253ba98fa1',
    19050,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a1532a3c-f9d0-53dc-9399-2b253ba98fa1' AND effective_to IS NULL
);


--  (67000114) base=17520.0
UPDATE salary_structures
SET base_salary = 17520,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '42712cac-bd84-5f56-a186-61f3a30739fc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '85a13b37-e34b-49b4-83f8-ad2c251940d5',
    '42712cac-bd84-5f56-a186-61f3a30739fc',
    17520,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '42712cac-bd84-5f56-a186-61f3a30739fc' AND effective_to IS NULL
);


--  (67000139) base=21000.0
UPDATE salary_structures
SET base_salary = 21000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '664708b3-13aa-5759-b160-9f79d6aa25c3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '72c7fb42-2ff7-486a-82c1-f0f0e0500c9b',
    '664708b3-13aa-5759-b160-9f79d6aa25c3',
    21000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '664708b3-13aa-5759-b160-9f79d6aa25c3' AND effective_to IS NULL
);


--  (67000192) base=20800.0
UPDATE salary_structures
SET base_salary = 20800,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '485a1650-6a25-56e8-afcc-d4b4d55a46fb'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '76b56063-010f-422f-beb1-fb7bbe30c4e1',
    '485a1650-6a25-56e8-afcc-d4b4d55a46fb',
    20800,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '485a1650-6a25-56e8-afcc-d4b4d55a46fb' AND effective_to IS NULL
);


--  (67000199) base=24100.0
UPDATE salary_structures
SET base_salary = 24100,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a005ef46-0d18-59af-831a-8ee184c1e553'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd62f8100-8891-47fb-8f69-d3089f044da1',
    'a005ef46-0d18-59af-831a-8ee184c1e553',
    24100,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a005ef46-0d18-59af-831a-8ee184c1e553' AND effective_to IS NULL
);


--  (67000217) base=25980.0
UPDATE salary_structures
SET base_salary = 25980,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cfa6d927-c7cb-4780-b2e1-3f378a64e6b2',
    '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82',
    25980,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82' AND effective_to IS NULL
);


--  (67000228) base=15810.0
UPDATE salary_structures
SET base_salary = 15810,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '664a11a2-c908-5141-b6cf-25338e5ebed5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b9f49e82-c3d7-42a1-b49a-4fb3ac3481b6',
    '664a11a2-c908-5141-b6cf-25338e5ebed5',
    15810,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '664a11a2-c908-5141-b6cf-25338e5ebed5' AND effective_to IS NULL
);


--  (67000231) base=16650.0
UPDATE salary_structures
SET base_salary = 16650,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'df6340d1-f9e4-5cea-96a5-27648403aab4'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '63416b03-6209-4138-b8dd-a61fb11f519e',
    'df6340d1-f9e4-5cea-96a5-27648403aab4',
    16650,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'df6340d1-f9e4-5cea-96a5-27648403aab4' AND effective_to IS NULL
);


--  (68000098) base=18425.0
UPDATE salary_structures
SET base_salary = 18425,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b2c6b689-9bdb-5a09-978c-92a6eb85e111'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5e8698c4-ab49-411b-b701-92e59bf5d306',
    'b2c6b689-9bdb-5a09-978c-92a6eb85e111',
    18425,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b2c6b689-9bdb-5a09-978c-92a6eb85e111' AND effective_to IS NULL
);


--  (68000255) base=45000.0
UPDATE salary_structures
SET base_salary = 45000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'afe52e0b-fbee-58f4-b3e9-8256047867e0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9a036641-e91e-47cd-a219-0c5a4ec73bd0',
    'afe52e0b-fbee-58f4-b3e9-8256047867e0',
    45000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'afe52e0b-fbee-58f4-b3e9-8256047867e0' AND effective_to IS NULL
);


--  (65000026) base=29600.0
UPDATE salary_structures
SET base_salary = 29600,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '68718dc3-bd6a-5360-a508-bf786665cf8b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8031226f-41a3-4ac6-8c83-0663cebea620',
    '68718dc3-bd6a-5360-a508-bf786665cf8b',
    29600,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '68718dc3-bd6a-5360-a508-bf786665cf8b' AND effective_to IS NULL
);


--  (67000121) base=18350.0
UPDATE salary_structures
SET base_salary = 18350,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ac2495ca-9f04-573b-b948-762cb2d9181e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '121a772b-f871-4f10-b600-0310a36c325c',
    'ac2495ca-9f04-573b-b948-762cb2d9181e',
    18350,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ac2495ca-9f04-573b-b948-762cb2d9181e' AND effective_to IS NULL
);


--  (67000216) base=20000.0
UPDATE salary_structures
SET base_salary = 20000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1681fd2f-3929-48c1-a7b3-376b2f900b59',
    '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb',
    20000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb' AND effective_to IS NULL
);


--  (66000081) base=23570.0
UPDATE salary_structures
SET base_salary = 23570,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1a4840e1-2821-4715-8a17-96a5a52f1e3e',
    '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602',
    23570,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602' AND effective_to IS NULL
);


--  (67000030) base=19000.0
UPDATE salary_structures
SET base_salary = 19000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd598a557-45d1-573f-91b1-596205ba1d6d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7a5abcd3-358b-4e85-89ce-ad98d8615a3c',
    'd598a557-45d1-573f-91b1-596205ba1d6d',
    19000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd598a557-45d1-573f-91b1-596205ba1d6d' AND effective_to IS NULL
);


--  (67000155) base=18640.0
UPDATE salary_structures
SET base_salary = 18640,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '51cd8c49-fbde-5867-972d-3d0652dd2fd2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0641998e-c4d7-49b6-87e4-fa428af2bbc6',
    '51cd8c49-fbde-5867-972d-3d0652dd2fd2',
    18640,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '51cd8c49-fbde-5867-972d-3d0652dd2fd2' AND effective_to IS NULL
);


--  (68000031) base=20670.0
UPDATE salary_structures
SET base_salary = 20670,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '898d6919-8cee-43d4-abb2-3933f8922ed5',
    '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2',
    20670,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2' AND effective_to IS NULL
);


--  (66000043) base=21100.0
UPDATE salary_structures
SET base_salary = 21100,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c082977a-0bc1-5dde-b47f-0ed372760372'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a2f4681e-20cf-44c5-b590-1f9c37cb22ca',
    'c082977a-0bc1-5dde-b47f-0ed372760372',
    21100,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c082977a-0bc1-5dde-b47f-0ed372760372' AND effective_to IS NULL
);


--  (66000057) base=25315.0
UPDATE salary_structures
SET base_salary = 25315,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'dec74611-986e-5d89-b59e-1b7934707223'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ec0ad147-40b6-4104-bca8-912cf79e63e5',
    'dec74611-986e-5d89-b59e-1b7934707223',
    25315,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'dec74611-986e-5d89-b59e-1b7934707223' AND effective_to IS NULL
);


--  (66000065) base=17820.0
UPDATE salary_structures
SET base_salary = 17820,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5c65c996-3864-5ef9-8a32-43096cabc679'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9e3018a5-a384-46c1-bc41-433f7b4370b0',
    '5c65c996-3864-5ef9-8a32-43096cabc679',
    17820,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5c65c996-3864-5ef9-8a32-43096cabc679' AND effective_to IS NULL
);


--  (66000090) base=21470.0
UPDATE salary_structures
SET base_salary = 21470,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'da050d9a-49bb-5707-90e3-df3936e06ee2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'dba96b24-1764-49b0-bedb-7324d23291bc',
    'da050d9a-49bb-5707-90e3-df3936e06ee2',
    21470,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'da050d9a-49bb-5707-90e3-df3936e06ee2' AND effective_to IS NULL
);


--  (67000025) base=20860.0
UPDATE salary_structures
SET base_salary = 20860,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '081bda8b-41a9-5b6d-8438-d9956686312d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1ee964bb-8c8c-4253-aadd-d372ada881d0',
    '081bda8b-41a9-5b6d-8438-d9956686312d',
    20860,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '081bda8b-41a9-5b6d-8438-d9956686312d' AND effective_to IS NULL
);


--  (67000206) base=18720.0
UPDATE salary_structures
SET base_salary = 18720,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '05ff0a88-7333-5168-85d3-7e41b4132f9d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '902d604f-24b3-449f-8bd1-958f9e558eeb',
    '05ff0a88-7333-5168-85d3-7e41b4132f9d',
    18720,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '05ff0a88-7333-5168-85d3-7e41b4132f9d' AND effective_to IS NULL
);


--  (68000238) base=22000.0
UPDATE salary_structures
SET base_salary = 22000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '457a6c56-7848-5815-a0ab-048a6f040c42'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a4eaa4b6-1b97-4676-aae5-84ce59934600',
    '457a6c56-7848-5815-a0ab-048a6f040c42',
    22000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '457a6c56-7848-5815-a0ab-048a6f040c42' AND effective_to IS NULL
);


--  (68000184) base=16000.0
UPDATE salary_structures
SET base_salary = 16000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '86ec31d6-74a7-515f-b8cb-ef8aea291ff2'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'aab566a1-34aa-4879-b1c0-30d5c4cdfec8',
    '86ec31d6-74a7-515f-b8cb-ef8aea291ff2',
    16000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '86ec31d6-74a7-515f-b8cb-ef8aea291ff2' AND effective_to IS NULL
);


--  (68000185) base=16000.0
UPDATE salary_structures
SET base_salary = 16000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '85a24d25-201f-54d6-9d29-c4131a11c151'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '36c82ec5-f25b-4b5b-b582-e36d2f86de50',
    '85a24d25-201f-54d6-9d29-c4131a11c151',
    16000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '85a24d25-201f-54d6-9d29-c4131a11c151' AND effective_to IS NULL
);


--  (66000110) base=23150.0
UPDATE salary_structures
SET base_salary = 23150,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1bb51058-8477-5429-b58f-cea1c9b42f89'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9fb81265-a56c-4443-b47d-4001b089da0a',
    '1bb51058-8477-5429-b58f-cea1c9b42f89',
    23150,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1bb51058-8477-5429-b58f-cea1c9b42f89' AND effective_to IS NULL
);


--  (67000174) base=13655.0
UPDATE salary_structures
SET base_salary = 13655,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8a488bb8-0545-5437-92d3-6a291cb433f3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8b540a72-20c5-4480-b9dc-a6ee40af70a1',
    '8a488bb8-0545-5437-92d3-6a291cb433f3',
    13655,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8a488bb8-0545-5437-92d3-6a291cb433f3' AND effective_to IS NULL
);


--  (67000183) base=13490.0
UPDATE salary_structures
SET base_salary = 13490,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '153ddbde-3392-5515-ba7b-c70713398f98'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7b7a8495-a963-46eb-855b-5221624f039b',
    '153ddbde-3392-5515-ba7b-c70713398f98',
    13490,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '153ddbde-3392-5515-ba7b-c70713398f98' AND effective_to IS NULL
);


--  (67000202) base=13440.0
UPDATE salary_structures
SET base_salary = 13440,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f7b7a61d-382e-4947-b9ba-2c1ee16c2aef',
    '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7',
    13440,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7' AND effective_to IS NULL
);


--  (67000203) base=13740.0
UPDATE salary_structures
SET base_salary = 13740,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '186afdf0-dd25-5244-a5aa-901ef2c116f6'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '099ae155-5df6-4d88-8028-8cda855d020a',
    '186afdf0-dd25-5244-a5aa-901ef2c116f6',
    13740,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '186afdf0-dd25-5244-a5aa-901ef2c116f6' AND effective_to IS NULL
);


--  (67000213) base=13540.0
UPDATE salary_structures
SET base_salary = 13540,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd9d3518f-d84f-5f04-a5e8-b1495a91462b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '73129ac5-0035-4de5-bce8-a3c3c626916f',
    'd9d3518f-d84f-5f04-a5e8-b1495a91462b',
    13540,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd9d3518f-d84f-5f04-a5e8-b1495a91462b' AND effective_to IS NULL
);


--  (67000238) base=13715.0
UPDATE salary_structures
SET base_salary = 13715,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '16e2ad45-d2bc-59ca-b661-973cc8ef9642'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '2564ad98-59f2-493b-95a9-8d53ec71ec9d',
    '16e2ad45-d2bc-59ca-b661-973cc8ef9642',
    13715,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '16e2ad45-d2bc-59ca-b661-973cc8ef9642' AND effective_to IS NULL
);


--  (67000242) base=13715.0
UPDATE salary_structures
SET base_salary = 13715,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a4e58a74-865e-511e-abad-777a9289935f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '49e65b44-2b86-48bd-baaf-50b26c7f6489',
    'a4e58a74-865e-511e-abad-777a9289935f',
    13715,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a4e58a74-865e-511e-abad-777a9289935f' AND effective_to IS NULL
);


--  (68000001) base=13340.0
UPDATE salary_structures
SET base_salary = 13340,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a177bfbe-6129-5224-ba4e-33c497244c62'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ca7c0749-f5f9-403d-a1e4-9edc474d8a7b',
    'a177bfbe-6129-5224-ba4e-33c497244c62',
    13340,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a177bfbe-6129-5224-ba4e-33c497244c62' AND effective_to IS NULL
);


--  (68000022) base=13290.0
UPDATE salary_structures
SET base_salary = 13290,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b8e73cc0-3e5f-563a-8706-290ac4b62a16'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '85153e63-2b04-4a4a-b0a4-3d4b6a151e61',
    'b8e73cc0-3e5f-563a-8706-290ac4b62a16',
    13290,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b8e73cc0-3e5f-563a-8706-290ac4b62a16' AND effective_to IS NULL
);


--  (68000026) base=14710.0
UPDATE salary_structures
SET base_salary = 14710,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '76cfa76e-3fad-5ac9-84d3-efa06995ec78'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '949c673c-5236-47bb-a2b8-5c8be892ec51',
    '76cfa76e-3fad-5ac9-84d3-efa06995ec78',
    14710,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '76cfa76e-3fad-5ac9-84d3-efa06995ec78' AND effective_to IS NULL
);


--  (68000027) base=13290.0
UPDATE salary_structures
SET base_salary = 13290,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '46fe1473-8583-4e57-9d3c-9dac2ab0fbbd',
    'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41',
    13290,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41' AND effective_to IS NULL
);


--  (68000137) base=40000.0
UPDATE salary_structures
SET base_salary = 40000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '86febf74-ea70-54bd-a977-5fef41535de6'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6c7bd21e-c661-420a-a96b-11fcfdce706f',
    '86febf74-ea70-54bd-a977-5fef41535de6',
    40000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '86febf74-ea70-54bd-a977-5fef41535de6' AND effective_to IS NULL
);


--  (67000138) base=20053.0
UPDATE salary_structures
SET base_salary = 20053,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '92f4096b-2a1b-5143-a99a-cd7ec01d9362'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '90d38f0e-4011-4d05-8c5e-925f63364fe4',
    '92f4096b-2a1b-5143-a99a-cd7ec01d9362',
    20053,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '92f4096b-2a1b-5143-a99a-cd7ec01d9362' AND effective_to IS NULL
);


--  (68000265) base=23333.0
UPDATE salary_structures
SET base_salary = 23333,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '796a0b4c-79c4-5520-a5e6-1ca795541916'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e81bdfea-ceb7-4690-80f0-c715b5b61fb6',
    '796a0b4c-79c4-5520-a5e6-1ca795541916',
    23333,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '796a0b4c-79c4-5520-a5e6-1ca795541916' AND effective_to IS NULL
);


--  (68000257) base=21000.0
UPDATE salary_structures
SET base_salary = 21000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '01e70aa5-7aa3-5dfd-94de-8449453da0c0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '88b9f4db-5bfc-4056-8279-b8dc20c28011',
    '01e70aa5-7aa3-5dfd-94de-8449453da0c0',
    21000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '01e70aa5-7aa3-5dfd-94de-8449453da0c0' AND effective_to IS NULL
);


--  (68000109) base=20000.0
UPDATE salary_structures
SET base_salary = 20000,
    allowance_position = 0,
    allowance_transport = 3000,
    allowance_phone = 0
WHERE employee_id = 'f48a1ebc-9a36-520b-989c-27f98a568367'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1478f152-5ca3-4276-8273-524441502dca',
    'f48a1ebc-9a36-520b-989c-27f98a568367',
    20000,
    0,
    3000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f48a1ebc-9a36-520b-989c-27f98a568367' AND effective_to IS NULL
);


--  (68000010) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 3000,
    allowance_phone = 0
WHERE employee_id = '5042062a-fafb-5613-bd98-6c5df5e2446e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '27558c45-ee16-4858-8949-8259514aa38b',
    '5042062a-fafb-5613-bd98-6c5df5e2446e',
    15000,
    0,
    3000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5042062a-fafb-5613-bd98-6c5df5e2446e' AND effective_to IS NULL
);


--  (68000150) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'e4f2e946-8f12-5c41-b917-806f22fdaa71'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'bce7e97a-25ad-4584-aec0-5cf35e70a82d',
    'e4f2e946-8f12-5c41-b917-806f22fdaa71',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e4f2e946-8f12-5c41-b917-806f22fdaa71' AND effective_to IS NULL
);


--  (68000130) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0485e72f-6d3a-49e2-b664-209d87e786c0',
    'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7' AND effective_to IS NULL
);


--  (68000071) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'b71285ba-208d-5ad4-a2bf-5c5210ab1c37'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '308817d8-5467-4c0e-b912-4a5480f1daeb',
    'b71285ba-208d-5ad4-a2bf-5c5210ab1c37',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b71285ba-208d-5ad4-a2bf-5c5210ab1c37' AND effective_to IS NULL
);


--  (68000156) base=5200.0
UPDATE salary_structures
SET base_salary = 5200,
    allowance_position = 0,
    allowance_transport = 433,
    allowance_phone = 0
WHERE employee_id = 'bf2af5ec-b907-532c-b526-a7c25e64b444'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '019d485a-3eb0-45ba-a52a-42c2a26dac4e',
    'bf2af5ec-b907-532c-b526-a7c25e64b444',
    5200,
    0,
    433,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bf2af5ec-b907-532c-b526-a7c25e64b444' AND effective_to IS NULL
);


--  (67000057) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'eb1ead33-8b1a-5574-9c62-487464194b46'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3bcb0644-4891-42db-ab72-9e050176f7d2',
    'eb1ead33-8b1a-5574-9c62-487464194b46',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'eb1ead33-8b1a-5574-9c62-487464194b46' AND effective_to IS NULL
);


--  (68000230) base=9500.0
UPDATE salary_structures
SET base_salary = 9500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '10902689-7bcc-5f16-949a-4cceb705ba47'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b11e9a79-0425-41ea-9246-77e123317342',
    '10902689-7bcc-5f16-949a-4cceb705ba47',
    9500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '10902689-7bcc-5f16-949a-4cceb705ba47' AND effective_to IS NULL
);


--  (68000200) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'cb15f429-7960-5737-955c-e8665139179a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4e00df40-c6bf-48c3-a5f0-9bbe35e0fe45',
    'cb15f429-7960-5737-955c-e8665139179a',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'cb15f429-7960-5737-955c-e8665139179a' AND effective_to IS NULL
);


--  (68000064) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '0e9d1639-6683-5898-bdc1-cd45a564f12b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cde6648f-ebe8-4a3a-b629-572e243b79c9',
    '0e9d1639-6683-5898-bdc1-cd45a564f12b',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0e9d1639-6683-5898-bdc1-cd45a564f12b' AND effective_to IS NULL
);


--  (67000160) base=12050.0
UPDATE salary_structures
SET base_salary = 12050,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '0780080e-5529-5a0f-ba33-ebf948042c22'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ca76ab46-a202-40c1-8e2d-3799b0e68c69',
    '0780080e-5529-5a0f-ba33-ebf948042c22',
    12050,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0780080e-5529-5a0f-ba33-ebf948042c22' AND effective_to IS NULL
);


--  (68000187) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '525c17d6-fa6b-5b0e-936e-95a0621ea2cc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8252b956-d75c-4d5c-8322-34bc06ea7c4f',
    '525c17d6-fa6b-5b0e-936e-95a0621ea2cc',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '525c17d6-fa6b-5b0e-936e-95a0621ea2cc' AND effective_to IS NULL
);


--  (68000207) base=25000.0
UPDATE salary_structures
SET base_salary = 25000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'aa8e9fe9-91f0-55c0-b923-f304d75617c4'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '992c4099-0a8a-456e-b746-4022eaa0a6cd',
    'aa8e9fe9-91f0-55c0-b923-f304d75617c4',
    25000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'aa8e9fe9-91f0-55c0-b923-f304d75617c4' AND effective_to IS NULL
);


--  (66000117) base=17850.0
UPDATE salary_structures
SET base_salary = 17850,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '08c9ebe2-cb8b-561c-86b2-e6e2395b8491'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '72225f3d-b3c8-450e-ae55-4710f5c646a9',
    '08c9ebe2-cb8b-561c-86b2-e6e2395b8491',
    17850,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '08c9ebe2-cb8b-561c-86b2-e6e2395b8491' AND effective_to IS NULL
);


--  (66000122) base=13650.0
UPDATE salary_structures
SET base_salary = 13650,
    allowance_position = 0,
    allowance_transport = 3000,
    allowance_phone = 0
WHERE employee_id = '91c83bdd-f1d8-5664-8241-a2014277fbf7'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '790a05a6-aa94-4b1e-80cd-169d99e7fdc6',
    '91c83bdd-f1d8-5664-8241-a2014277fbf7',
    13650,
    0,
    3000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '91c83bdd-f1d8-5664-8241-a2014277fbf7' AND effective_to IS NULL
);


--  (67000067) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'd75c0d8c-6cf5-5463-9f06-972464d768a9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5bc78a13-79ed-4ac6-8e66-f434d3ef2eb6',
    'd75c0d8c-6cf5-5463-9f06-972464d768a9',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd75c0d8c-6cf5-5463-9f06-972464d768a9' AND effective_to IS NULL
);


--  (67000148) base=15062.0
UPDATE salary_structures
SET base_salary = 15062,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4540c941-274c-5a7a-9b65-950a5bdbbe39'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b67101f4-56e0-4c7c-a7c4-29ac0817f640',
    '4540c941-274c-5a7a-9b65-950a5bdbbe39',
    15062,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4540c941-274c-5a7a-9b65-950a5bdbbe39' AND effective_to IS NULL
);


--  (68000243) base=13000.0
UPDATE salary_structures
SET base_salary = 13000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4c072784-039a-50aa-9360-5c0d655130d9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3b07e51e-ba5a-4f40-b4c6-3eef992f6534',
    '4c072784-039a-50aa-9360-5c0d655130d9',
    13000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4c072784-039a-50aa-9360-5c0d655130d9' AND effective_to IS NULL
);


--  (66000157) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6a7162d3-1e15-4262-aae3-935fa8a8dbdb',
    '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8' AND effective_to IS NULL
);


--  (67000005) base=15438.0
UPDATE salary_structures
SET base_salary = 15438,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e9c17fc7-1f0a-5581-b47c-2650deefb509'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '160efaa5-6775-4d71-81c2-4a7439aeb7ca',
    'e9c17fc7-1f0a-5581-b47c-2650deefb509',
    15438,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e9c17fc7-1f0a-5581-b47c-2650deefb509' AND effective_to IS NULL
);


--  (67000063) base=12100.0
UPDATE salary_structures
SET base_salary = 12100,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'b2aa721c-be83-502e-981b-6d5b7af9ff64'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '934bc5bb-f3e5-442e-bfb3-eb1561cf3372',
    'b2aa721c-be83-502e-981b-6d5b7af9ff64',
    12100,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b2aa721c-be83-502e-981b-6d5b7af9ff64' AND effective_to IS NULL
);


--  (68000009) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'de5c24c4-40c0-5be8-94cd-76475d77f735'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '72a4c232-26eb-4a4e-84bc-a3a0a34f2e25',
    'de5c24c4-40c0-5be8-94cd-76475d77f735',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'de5c24c4-40c0-5be8-94cd-76475d77f735' AND effective_to IS NULL
);


--  (68000248) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7d0da298-493e-5195-80db-dcc1bf14a586'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'de50962e-00af-4517-b469-6e203e4f69c1',
    '7d0da298-493e-5195-80db-dcc1bf14a586',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7d0da298-493e-5195-80db-dcc1bf14a586' AND effective_to IS NULL
);


--  (67000179) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '8e9ac011-bd26-57e5-ad81-851a487bff74'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ecb0aab1-6ba4-4e62-9578-80b6e2506cbe',
    '8e9ac011-bd26-57e5-ad81-851a487bff74',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8e9ac011-bd26-57e5-ad81-851a487bff74' AND effective_to IS NULL
);


--  (67000187) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c6c80162-b3d6-5cc5-8894-74c06f8e69ff'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '92388dbe-42d3-46d4-b89f-fe88b11e664a',
    'c6c80162-b3d6-5cc5-8894-74c06f8e69ff',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c6c80162-b3d6-5cc5-8894-74c06f8e69ff' AND effective_to IS NULL
);


--  (68000050) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '125b70c0-b68a-55be-b901-7ae49354419b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8d903bc8-bb15-4320-888a-083162310fb0',
    '125b70c0-b68a-55be-b901-7ae49354419b',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '125b70c0-b68a-55be-b901-7ae49354419b' AND effective_to IS NULL
);


--  (68000052) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '821507e5-bcb7-5d3b-b6af-1bb249c93e3d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'adcced69-e2e2-4e49-9e7b-b7a93c4f331a',
    '821507e5-bcb7-5d3b-b6af-1bb249c93e3d',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '821507e5-bcb7-5d3b-b6af-1bb249c93e3d' AND effective_to IS NULL
);


--  (68000057) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd9aa9fe5-ef23-5bf5-954c-87fb722752c0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9c4f052e-a4ef-4105-8cc8-c32853ea1e7d',
    'd9aa9fe5-ef23-5bf5-954c-87fb722752c0',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd9aa9fe5-ef23-5bf5-954c-87fb722752c0' AND effective_to IS NULL
);


--  (68000090) base=17000.0
UPDATE salary_structures
SET base_salary = 17000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'dbcdde33-8cde-436e-b07a-1d6c92f6c399',
    'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82',
    17000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82' AND effective_to IS NULL
);


--  (68000101) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6e22d6e2-942c-4bf2-8426-0d8a9758842d',
    '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931' AND effective_to IS NULL
);


--  (68000125) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd9374f1c-a86e-59dd-8bf5-907fb2e0222f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'bf95d2d8-a627-46fb-8115-fac6196948ba',
    'd9374f1c-a86e-59dd-8bf5-907fb2e0222f',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd9374f1c-a86e-59dd-8bf5-907fb2e0222f' AND effective_to IS NULL
);


--  (68000146) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e2c44b4f-4ab7-4620-b105-e9bc688c5395',
    '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b' AND effective_to IS NULL
);


--  (66000142) base=15038.0
UPDATE salary_structures
SET base_salary = 15038,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '69f26489-1d61-535f-89a6-3a704b365993'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '56f84a30-8df3-47ed-ac38-777f7c64f483',
    '69f26489-1d61-535f-89a6-3a704b365993',
    15038,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '69f26489-1d61-535f-89a6-3a704b365993' AND effective_to IS NULL
);


--  (67000074) base=12150.0
UPDATE salary_structures
SET base_salary = 12150,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '22fc8531-282a-5628-96e2-c1ffb582f4dc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f508da33-4fd8-473a-976c-9044a3b564be',
    '22fc8531-282a-5628-96e2-c1ffb582f4dc',
    12150,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '22fc8531-282a-5628-96e2-c1ffb582f4dc' AND effective_to IS NULL
);


--  (67000158) base=12050.0
UPDATE salary_structures
SET base_salary = 12050,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '4df3bef4-a420-51d3-9b39-6775a01e81f3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1a6e8963-71d2-49da-bf92-4836e6df9d90',
    '4df3bef4-a420-51d3-9b39-6775a01e81f3',
    12050,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4df3bef4-a420-51d3-9b39-6775a01e81f3' AND effective_to IS NULL
);


--  (68000186) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '99e7fbda-e804-556f-aa77-f6d31396196d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3ef531ee-b8a7-46e3-9990-4ed526a4ce6c',
    '99e7fbda-e804-556f-aa77-f6d31396196d',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '99e7fbda-e804-556f-aa77-f6d31396196d' AND effective_to IS NULL
);


--  (68000193) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'f8d4c553-8292-5f4a-a623-61a2801f54bf'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'befb36ed-1cd6-40da-b251-65c3f5e97196',
    'f8d4c553-8292-5f4a-a623-61a2801f54bf',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f8d4c553-8292-5f4a-a623-61a2801f54bf' AND effective_to IS NULL
);


--  (68000204) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b9aa155a-ae77-5480-9afa-541840cfc63f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '89c70697-23d3-4dd7-9b33-bed49bf1126c',
    'b9aa155a-ae77-5480-9afa-541840cfc63f',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b9aa155a-ae77-5480-9afa-541840cfc63f' AND effective_to IS NULL
);


--  (67000103) base=12100.0
UPDATE salary_structures
SET base_salary = 12100,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a74a47a2-a07d-4ef9-b4ba-dd5d78720407',
    'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9',
    12100,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9' AND effective_to IS NULL
);


--  (68000029) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '2f8de48d-9ede-562f-b143-648c0982930a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '27c1a141-292c-4cd1-b92e-e3c292c8ef32',
    '2f8de48d-9ede-562f-b143-648c0982930a',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2f8de48d-9ede-562f-b143-648c0982930a' AND effective_to IS NULL
);


--  (68000160) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'dd3ac8f8-85f9-5893-8d8d-00c705615d95'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '86e9463a-08f7-4066-98f9-c326bebead10',
    'dd3ac8f8-85f9-5893-8d8d-00c705615d95',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'dd3ac8f8-85f9-5893-8d8d-00c705615d95' AND effective_to IS NULL
);


--  (68000167) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '221f4ce3-8559-5a20-b8da-45a4bc9d9808'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'fdf5e4a1-f57a-432b-a83a-5dcdf4b7df97',
    '221f4ce3-8559-5a20-b8da-45a4bc9d9808',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '221f4ce3-8559-5a20-b8da-45a4bc9d9808' AND effective_to IS NULL
);


--  (68000195) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '09650291-b21c-5341-9ac2-4cae6e1d15f4'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5c452e17-89c8-4e30-8f96-0f2a436465a9',
    '09650291-b21c-5341-9ac2-4cae6e1d15f4',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '09650291-b21c-5341-9ac2-4cae6e1d15f4' AND effective_to IS NULL
);


--  (68000147) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'f7023f53-4a76-51b1-86cd-cf9f1f41ec04'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9b5b6ffa-de2c-4ac9-b306-9e4d0b351f48',
    'f7023f53-4a76-51b1-86cd-cf9f1f41ec04',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f7023f53-4a76-51b1-86cd-cf9f1f41ec04' AND effective_to IS NULL
);


--  (68000148) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = '61391e19-c7ab-5cb2-bac6-091bc676bf1f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c5ab0d73-da77-4b3e-9e95-db06e2815c25',
    '61391e19-c7ab-5cb2-bac6-091bc676bf1f',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '61391e19-c7ab-5cb2-bac6-091bc676bf1f' AND effective_to IS NULL
);


--  (68000124) base=12000.0
UPDATE salary_structures
SET base_salary = 12000,
    allowance_position = 0,
    allowance_transport = 1000,
    allowance_phone = 0
WHERE employee_id = 'c607ca11-6d7f-5ddb-bffb-2520f2c652ba'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3b00c450-d108-4d48-8e1e-e92d224393f2',
    'c607ca11-6d7f-5ddb-bffb-2520f2c652ba',
    12000,
    0,
    1000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c607ca11-6d7f-5ddb-bffb-2520f2c652ba' AND effective_to IS NULL
);


--  (68000208) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '24f7c8f7-7f24-4008-85c3-b7cf1496067f',
    'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c' AND effective_to IS NULL
);


--  (68000216) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '0112bd55-30fe-5356-b803-780b8324b198'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '48569997-9933-45b5-8030-221e3d86ac0d',
    '0112bd55-30fe-5356-b803-780b8324b198',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0112bd55-30fe-5356-b803-780b8324b198' AND effective_to IS NULL
);


--  (68000192) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8eb394aa-d000-50c7-8961-5e6e93d5d2fe'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7ac3e5ca-aba6-47b5-9eab-3f730611a983',
    '8eb394aa-d000-50c7-8961-5e6e93d5d2fe',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8eb394aa-d000-50c7-8961-5e6e93d5d2fe' AND effective_to IS NULL
);


--  (68000217) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a0b4881c-0b05-4dc9-8bfd-7a0a19b0cdc9',
    'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78' AND effective_to IS NULL
);


--  (68000233) base=3500.0
UPDATE salary_structures
SET base_salary = 3500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '370635ca-4642-50d4-8f7b-a28c9fad804b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3be05725-2a7c-44cf-92c4-dea319149448',
    '370635ca-4642-50d4-8f7b-a28c9fad804b',
    3500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '370635ca-4642-50d4-8f7b-a28c9fad804b' AND effective_to IS NULL
);


--  (69000017) base=4400.0
UPDATE salary_structures
SET base_salary = 4400,
    allowance_position = 0,
    allowance_transport = 1833,
    allowance_phone = 0
WHERE employee_id = '6a338509-e525-53ec-940c-21bd7329edf3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '157cdcf1-7fcc-4521-a8cd-6a188b4d9ae3',
    '6a338509-e525-53ec-940c-21bd7329edf3',
    4400,
    0,
    1833,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '6a338509-e525-53ec-940c-21bd7329edf3' AND effective_to IS NULL
);


--  (69000018) base=4800.0
UPDATE salary_structures
SET base_salary = 4800,
    allowance_position = 0,
    allowance_transport = 2000,
    allowance_phone = 0
WHERE employee_id = '66522e0c-15d1-5f8e-9908-725c0dff39df'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6baf43b8-23ef-4b8f-8e2b-eb9c1e0b820d',
    '66522e0c-15d1-5f8e-9908-725c0dff39df',
    4800,
    0,
    2000,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '66522e0c-15d1-5f8e-9908-725c0dff39df' AND effective_to IS NULL
);


--  (69000016) base=6000.0
UPDATE salary_structures
SET base_salary = 6000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd6781c94-8acb-5bca-8f1a-87b91b21b2a1'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd4df5408-ef2b-4bf1-81de-8ca9cc3c70cc',
    'd6781c94-8acb-5bca-8f1a-87b91b21b2a1',
    6000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd6781c94-8acb-5bca-8f1a-87b91b21b2a1' AND effective_to IS NULL
);


--  (69000021) base=6000.0
UPDATE salary_structures
SET base_salary = 6000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '48c82575-eae0-57e3-98aa-b83d421e73fd'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6fdbd2de-45f1-4e2d-af53-51f6f7219c5b',
    '48c82575-eae0-57e3-98aa-b83d421e73fd',
    6000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '48c82575-eae0-57e3-98aa-b83d421e73fd' AND effective_to IS NULL
);


--  (69000028) base=1500.0
UPDATE salary_structures
SET base_salary = 1500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8beafe18-b109-544d-ac59-07c7810e1a92'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd4aa7d4e-ad2a-4772-8f2f-659353530038',
    '8beafe18-b109-544d-ac59-07c7810e1a92',
    1500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8beafe18-b109-544d-ac59-07c7810e1a92' AND effective_to IS NULL
);


--  (68000240) base=6500.0
UPDATE salary_structures
SET base_salary = 6500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'cf23521a-f49a-5f16-bc8e-6868ae9d2b61'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0937d264-5a3d-478c-a7de-f86cbe07b6c4',
    'cf23521a-f49a-5f16-bc8e-6868ae9d2b61',
    6500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'cf23521a-f49a-5f16-bc8e-6868ae9d2b61' AND effective_to IS NULL
);


--  (69000010) base=8280.0
UPDATE salary_structures
SET base_salary = 8280,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b871ae33-5778-5f96-9561-2c612960b46d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1622e25d-de76-4a13-92a2-98beed301e99',
    'b871ae33-5778-5f96-9561-2c612960b46d',
    8280,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b871ae33-5778-5f96-9561-2c612960b46d' AND effective_to IS NULL
);


--  (69000026) base=2000.0
UPDATE salary_structures
SET base_salary = 2000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '6174c2f6-3787-5818-b109-2d49857deaa0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '10c0037e-3603-4b24-9520-8b0a41d000b3',
    '6174c2f6-3787-5818-b109-2d49857deaa0',
    2000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '6174c2f6-3787-5818-b109-2d49857deaa0' AND effective_to IS NULL
);


--  (69000027) base=2000.0
UPDATE salary_structures
SET base_salary = 2000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '9fc2f50a-c2cd-428a-b5be-f1bf81c594b2',
    'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5',
    2000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5' AND effective_to IS NULL
);


--  (69000005) base=11000.0
UPDATE salary_structures
SET base_salary = 11000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '29031ab6-5d1c-5c39-9250-9caf4abdbc9c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7fb13de1-75f5-4e58-b38b-b125bee96537',
    '29031ab6-5d1c-5c39-9250-9caf4abdbc9c',
    11000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '29031ab6-5d1c-5c39-9250-9caf4abdbc9c' AND effective_to IS NULL
);


--  (69000004) base=10500.0
UPDATE salary_structures
SET base_salary = 10500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '001ef185-73a1-4c67-a0ce-aa27ca3b3fb1',
    '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3',
    10500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3' AND effective_to IS NULL
);


--  (61000001) base=100000.0
UPDATE salary_structures
SET base_salary = 100000,
    allowance_position = 8500,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '43f790c8-91d7-4540-9055-27621630954e',
    'e939f7de-7ff7-5e57-b19e-e4625c3fa66e',
    100000,
    8500,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' AND effective_to IS NULL
);


--  (62000008) base=90515.0
UPDATE salary_structures
SET base_salary = 90515,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f75ccb3d-af51-416c-8383-e37eb757640c',
    '04cd3508-bd0c-50e3-a676-1c63a0db7bef',
    90515,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' AND effective_to IS NULL
);


--  (64000076) base=100000.0
UPDATE salary_structures
SET base_salary = 100000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '998d6f38-fcad-58dd-a19c-50c9d7a5a846'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'be7f1bd3-fe3c-4bda-a4c7-15b8b3c65340',
    '998d6f38-fcad-58dd-a19c-50c9d7a5a846',
    100000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '998d6f38-fcad-58dd-a19c-50c9d7a5a846' AND effective_to IS NULL
);


--  (65000027) base=52000.0
UPDATE salary_structures
SET base_salary = 52000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '774c1d1d-06d9-44b9-89c4-5756cb1fa31a',
    '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f',
    52000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f' AND effective_to IS NULL
);


--  (63000004) base=21660.0
UPDATE salary_structures
SET base_salary = 21660,
    allowance_position = 0,
    allowance_transport = 1200,
    allowance_phone = 0
WHERE employee_id = '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4f97c07c-3fc5-4edd-b3a8-872312f1ad79',
    '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5',
    21660,
    0,
    1200,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5' AND effective_to IS NULL
);


--  (63000013) base=18775.0
UPDATE salary_structures
SET base_salary = 18775,
    allowance_position = 0,
    allowance_transport = 720,
    allowance_phone = 0
WHERE employee_id = '8782c4a8-1e20-576e-84bc-c26f8a7ba212'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ffff7ee9-e109-4767-b11c-655dc5b7ba3a',
    '8782c4a8-1e20-576e-84bc-c26f8a7ba212',
    18775,
    0,
    720,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8782c4a8-1e20-576e-84bc-c26f8a7ba212' AND effective_to IS NULL
);


--  (66000103) base=14265.0
UPDATE salary_structures
SET base_salary = 14265,
    allowance_position = 0,
    allowance_transport = 720,
    allowance_phone = 0
WHERE employee_id = 'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8dd8f5f6-e8ce-4c48-ac92-8a94fc4f0ace',
    'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0',
    14265,
    0,
    720,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0' AND effective_to IS NULL
);


--  (67000016) base=16145.0
UPDATE salary_structures
SET base_salary = 16145,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '2f94e6ad-39ca-491c-8f98-a2c4574e1259',
    '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b',
    16145,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b' AND effective_to IS NULL
);


--  (67000047) base=14925.0
UPDATE salary_structures
SET base_salary = 14925,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '761e2d60-c9a2-5980-8291-33d7e6003b77'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6851c91b-974e-4be6-a35e-3d511a88e348',
    '761e2d60-c9a2-5980-8291-33d7e6003b77',
    14925,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '761e2d60-c9a2-5980-8291-33d7e6003b77' AND effective_to IS NULL
);


--  (67000048) base=14630.0
UPDATE salary_structures
SET base_salary = 14630,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '01de89c3-e9b9-5e00-9ad0-f84120e68f32'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4b8a852e-c6a3-42c4-8e80-3365e767dee6',
    '01de89c3-e9b9-5e00-9ad0-f84120e68f32',
    14630,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '01de89c3-e9b9-5e00-9ad0-f84120e68f32' AND effective_to IS NULL
);


--  (67000079) base=18000.0
UPDATE salary_structures
SET base_salary = 18000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '92434f86-a3f3-59fb-a171-2737f7e4eeb3'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cb93bd1b-6fff-4f29-9b50-cee3b50f2aa0',
    '92434f86-a3f3-59fb-a171-2737f7e4eeb3',
    18000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '92434f86-a3f3-59fb-a171-2737f7e4eeb3' AND effective_to IS NULL
);


--  (67000122) base=15750.0
UPDATE salary_structures
SET base_salary = 15750,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ac785da4-dad6-5d02-a244-5cfbcab2d652'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '23a9186d-e88f-4071-8812-453f960b85aa',
    'ac785da4-dad6-5d02-a244-5cfbcab2d652',
    15750,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ac785da4-dad6-5d02-a244-5cfbcab2d652' AND effective_to IS NULL
);


--  (67000131) base=15780.0
UPDATE salary_structures
SET base_salary = 15780,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '01cba86c-0fec-53e0-ae47-3d0c9b89114d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5f2a8dea-5052-42a6-9c1c-212852193f60',
    '01cba86c-0fec-53e0-ae47-3d0c9b89114d',
    15780,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '01cba86c-0fec-53e0-ae47-3d0c9b89114d' AND effective_to IS NULL
);


--  (67000141) base=15450.0
UPDATE salary_structures
SET base_salary = 15450,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '27a88639-284e-56a1-8411-e220b1ff791c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b66f790c-9791-413f-a006-911886b926e3',
    '27a88639-284e-56a1-8411-e220b1ff791c',
    15450,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '27a88639-284e-56a1-8411-e220b1ff791c' AND effective_to IS NULL
);


--  (67000142) base=15900.0
UPDATE salary_structures
SET base_salary = 15900,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '14212460-9e81-582a-bb96-29396c6a6042'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '6b704c31-7de0-4b19-a177-e9966bd7ccca',
    '14212460-9e81-582a-bb96-29396c6a6042',
    15900,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '14212460-9e81-582a-bb96-29396c6a6042' AND effective_to IS NULL
);


--  (68000083) base=15250.0
UPDATE salary_structures
SET base_salary = 15250,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '211dbd0d-5a0e-5292-a304-47b7d7558ee4'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1bd86c94-ae88-4b4c-be00-f5d424bcaae0',
    '211dbd0d-5a0e-5292-a304-47b7d7558ee4',
    15250,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '211dbd0d-5a0e-5292-a304-47b7d7558ee4' AND effective_to IS NULL
);


--  (68000092) base=15480.0
UPDATE salary_structures
SET base_salary = 15480,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'a8df724a-6971-57a6-9179-d322345a337a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f436e143-86a6-4457-8ce6-e60df12e4816',
    'a8df724a-6971-57a6-9179-d322345a337a',
    15480,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'a8df724a-6971-57a6-9179-d322345a337a' AND effective_to IS NULL
);


--  (68000181) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '9802ed5a-ab9e-55c1-965c-f39d4fcac334'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '88182ef6-383b-434a-83b0-bda50a28a857',
    '9802ed5a-ab9e-55c1-965c-f39d4fcac334',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '9802ed5a-ab9e-55c1-965c-f39d4fcac334' AND effective_to IS NULL
);


--  (68000191) base=15000.0
UPDATE salary_structures
SET base_salary = 15000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3335315b-d3a9-5b61-a1d7-e1c790b7379e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '455bffa3-25c4-4a9f-9bac-86af45f09d8e',
    '3335315b-d3a9-5b61-a1d7-e1c790b7379e',
    15000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3335315b-d3a9-5b61-a1d7-e1c790b7379e' AND effective_to IS NULL
);


--  (63000007) base=20615.0
UPDATE salary_structures
SET base_salary = 20615,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'cbecb087-f26d-50e0-9226-c158353aed33'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'fdcb0db1-88c1-4279-92f0-22275b7f09c4',
    'cbecb087-f26d-50e0-9226-c158353aed33',
    20615,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'cbecb087-f26d-50e0-9226-c158353aed33' AND effective_to IS NULL
);


--  (63000030) base=19900.0
UPDATE salary_structures
SET base_salary = 19900,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c62ae54d-1b75-5b9e-b578-de1d9b564671'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b445e056-30d4-48e0-ba3c-d004427d3c70',
    'c62ae54d-1b75-5b9e-b578-de1d9b564671',
    19900,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c62ae54d-1b75-5b9e-b578-de1d9b564671' AND effective_to IS NULL
);


--  (64000037) base=16965.0
UPDATE salary_structures
SET base_salary = 16965,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1ffb0382-09aa-53d0-a817-29d984423507'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '52c607e0-8b28-42b4-aaf1-958a34d5ad19',
    '1ffb0382-09aa-53d0-a817-29d984423507',
    16965,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1ffb0382-09aa-53d0-a817-29d984423507' AND effective_to IS NULL
);


--  (65000004) base=15760.0
UPDATE salary_structures
SET base_salary = 15760,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd0a056fc-fe69-5613-910a-de09ff7c4a88'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b7dd3132-6dc2-4bf6-adbe-8c909ad00c45',
    'd0a056fc-fe69-5613-910a-de09ff7c4a88',
    15760,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd0a056fc-fe69-5613-910a-de09ff7c4a88' AND effective_to IS NULL
);


--  (66000017) base=17100.0
UPDATE salary_structures
SET base_salary = 17100,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '0eb5e253-d653-50a5-9352-8616c6dad676'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3177021e-fc96-44e9-9bda-2444129b4956',
    '0eb5e253-d653-50a5-9352-8616c6dad676',
    17100,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0eb5e253-d653-50a5-9352-8616c6dad676' AND effective_to IS NULL
);


--  (66000069) base=16785.0
UPDATE salary_structures
SET base_salary = 16785,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'f512ff81-3577-58b8-bc43-c165f2527d96'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ddfb1d5a-4c7c-4687-8a77-2d77dc4fb02b',
    'f512ff81-3577-58b8-bc43-c165f2527d96',
    16785,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f512ff81-3577-58b8-bc43-c165f2527d96' AND effective_to IS NULL
);


--  (67000024) base=16900.0
UPDATE salary_structures
SET base_salary = 16900,
    allowance_position = 0,
    allowance_transport = 322,
    allowance_phone = 0
WHERE employee_id = '4fdf0298-8a50-569a-9ccc-47e027bad5bf'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '173d5213-19e2-4742-b17f-4d29c4a1a361',
    '4fdf0298-8a50-569a-9ccc-47e027bad5bf',
    16900,
    0,
    322,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4fdf0298-8a50-569a-9ccc-47e027bad5bf' AND effective_to IS NULL
);


--  (67000077) base=22900.0
UPDATE salary_structures
SET base_salary = 22900,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7d4edb9b-bdfd-5eb1-853b-97186b34397b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '4e503b36-e354-47f2-a903-681aaa293776',
    '7d4edb9b-bdfd-5eb1-853b-97186b34397b',
    22900,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7d4edb9b-bdfd-5eb1-853b-97186b34397b' AND effective_to IS NULL
);


--  (67000135) base=15665.0
UPDATE salary_structures
SET base_salary = 15665,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'af366d3f-6353-437d-a693-8d445883a131',
    'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d',
    15665,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d' AND effective_to IS NULL
);


--  (68000237) base=33000.0
UPDATE salary_structures
SET base_salary = 33000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8560d71d-54bd-5475-8503-a591f9e86510'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0edd9543-534b-4509-ad18-df2db7138857',
    '8560d71d-54bd-5475-8503-a591f9e86510',
    33000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8560d71d-54bd-5475-8503-a591f9e86510' AND effective_to IS NULL
);


--  (61000002) base=23050.0
UPDATE salary_structures
SET base_salary = 23050,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '0057e040-ea7c-4097-b487-6baaa77362ce',
    '05adf243-cb3e-570b-bf50-2b72a7b1f739',
    23050,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' AND effective_to IS NULL
);


--  (61000004) base=27880.0
UPDATE salary_structures
SET base_salary = 27880,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c09d917e-f4d0-4df2-861c-1e051eeed0f9',
    '7ab44fce-fced-5f3f-8f25-1db966f9c14b',
    27880,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b' AND effective_to IS NULL
);


--  (61000005) base=31240.0
UPDATE salary_structures
SET base_salary = 31240,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'f41241e9-4510-5f92-9743-55982477ea03'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '81a1f184-8287-4c27-a9e3-6e19d4aebbf8',
    'f41241e9-4510-5f92-9743-55982477ea03',
    31240,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'f41241e9-4510-5f92-9743-55982477ea03' AND effective_to IS NULL
);


--  (64000101) base=16690.0
UPDATE salary_structures
SET base_salary = 16690,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '70235a7f-36c5-59d8-959b-9cd3d10c925c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e443c450-ab55-4a48-b612-6a68b2aae2a7',
    '70235a7f-36c5-59d8-959b-9cd3d10c925c',
    16690,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '70235a7f-36c5-59d8-959b-9cd3d10c925c' AND effective_to IS NULL
);


--  (64000104) base=17460.0
UPDATE salary_structures
SET base_salary = 17460,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'bd56b283-9b42-568d-a514-2397a909aaee'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e54125f5-ee82-4fdd-8c80-4ccdd345958c',
    'bd56b283-9b42-568d-a514-2397a909aaee',
    17460,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bd56b283-9b42-568d-a514-2397a909aaee' AND effective_to IS NULL
);


--  (64000107) base=17660.0
UPDATE salary_structures
SET base_salary = 17660,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5df9bf71-89a8-546a-8456-897c58407d36'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5b566a87-b20f-4e3b-8c0b-98e2521ecad2',
    '5df9bf71-89a8-546a-8456-897c58407d36',
    17660,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5df9bf71-89a8-546a-8456-897c58407d36' AND effective_to IS NULL
);


--  (65000010) base=16950.0
UPDATE salary_structures
SET base_salary = 16950,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8a46d344-a4ed-4665-8189-dff6fc3fc1de',
    '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9',
    16950,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9' AND effective_to IS NULL
);


--  (65000063) base=15710.0
UPDATE salary_structures
SET base_salary = 15710,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e4d5e196-ae83-5461-ac69-7591ed03d182'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'cb35e141-3574-424e-a6da-69db120cbe6e',
    'e4d5e196-ae83-5461-ac69-7591ed03d182',
    15710,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e4d5e196-ae83-5461-ac69-7591ed03d182' AND effective_to IS NULL
);


--  (65000067) base=16400.0
UPDATE salary_structures
SET base_salary = 16400,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4168d710-be67-5e11-a2b9-30b130980b5f'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '271ac90a-e70f-4140-8e26-2f05545188dc',
    '4168d710-be67-5e11-a2b9-30b130980b5f',
    16400,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4168d710-be67-5e11-a2b9-30b130980b5f' AND effective_to IS NULL
);


--  (66000055) base=41650.0
UPDATE salary_structures
SET base_salary = 41650,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8c8b7a58-0085-4bb7-9996-120e857bb9ea',
    '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182',
    41650,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182' AND effective_to IS NULL
);


--  (66000113) base=14710.0
UPDATE salary_structures
SET base_salary = 14710,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'affaf1cd-7b35-522b-8cb4-9b2da375e2a1'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'da060432-0bd4-4ba2-afb8-e348600e5210',
    'affaf1cd-7b35-522b-8cb4-9b2da375e2a1',
    14710,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'affaf1cd-7b35-522b-8cb4-9b2da375e2a1' AND effective_to IS NULL
);


--  (66000115) base=16455.0
UPDATE salary_structures
SET base_salary = 16455,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1e22d175-b7ab-5634-846b-d06d493c291e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8bfa9e88-fb5a-4ac7-8cbb-1e2492a39088',
    '1e22d175-b7ab-5634-846b-d06d493c291e',
    16455,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1e22d175-b7ab-5634-846b-d06d493c291e' AND effective_to IS NULL
);


--  (67000096) base=13525.0
UPDATE salary_structures
SET base_salary = 13525,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '35bbe2c8-93e5-5736-8ef8-a531fbfbe321'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '252723ae-6a9c-4d46-af54-e8362b82a896',
    '35bbe2c8-93e5-5736-8ef8-a531fbfbe321',
    13525,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '35bbe2c8-93e5-5736-8ef8-a531fbfbe321' AND effective_to IS NULL
);


--  (67000128) base=13990.0
UPDATE salary_structures
SET base_salary = 13990,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '05d411f3-28c8-43ff-bb9b-4aa939ddecf7',
    'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d',
    13990,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d' AND effective_to IS NULL
);


--  (67000224) base=14705.0
UPDATE salary_structures
SET base_salary = 14705,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '50876a37-ea0b-55a8-882d-a7778ef5fe34'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '88b73f2d-a855-4dbc-9b36-a8525ec7100d',
    '50876a37-ea0b-55a8-882d-a7778ef5fe34',
    14705,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '50876a37-ea0b-55a8-882d-a7778ef5fe34' AND effective_to IS NULL
);


--  (67000233) base=14705.0
UPDATE salary_structures
SET base_salary = 14705,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'c281bc5d-8b81-5652-87e9-ed6a373c9521'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '20972bfa-b300-404e-8cbe-c88611dd6d84',
    'c281bc5d-8b81-5652-87e9-ed6a373c9521',
    14705,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'c281bc5d-8b81-5652-87e9-ed6a373c9521' AND effective_to IS NULL
);


--  (68000053) base=13300.0
UPDATE salary_structures
SET base_salary = 13300,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7879198a-47eb-5287-868a-46184c4e20fc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'aff56e11-44ac-401f-a8b2-e823d32543b5',
    '7879198a-47eb-5287-868a-46184c4e20fc',
    13300,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7879198a-47eb-5287-868a-46184c4e20fc' AND effective_to IS NULL
);


--  (68000078) base=12360.0
UPDATE salary_structures
SET base_salary = 12360,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd29a237f-3405-5fad-a674-111a79fdf72a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '46cb84b6-3c2a-47db-ba2b-5d04d82c974c',
    'd29a237f-3405-5fad-a674-111a79fdf72a',
    12360,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd29a237f-3405-5fad-a674-111a79fdf72a' AND effective_to IS NULL
);


--  (68000084) base=12135.0
UPDATE salary_structures
SET base_salary = 12135,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '517f9a6a-d0db-51d9-a416-0158489f3161'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '75f70a95-ba01-4355-8e20-f55b2ad31720',
    '517f9a6a-d0db-51d9-a416-0158489f3161',
    12135,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '517f9a6a-d0db-51d9-a416-0158489f3161' AND effective_to IS NULL
);


--  (68000096) base=13120.0
UPDATE salary_structures
SET base_salary = 13120,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5b40ce1a-4391-48fa-ab8f-6a8661cb7a28',
    '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8',
    13120,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8' AND effective_to IS NULL
);


--  (68000099) base=13050.0
UPDATE salary_structures
SET base_salary = 13050,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '4c8ac637-78b3-5d13-b3ec-f7e002e6b629'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '1638b1df-bedb-4534-801d-b16ab1b988fd',
    '4c8ac637-78b3-5d13-b3ec-f7e002e6b629',
    13050,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '4c8ac637-78b3-5d13-b3ec-f7e002e6b629' AND effective_to IS NULL
);


--  (68000103) base=13100.0
UPDATE salary_structures
SET base_salary = 13100,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '31b08cea-3039-4bff-bf33-63e426b01ebc',
    'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830',
    13100,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830' AND effective_to IS NULL
);


--  (68000105) base=41650.0
UPDATE salary_structures
SET base_salary = 41650,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '39e57597-eb36-5a13-81b1-6405012c8f50'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '023c32c4-ea95-45d6-9b2f-ad0a08a7f240',
    '39e57597-eb36-5a13-81b1-6405012c8f50',
    41650,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '39e57597-eb36-5a13-81b1-6405012c8f50' AND effective_to IS NULL
);


--  (68100004) base=13030.0
UPDATE salary_structures
SET base_salary = 13030,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'aceb5a8d-378a-5055-8980-0af1fe42ff72'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '3168bdba-2cc3-4f3d-98ac-c4b831a66a30',
    'aceb5a8d-378a-5055-8980-0af1fe42ff72',
    13030,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'aceb5a8d-378a-5055-8980-0af1fe42ff72' AND effective_to IS NULL
);


--  (68100005) base=13050.0
UPDATE salary_structures
SET base_salary = 13050,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '557e7170-28be-5496-aaf6-a6f8ef015d73'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'b1370d43-b0b0-4df3-abce-5bca702a2a5c',
    '557e7170-28be-5496-aaf6-a6f8ef015d73',
    13050,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '557e7170-28be-5496-aaf6-a6f8ef015d73' AND effective_to IS NULL
);


--  (68000112) base=13280.0
UPDATE salary_structures
SET base_salary = 13280,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '567a43db-535d-5c8d-a0f0-c5b587b72f32'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '61117943-5597-4e27-bb9a-8381c3c4fdf4',
    '567a43db-535d-5c8d-a0f0-c5b587b72f32',
    13280,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '567a43db-535d-5c8d-a0f0-c5b587b72f32' AND effective_to IS NULL
);


--  (68100006) base=13160.0
UPDATE salary_structures
SET base_salary = 13160,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '801c4439-a99d-5930-b3c6-04330b6d3aeb'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '725d5e5a-9117-4ef4-ba82-dd8114cd7ec7',
    '801c4439-a99d-5930-b3c6-04330b6d3aeb',
    13160,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '801c4439-a99d-5930-b3c6-04330b6d3aeb' AND effective_to IS NULL
);


--  (68100008) base=13290.0
UPDATE salary_structures
SET base_salary = 13290,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '985acd7c-d2f5-5477-8f99-58aaceec2453'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '77366f43-b81f-4df4-b486-b4adebe75627',
    '985acd7c-d2f5-5477-8f99-58aaceec2453',
    13290,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '985acd7c-d2f5-5477-8f99-58aaceec2453' AND effective_to IS NULL
);


--  (68100010) base=13100.0
UPDATE salary_structures
SET base_salary = 13100,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '9de24856-3251-5daa-90d2-c50418b50f1c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f66a126b-5874-481b-9583-ee3b87e22d2b',
    '9de24856-3251-5daa-90d2-c50418b50f1c',
    13100,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '9de24856-3251-5daa-90d2-c50418b50f1c' AND effective_to IS NULL
);


--  (68100011) base=13190.0
UPDATE salary_structures
SET base_salary = 13190,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '96579141-0036-5180-afb0-34c949c4eb47'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'e2f8c3fc-458f-404d-8ead-cbca814b3711',
    '96579141-0036-5180-afb0-34c949c4eb47',
    13190,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '96579141-0036-5180-afb0-34c949c4eb47' AND effective_to IS NULL
);


--  (68100013) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'db803dde-0a25-5c9c-820e-9e88125640e9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd708560f-881b-4ea5-af17-98e3b459cf2e',
    'db803dde-0a25-5c9c-820e-9e88125640e9',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'db803dde-0a25-5c9c-820e-9e88125640e9' AND effective_to IS NULL
);


--  (68100014) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'b18bf0ca-b052-51a9-9e12-2609feebf78d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '524af4f3-60d2-4190-8511-37ec71891e9d',
    'b18bf0ca-b052-51a9-9e12-2609feebf78d',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'b18bf0ca-b052-51a9-9e12-2609feebf78d' AND effective_to IS NULL
);


--  (68100015) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'd3ee833a-707a-5f09-acf0-104def5a0b76'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f5eef1a4-c777-4dcf-8c19-73873c149618',
    'd3ee833a-707a-5f09-acf0-104def5a0b76',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'd3ee833a-707a-5f09-acf0-104def5a0b76' AND effective_to IS NULL
);


--  (68100019) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3a2274aa-1922-5659-ab28-ff332c027911'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '083efe79-b611-4d98-95ab-2a1172a22690',
    '3a2274aa-1922-5659-ab28-ff332c027911',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3a2274aa-1922-5659-ab28-ff332c027911' AND effective_to IS NULL
);


--  (68100022) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '5c735131-aa5c-5b05-9463-4bb622a0ffbc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '065e53b7-5a0b-4c96-b62a-c231d9662602',
    '5c735131-aa5c-5b05-9463-4bb622a0ffbc',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '5c735131-aa5c-5b05-9463-4bb622a0ffbc' AND effective_to IS NULL
);


--  (68100026) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'fb1135d8-3185-585f-8a07-88dd63c6f813'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7ceb716f-7f8c-4b2c-b541-e092e577ee6a',
    'fb1135d8-3185-585f-8a07-88dd63c6f813',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'fb1135d8-3185-585f-8a07-88dd63c6f813' AND effective_to IS NULL
);


--  (68100031) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '52d1ae36-9dfa-56e1-bb7a-69389679d153'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7b4b6d4e-15bf-4b47-8413-bfa160048e05',
    '52d1ae36-9dfa-56e1-bb7a-69389679d153',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '52d1ae36-9dfa-56e1-bb7a-69389679d153' AND effective_to IS NULL
);


--  (68100034) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'da37a2bc-4e5a-5939-8c31-41152e00e266'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ebbd517b-7b42-49b1-9889-880aa6788919',
    'da37a2bc-4e5a-5939-8c31-41152e00e266',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'da37a2bc-4e5a-5939-8c31-41152e00e266' AND effective_to IS NULL
);


--  (68100037) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'bb5b9b81-8128-5443-89d1-80e892dc3ea0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c99cb262-1b93-4db4-8b5c-1cff8846c268',
    'bb5b9b81-8128-5443-89d1-80e892dc3ea0',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'bb5b9b81-8128-5443-89d1-80e892dc3ea0' AND effective_to IS NULL
);


--  (69000007) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1626dd3b-35d6-5975-8947-e2ad80b3e357'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '817eaca8-6d69-493f-928f-cd20166f9637',
    '1626dd3b-35d6-5975-8947-e2ad80b3e357',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1626dd3b-35d6-5975-8947-e2ad80b3e357' AND effective_to IS NULL
);


--  (69000008) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '0229c72f-ae2b-5abe-ba68-4e12f4ed387e'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c126def7-5c7f-4665-a6a6-af772f57df5b',
    '0229c72f-ae2b-5abe-ba68-4e12f4ed387e',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0229c72f-ae2b-5abe-ba68-4e12f4ed387e' AND effective_to IS NULL
);


--  (69000002) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ebf679fe-75a5-4582-bd22-566ef7e7ce90',
    'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8' AND effective_to IS NULL
);


--  (69000024) base=7083.0
UPDATE salary_structures
SET base_salary = 7083,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '93713aeb-34a6-5c25-8207-6292fcf7caa9'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'f0d37f48-eba1-472d-bcef-4bc5eb341968',
    '93713aeb-34a6-5c25-8207-6292fcf7caa9',
    7083,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '93713aeb-34a6-5c25-8207-6292fcf7caa9' AND effective_to IS NULL
);


--  (69000025) base=5000.0
UPDATE salary_structures
SET base_salary = 5000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a5bff098-202e-44ca-bfb8-a68ab7a3b093',
    '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc',
    5000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc' AND effective_to IS NULL
);


--  (62000004) base=19800.0
UPDATE salary_structures
SET base_salary = 19800,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '385dda09-e293-5f2d-bde4-4f663bf8d399'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c38911b1-4942-41d5-8829-ec03861f26d6',
    '385dda09-e293-5f2d-bde4-4f663bf8d399',
    19800,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '385dda09-e293-5f2d-bde4-4f663bf8d399' AND effective_to IS NULL
);


--  (62000006) base=23320.0
UPDATE salary_structures
SET base_salary = 23320,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3e1111f2-00b9-538d-82ad-08524935f918'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'a2f54337-d744-4c5e-a75c-b9fdac2c1463',
    '3e1111f2-00b9-538d-82ad-08524935f918',
    23320,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3e1111f2-00b9-538d-82ad-08524935f918' AND effective_to IS NULL
);


--  (63000036) base=17620.0
UPDATE salary_structures
SET base_salary = 17620,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '6fb24cf5-7d6f-50bf-a45d-893f879b9bce'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '5f59695c-b3e7-4f9d-bae2-b9f451271ec8',
    '6fb24cf5-7d6f-50bf-a45d-893f879b9bce',
    17620,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '6fb24cf5-7d6f-50bf-a45d-893f879b9bce' AND effective_to IS NULL
);


--  (64000046) base=18860.0
UPDATE salary_structures
SET base_salary = 18860,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '7413f985-25f9-5031-b2df-bfaf59568792'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'afa17286-2851-4854-9fba-ae8470107f92',
    '7413f985-25f9-5031-b2df-bfaf59568792',
    18860,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '7413f985-25f9-5031-b2df-bfaf59568792' AND effective_to IS NULL
);


--  (65000002) base=22140.0
UPDATE salary_structures
SET base_salary = 22140,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '0e1ccb9a-35e1-5441-b5b7-211ea13f6033'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '64f1fd8e-9893-4170-8411-2b8d0be28133',
    '0e1ccb9a-35e1-5441-b5b7-211ea13f6033',
    22140,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '0e1ccb9a-35e1-5441-b5b7-211ea13f6033' AND effective_to IS NULL
);


--  (65000003) base=22760.0
UPDATE salary_structures
SET base_salary = 22760,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '1ae6348f-2c52-56ac-86e3-e91579348600'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '914ecf2f-88b3-4776-8f0a-817a1aa2585f',
    '1ae6348f-2c52-56ac-86e3-e91579348600',
    22760,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '1ae6348f-2c52-56ac-86e3-e91579348600' AND effective_to IS NULL
);


--  (66000029) base=15590.0
UPDATE salary_structures
SET base_salary = 15590,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e812f3c2-feea-5992-b1c7-4fea26c4680a'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ec541364-39a2-462b-ad65-db72696450db',
    'e812f3c2-feea-5992-b1c7-4fea26c4680a',
    15590,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e812f3c2-feea-5992-b1c7-4fea26c4680a' AND effective_to IS NULL
);


--  (66000035) base=16454.0
UPDATE salary_structures
SET base_salary = 16454,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '51394f04-92ac-5a69-8516-5f7bece30192'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '709f1054-d5f7-4f51-88b5-907d8d3dc7fe',
    '51394f04-92ac-5a69-8516-5f7bece30192',
    16454,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '51394f04-92ac-5a69-8516-5f7bece30192' AND effective_to IS NULL
);


--  (66000104) base=13000.0
UPDATE salary_structures
SET base_salary = 13000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'cc9304a2-77ab-5ae6-80ea-d1830cf2f143'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '314a02de-c4d3-4fe9-878a-91829c0f5e31',
    'cc9304a2-77ab-5ae6-80ea-d1830cf2f143',
    13000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'cc9304a2-77ab-5ae6-80ea-d1830cf2f143' AND effective_to IS NULL
);


--  (67000101) base=12500.0
UPDATE salary_structures
SET base_salary = 12500,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '73826abd-667f-50cf-a372-799e1c0c3f16'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '8e25b613-1e8d-414e-9655-8713e069bfd5',
    '73826abd-667f-50cf-a372-799e1c0c3f16',
    12500,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '73826abd-667f-50cf-a372-799e1c0c3f16' AND effective_to IS NULL
);


--  (67000195) base=15340.0
UPDATE salary_structures
SET base_salary = 15340,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '8dbd9f52-aa10-57d2-842d-fad2a5586455'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'c3e26736-6459-4575-a33c-e53c57235d6e',
    '8dbd9f52-aa10-57d2-842d-fad2a5586455',
    15340,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '8dbd9f52-aa10-57d2-842d-fad2a5586455' AND effective_to IS NULL
);


--  (68000015) base=14290.0
UPDATE salary_structures
SET base_salary = 14290,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '94b5eb99-d5f8-5278-a0f1-df3317f4762c'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '7976c941-99c7-403a-88ce-6bd8fa6178af',
    '94b5eb99-d5f8-5278-a0f1-df3317f4762c',
    14290,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '94b5eb99-d5f8-5278-a0f1-df3317f4762c' AND effective_to IS NULL
);


--  (68000077) base=14210.0
UPDATE salary_structures
SET base_salary = 14210,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'dffa9393-9791-5e33-825b-c5584a79b44d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '33b7c974-2881-481d-9636-2b127e35ca7a',
    'dffa9393-9791-5e33-825b-c5584a79b44d',
    14210,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'dffa9393-9791-5e33-825b-c5584a79b44d' AND effective_to IS NULL
);


--  (68000102) base=16180.0
UPDATE salary_structures
SET base_salary = 16180,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = 'e1bb913d-be36-5415-a8a6-03ee4ee3ada0'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ca4200bb-7392-49b9-b78f-03e416244fd8',
    'e1bb913d-be36-5415-a8a6-03ee4ee3ada0',
    16180,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = 'e1bb913d-be36-5415-a8a6-03ee4ee3ada0' AND effective_to IS NULL
);


--  (68000119) base=13125.0
UPDATE salary_structures
SET base_salary = 13125,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '23ffc8a9-4fec-58a0-b289-f3a4846c61eb'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    '51dcebe4-0720-4e2d-99fa-5b4427e226e9',
    '23ffc8a9-4fec-58a0-b289-f3a4846c61eb',
    13125,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '23ffc8a9-4fec-58a0-b289-f3a4846c61eb' AND effective_to IS NULL
);


--  (68000145) base=13060.0
UPDATE salary_structures
SET base_salary = 13060,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '2be66e56-c051-5bc4-96b1-2e10c91d5588'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'ecf50795-d748-4b1d-8e86-65f2375bc832',
    '2be66e56-c051-5bc4-96b1-2e10c91d5588',
    13060,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '2be66e56-c051-5bc4-96b1-2e10c91d5588' AND effective_to IS NULL
);


--  (68000177) base=13000.0
UPDATE salary_structures
SET base_salary = 13000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '816e33ed-e784-582d-93b7-afe7b35abf3d'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'fc9f6543-1a67-46af-8506-3421eeb68aec',
    '816e33ed-e784-582d-93b7-afe7b35abf3d',
    13000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '816e33ed-e784-582d-93b7-afe7b35abf3d' AND effective_to IS NULL
);


--  (68000232) base=14000.0
UPDATE salary_structures
SET base_salary = 14000,
    allowance_position = 0,
    allowance_transport = 0,
    allowance_phone = 0
WHERE employee_id = '3f9e762a-9573-5803-a799-f409aa7d781b'
  AND effective_to IS NULL;

INSERT INTO salary_structures (id, employee_id, base_salary, allowance_position, allowance_transport, allowance_food, allowance_phone, allowance_housing, ot_rate_normal, ot_rate_holiday, effective_from)
SELECT
    'd653a089-b547-449c-837f-0591272f78cc',
    '3f9e762a-9573-5803-a799-f409aa7d781b',
    14000,
    0,
    0,
    0,
    0,
    0,
    1.5,
    3.0,
    '2026-02-01'
WHERE NOT EXISTS (
    SELECT 1 FROM salary_structures WHERE employee_id = '3f9e762a-9573-5803-a799-f409aa7d781b' AND effective_to IS NULL
);

-- ============================================
-- STEP 3: Upsert payroll_records for Feb 2026
-- ============================================

--  (64000075)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd7728b82-151a-45b6-b47d-d93aa18e6b7f',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'e189e7d0-c010-55e8-ba56-99dfb8dbb106',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    80000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    80000, 0, 0, 0, 0,
    15000, 0.05, 875,
    6075, 6950, 73050,
    'completed', NOW()
);


--  (67000124)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9b93a867-ab65-4ce7-acd9-470fd04d04ae',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '1fc1c300-7a04-55f6-af90-7a85bdb89621',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    52000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    52000, 0, 0, 0, 0,
    15000, 0.05, 0,
    1992, 1992, 50008,
    'completed', NOW()
);


--  (68000140)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7b548edd-299b-42a4-b54e-560c8df0de5d',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'bd592ab4-f6a5-56da-8c9f-e16855727c08',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    160000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    160000, 0, 0, 0, 0,
    15000, 0.05, 875,
    25000, 25875, 134125,
    'completed', NOW()
);


--  (Chinese-002)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '918f59c0-adcd-4e98-bddf-a821054fda18',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '5bc1ff1c-0228-580e-b9ac-69f60d749f70',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    45000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    45000, 0, 0, 0, 0,
    15000, 0.05, 875,
    1205, 2080, 42920,
    'completed', NOW()
);


--  (64000108)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ca435abb-44cc-492a-8c50-63543ecc7498',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '505100f5-e973-5189-9fdd-ade03c5a9d65',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    23450, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 480,
    23825, 0, 105, 0, 0,
    15000, 0.05, 875,
    0, 980, 22950,
    'completed', NOW()
);


--  (66000015)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'af4f70b9-622d-4317-a3ab-7eebe1615da7',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '547d54e5-3b9c-5074-b8ff-7a70c029da58',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    28345, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 710,
    29002, 0, 53, 0, 0,
    15000, 0.05, 875,
    21, 949, 28106,
    'completed', NOW()
);


--  (66000134)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd7ce8a2d-7a92-4990-85b3-4a8734f716b0',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'e33a24bf-f250-54bc-8b3e-0eaf4fe62547',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    38000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1200,
    39200, 0, 0, 0, 900,
    15000, 0.05, 875,
    301, 2076, 37124,
    'completed', NOW()
);


--  (66000155)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '040f4893-50f4-406c-a823-7f1a0a656763',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '87f33a2c-4186-5d58-824d-71754a1981fc',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    24170, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 700,
    24652, 0, 218, 0, 0,
    15000, 0.05, 875,
    0, 1093, 23777,
    'completed', NOW()
);


--  (66000034)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8de78e92-9b56-4835-b553-dde294027566',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '182b4acf-db08-5d7e-8f6f-c8ea178d2252',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    18290, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2514,
    20789, 0, 15, 1860, 0,
    15000, 0.05, 875,
    0, 2750, 18054,
    'completed', NOW()
);


--  (66000158)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'bbdc9969-35af-46cd-b225-476fe11caed4',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'a2981567-26e5-5f8c-a3ce-9853f660b533',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    60000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 9000,
    69000, 0, 0, 346, 500,
    15000, 0.05, 875,
    3361, 5082, 63918,
    'completed', NOW()
);


--  (67000099)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '30f477ec-ad05-4e51-a139-97ed7b279201',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '79209d32-cf9e-5ee5-bffa-920d45dfd7db',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    17130, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2200,
    19330, 0, 0, 0, 0,
    15000, 0.05, 816,
    0, 816, 18514,
    'completed', NOW()
);


--  (67000186)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '316a2b1f-1702-4667-a4f3-63970ba11ad2',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'b41547ed-4e66-5789-ac51-1dfb787e3876',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    60000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 48022, 3000,
    111022, 0, 0, 0, 1000,
    15000, 0.05, 875,
    3361, 5236, 105786,
    'completed', NOW()
);


--  (68000008)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '6d24e6cd-c8ff-49b7-a7f2-b4c38fb71724',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'ea90425f-ca79-50fc-b7ac-9a29f649f225',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    80000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 72230, 3000,
    155230, 0, 0, 2280, 1000,
    15000, 0.05, 875,
    6675, 10830, 144400,
    'completed', NOW()
);


--  (68000068)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9c6ac777-e7e5-441a-b9aa-570162773e6a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'ead7fea4-52b0-5044-95d8-a70927211a86',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    19600, 0, 0, 0,
    0, 0, 0,
    368, 0, 0, 0, 908,
    20871, 0, 5, 0, 0,
    15000, 0.05, 875,
    0, 880, 19996,
    'completed', NOW()
);


--  (68000069)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f95c42ac-93e9-4b8d-bd41-7a77f48e01ca',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd5c61796-bc14-5185-8795-517eef98433f',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    17460, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2110,
    19570, 0, 0, 0, 0,
    15000, 0.05, 850,
    0, 850, 18720,
    'completed', NOW()
);


--  (68000095)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b2bb9619-302d-4521-a3af-45f6d72f3569',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'bac13023-3360-5441-8c32-a81ef94010ba',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    45930, 0, 0, 0,
    0, 0, 0,
    9412, 0, 0, 0, 6300,
    61642, 0, 0, 0, 0,
    15000, 0.05, 875,
    1322, 2197, 59445,
    'completed', NOW()
);


--  (68000097)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f9d55302-41be-46d7-ae89-bd5a0a6ecad8',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '8c7ae749-bd6a-5e65-9601-8b6ae73381ea',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    28400, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 28130,
    56530, 0, 0, 0, 400,
    15000, 0.05, 875,
    215, 1490, 55040,
    'completed', NOW()
);


--  (68000110)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '006ba106-7590-4698-85f3-2bf3600d68a0',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '02463fc8-e6c5-5405-ba03-75fb92666043',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    20130, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2035,
    21939, 0, 226, 1045, 0,
    15000, 0.05, 875,
    0, 2146, 20019,
    'completed', NOW()
);


--  (68000158)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c83c25e6-8141-4d4f-9fdc-9e76599dca5f',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    75000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 8000,
    83000, 0, 0, 0, 100,
    15000, 0.05, 875,
    5675, 6650, 76350,
    'completed', NOW()
);


--  (68000162)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '62edacc4-61b5-484f-b75b-318b9472c6dd',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'da89221c-cacf-58c8-b46c-1292f3a8956e',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    50000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 20000,
    70000, 0, 0, 0, 0,
    15000, 0.05, 875,
    1705, 2580, 67420,
    'completed', NOW()
);


--  (68000172)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f92766c1-74dc-4b0d-8ae2-848c8f3f6906',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'e9631ebd-681e-5305-b1d4-101405f39833',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    25000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 28000,
    53000, 0, 0, 0, 300,
    15000, 0.05, 875,
    0, 1175, 51825,
    'completed', NOW()
);


--  (68000176)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9ffa3eb2-e84c-4708-a9f5-4714a085ea55',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '1ecc722f-0dd1-5dca-9110-a02849e56a6c',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    35000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5000,
    40000, 0, 0, 768, 0,
    15000, 0.05, 875,
    415, 2058, 37942,
    'completed', NOW()
);


--  (68000188)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'aaec2e0a-d8c7-4eda-b9dc-486698307365',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '7318811e-5e85-56f7-abe0-707e832578bb',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    47000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 8000,
    55000, 0, 0, 1020, 300,
    15000, 0.05, 875,
    1679, 3874, 51126,
    'completed', NOW()
);


--  (68000198)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '6e064aa4-a4af-498b-99fc-46ce4b48e5f2',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '00aac6c6-27fd-51ca-93f1-9f40deb0787c',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    100000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 43000,
    143000, 0, 0, 0, 750,
    15000, 0.05, 875,
    10723, 12348, 130652,
    'completed', NOW()
);


--  (68000212)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9cf46d01-62bd-4304-8a5f-8247462f7f86',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    25000, 0, 0, 0,
    0, 0, 0,
    3906, 0, 0, 0, 19813,
    48719, 0, 0, 0, 0,
    15000, 0.05, 875,
    70, 945, 47774,
    'completed', NOW()
);


--  (68000213)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '54d3a494-277f-4c67-a6d5-2c211b14a5aa',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '2e0fa686-82fc-54f3-9381-ecca30db2c15',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    25000, 0, 0, 0,
    0, 0, 0,
    3281, 0, 0, 0, 19875,
    48156, 0, 0, 0, 100,
    15000, 0.05, 875,
    70, 1045, 47111,
    'completed', NOW()
);


--  (66000123)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c039048c-f93c-4684-ace3-980511959473',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '8429e766-c22a-5c55-b79d-9628732e3879',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    120000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3000,
    123000, 0, 0, 0, 400,
    15000, 0.05, 875,
    6509, 7784, 115216,
    'completed', NOW()
);


--  (66000127)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '39a398ec-eb5c-4269-9d4b-734dda4be197',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '2bcc724a-136a-5e75-ae22-e2a3471e8a41',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    74200, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3000,
    77200, 0, 0, 0, 750,
    15000, 0.05, 875,
    3991, 5616, 71584,
    'completed', NOW()
);


--  (66000131)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c2e179d2-3c30-4bfe-a421-0c5b24dc02df',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd9ca3057-049c-5046-8390-95ec35d707b0',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    20000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2688,
    22598, 0, 90, 0, 0,
    15000, 0.05, 875,
    0, 965, 21723,
    'completed', NOW()
);


--  (68000159)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1e1bc9af-4331-4b00-bcff-e66e2db78cd4',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'c7bbe76c-0220-5ea4-b416-4acd6fca94a4',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    17000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2400,
    19400, 0, 0, 0, 0,
    15000, 0.05, 850,
    0, 850, 18550,
    'completed', NOW()
);


--  (66000037)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '70dbcf88-03f0-4f50-9ba7-a4a5f3993236',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '325a4de8-6270-53f1-8d62-ca99f1dfdd8d',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    67000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 9224,
    76224, 0, 0, 0, 950,
    15000, 0.05, 875,
    3790, 5615, 70609,
    'completed', NOW()
);


--  (67000056)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9516e03c-a8c3-42c4-ae7b-4ac0572d5998',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    26840, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5340,
    32151, 0, 29, 0, 0,
    15000, 0.05, 875,
    0, 904, 31276,
    'completed', NOW()
);


--  (68000199)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '44c2ba1e-61df-4594-afdb-6c47864a2da3',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '4800ca0d-4d6b-5756-8751-ed4f6d53d984',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    24000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2000,
    25189, 800, 11, 0, 0,
    15000, 0.05, 875,
    0, 1686, 24314,
    'completed', NOW()
);


--  (65000045)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '26ba356a-ea84-4ca3-82a9-47e7e47e3dc1',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd5379adf-9d35-535a-9099-98eda97ab38f',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    54000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 38727, 3000,
    95727, 0, 0, 0, 1000,
    15000, 0.05, 875,
    2412, 4287, 91440,
    'completed', NOW()
);


--  (66000153)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a68ff720-fd53-4393-a38d-282450405b25',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '58fdab55-3165-5db1-a465-d26991330ec5',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    21530, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 8853, 3000,
    33383, 0, 0, 0, 500,
    15000, 0.05, 875,
    0, 1375, 32008,
    'completed', NOW()
);


--  (67000087)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '71643352-743e-4433-b2e9-962b38e69e5b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '2b405200-f740-57ad-a488-756ce95fb5d5',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    28360, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 10232, 3000,
    41592, 0, 0, 0, 400,
    15000, 0.05, 875,
    217, 1492, 40100,
    'completed', NOW()
);


--  (68000047)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7f4fdba6-ac37-42f0-a310-71450af39062',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '5d01aff0-34a5-5039-be00-90fd212a84c8',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    22660, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 10034, 3000,
    35694, 0, 0, 279, 450,
    15000, 0.05, 875,
    0, 1604, 34090,
    'completed', NOW()
);


--  (68000244)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1add00fd-c720-4733-b5e6-f3d40e63755b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    23000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3000,
    26000, 0, 0, 0, 550,
    15000, 0.05, 875,
    0, 1425, 24575,
    'completed', NOW()
);


--  (69000014)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ff0e12c2-513e-431a-a5d1-5c7df68388fd',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '5eded7cf-84e9-57fd-b8b0-c3923d7edd34',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    13333, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2000,
    15333, 0, 0, 0, 750,
    15000, 0.05, 667,
    0, 1417, 13916,
    'completed', NOW()
);


--  (63000009)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '06d78744-9c32-46e3-8ed9-05eb089a4658',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'e098f35b-7b09-5c1d-9542-1b158aed1702',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    23535, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 612,
    23762, 0, 385, 0, 0,
    15000, 0.05, 875,
    0, 1260, 22887,
    'completed', NOW()
);


--  (64000109)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b45e75b5-6037-4d2d-aca5-e6adfc191e1a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd219c41b-264d-5125-a1a1-84e81e7cb20f',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    46675, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 4404,
    50564, 0, 515, 773, 0,
    15000, 0.05, 875,
    171, 2334, 48745,
    'completed', NOW()
);


--  (66000059)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f980e029-c09d-4715-b3d1-6a1b45cdf869',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '87b3c2cf-1067-5a7e-b717-7b5ea4000c53',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    25740, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 768,
    26508, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 25633,
    'completed', NOW()
);


--  (66000085)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f854ee2d-af06-4d9e-a965-739d3d677847',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '5dc95722-7b21-5c28-b14d-406a6de0bb26',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    120600, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    120600, 0, 0, 0, 0,
    15000, 0.05, 875,
    15000, 15875, 104725,
    'completed', NOW()
);


--  (67000043)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '62302e6d-9337-4733-bdc5-2d31fdea7b77',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '798d04af-f201-544d-b3d6-d77ae68ec6b2',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    34625, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 4180,
    38784, 0, 21, 0, 0,
    15000, 0.05, 875,
    329, 1225, 37580,
    'completed', NOW()
);


--  (67000044)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e511e3cb-56bb-4cf3-a21c-e1ea3b119d2b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'b68624a5-e13f-52d4-99cc-2d577b9835e2',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    53120, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 7752,
    60854, 0, 18, 0, 900,
    15000, 0.05, 875,
    1000, 2793, 58079,
    'completed', NOW()
);


--  (67000058)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '4ada08b4-d9d0-4ba2-b982-adbca841f94b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    58600, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 9600,
    67741, 0, 459, 0, 0,
    15000, 0.05, 875,
    100, 1434, 66766,
    'completed', NOW()
);


--  (67000111)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b376496b-9cc1-435b-8cbf-1a60c193d5ae',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '3ff757f7-d102-5b85-9c7b-716f3d5d256f',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    19100, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2355,
    21333, 0, 122, 0, 0,
    15000, 0.05, 875,
    0, 997, 20458,
    'completed', NOW()
);


--  (67000144)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a72d9cca-f025-46b2-a9a1-962de300b690',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'f9fab60d-d405-5691-9251-2651a4459ff9',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    21920, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2290,
    24101, 0, 109, 1063, 0,
    15000, 0.05, 875,
    0, 2047, 22163,
    'completed', NOW()
);


--  (67000235)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'df53ed5a-8403-42e3-ba82-f79006c6ad4b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    49700, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5510,
    53713, 0, 1497, 1071, 0,
    15000, 0.05, 875,
    750, 4193, 51017,
    'completed', NOW()
);


--  (68000183)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd2fefdaa-8a15-46cb-95f8-89f7b549e297',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '37165ccc-a53f-50bf-af12-f069ce27e138',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    39000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2000,
    40992, 0, 8, 0, 0,
    15000, 0.05, 875,
    615, 1498, 39502,
    'completed', NOW()
);


--  (68000190)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8562264d-f91f-48e0-a32a-8edc1c721bfa',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '54eeadd4-2edb-5c16-935c-584e2da41515',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    45000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3251,
    47314, 0, 937, 0, 0,
    15000, 0.05, 875,
    1141, 2953, 45298,
    'completed', NOW()
);


--  (65000035)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1e969711-18ad-4ac0-968c-26e274240b98',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '065f663e-401f-5593-983a-149cbbad6924',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    68500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3187,
    71687, 0, 0, 0, 0,
    15000, 0.05, 875,
    3390, 4265, 67422,
    'completed', NOW()
);


--  (66000012)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'edfb89ad-1fb2-401f-9ec9-4b1028871b7e',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '7dd94e90-8d7b-5c5a-a951-05417269bbe6',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    17200, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2604,
    19804, 0, 0, 0, 0,
    15000, 0.05, 827,
    0, 827, 18977,
    'completed', NOW()
);


--  (66000067)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '96d113e9-66e5-4744-90c7-a841c70921ea',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '37da4d12-64a1-5007-846d-36f1c49d3b23',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    26620, 0, 0, 0,
    0, 0, 0,
    2651, 0, 0, 0, 5280,
    34524, 0, 27, 0, 0,
    15000, 0.05, 875,
    500, 1402, 33149,
    'completed', NOW()
);


--  (66000147)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c296c2f3-b20a-4b00-98ba-e656c70d1bb2',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    16550, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    16550, 0, 0, 0, 0,
    15000, 0.05, 790,
    0, 790, 15760,
    'completed', NOW()
);


--  (68000086)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ba1d49b8-ff71-44f0-87db-5d1ea5773eff',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    32850, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    32752, 0, 98, 996, 0,
    15000, 0.05, 875,
    0, 1969, 30881,
    'completed', NOW()
);


--  (68000088)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c390c6b4-6e88-4268-8c22-be323bd6c01c',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '9a1cdbf7-a679-5a4c-8414-ec629c8dba28',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    15125, 0, 0, 0,
    0, 0, 0,
    284, 0, 0, 0, 3035,
    18331, 0, 113, 0, 0,
    15000, 0.05, 750,
    0, 863, 17581,
    'completed', NOW()
);


--  (68000182)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '527ac824-353b-4eac-bd02-ebec2103682b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd2424c33-a067-5999-8787-90624c6de80f',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    5544, 0, 0, 0, 2400,
    22944, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 22194,
    'completed', NOW()
);


--  (68000202)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5a993f7c-afdc-4a99-8b9c-4a7cdac73a63',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '1de4da72-36df-5bce-a298-ec902801dc5a',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    24000, 0, 0, 0,
    0, 0, 0,
    600, 0, 0, 0, 2400,
    27000, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 26125,
    'completed', NOW()
);


--  (7)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cb6e3ca6-d7bf-49ea-8aa4-aec432a11061',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    25000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    25000, 0, 0, 0, 0,
    15000, 0.05, 0,
    750, 750, 24250,
    'completed', NOW()
);


--  (68100023)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'fdcbcb1a-dfea-4fd9-bbbb-a06644828266',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'a0d5f05b-e948-567c-9fab-f55a4aee49af',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    5000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    5000, 0, 0, 0, 0,
    5000, 0.05, 0,
    0, 0, 5000,
    'completed', NOW()
);


--  (68100024)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'aca0daab-bcb2-41e6-8546-59a1ff8aa823',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'ee627c60-8120-5a24-97a4-f50c12571d41',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    5000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    5000, 0, 0, 0, 0,
    5000, 0.05, 0,
    0, 0, 5000,
    'completed', NOW()
);


--  (68100029)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8b4c4a48-a060-4b9a-9681-16356e25b515',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '85b72e61-26c7-5a99-bb0c-15cad1e983db',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    5000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    5000, 0, 0, 0, 0,
    5000, 0.05, 0,
    0, 0, 5000,
    'completed', NOW()
);


--  (LN027)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0afb3185-4d4d-4adf-9cea-b610ba52872c',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '6ccf9608-9200-5b8c-8227-28427fbb54fd',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    5000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    5000, 0, 0, 0, 0,
    5000, 0.05, 0,
    0, 0, 5000,
    'completed', NOW()
);


--  (63000021)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cd940531-c19f-487e-b380-fc13101d1354',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '5724ca0e-00ed-5bf6-b350-19bb67a3ca83',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    46320, 0, 0, 0,
    0, 0, 0,
    5771, 0, 0, 0, 4270,
    56361, 0, 0, 0, 0,
    15000, 0.05, 875,
    1147, 2022, 54339,
    'completed', NOW()
);


--  (68000151)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '543d0334-0834-420c-9ee3-6ffdd1cbaa4d',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '45243a33-d4c9-5e54-85f4-fbb91180eca2',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    56000, 0, 0, 0,
    0, 0, 0,
    13405, 0, 0, 0, 2400,
    71805, 0, 0, 1380, 0,
    15000, 0.05, 875,
    1000, 3255, 68550,
    'completed', NOW()
);


--  (68000197)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '86eca816-6c02-4e9e-a3ad-120c0cbf5b67',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '189ba125-bf10-5648-aaa9-442e8791c4ed',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    40000, 0, 0, 0,
    0, 0, 0,
    5217, 0, 0, 0, 0,
    45214, 0, 3, 0, 0,
    15000, 0.05, 875,
    705, 1583, 43634,
    'completed', NOW()
);


--  (67000146)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f36d90ba-9cb8-4893-8373-11fb00381363',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    21080, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2240,
    23316, 0, 4, 0, 50,
    15000, 0.05, 875,
    0, 929, 22391,
    'completed', NOW()
);


--  (67000200)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '207d4b8e-e240-4f20-97de-ab366142c7c9',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '03054231-d09f-593c-9614-e3539576a74e',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    18880, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2220,
    21099, 0, 1, 0, 0,
    15000, 0.05, 875,
    0, 876, 20224,
    'completed', NOW()
);


--  (67000211)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3bda8e33-ebac-4802-9e16-056777fb93f6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '57772cb0-784f-5525-b7df-bddded652e7e',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    43980, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3495,
    47344, 0, 131, 0, 0,
    15000, 0.05, 875,
    904, 1910, 45565,
    'completed', NOW()
);


--  (68000161)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ae7e042b-da14-4e45-aa6c-0a129706260e',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    26000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    26000, 0, 0, 950, 0,
    15000, 0.05, 875,
    0, 1825, 24175,
    'completed', NOW()
);


--  (68000178)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '6b227a6f-e8fe-4641-bb12-0a74d0953f26',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd62503b0-fcc2-53c0-9890-1c98aae5c3a7',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    30050, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1260,
    31297, 0, 13, 0, 0,
    15000, 0.05, 875,
    115, 1003, 30307,
    'completed', NOW()
);


--  (68000179)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ac0598f0-3103-43e8-a42b-ac5c6e2c5d7b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'fff2b4aa-c914-52dc-b869-af609eb7a949',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    30050, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1260,
    31152, 0, 158, 0, 0,
    15000, 0.05, 875,
    115, 1148, 30162,
    'completed', NOW()
);


--  (68000180)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '853e4d76-4824-4da2-a375-378b358ea4ab',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '2a137c36-1cf5-5c33-8386-cc1db2ec244a',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    29750, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1190,
    30910, 0, 30, 0, 0,
    15000, 0.05, 875,
    115, 1020, 29920,
    'completed', NOW()
);


--  (62000002)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f0b3304d-b733-4202-bb46-0af7e59e99ee',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '4cd519ef-216a-5a5b-8a80-3fcd0e85d777',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    38000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 4000,
    42000, 0, 0, 0, 100,
    15000, 0.05, 875,
    650, 1625, 40375,
    'completed', NOW()
);


--  (68000089)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'fc7193c0-131c-482a-a861-639254489eec',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '63a37220-6950-5b93-8af6-60ec35886d6a',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    44240, 0, 0, 0,
    0, 0, 0,
    15392, 0, 0, 0, 0,
    59632, 0, 0, 270, 0,
    15000, 0.05, 875,
    0, 1145, 58487,
    'completed', NOW()
);


--  (68000251)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0be9ea66-8202-4496-a8a7-27ce308a9ede',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '31f98fd2-9493-5f30-9a8b-683d5647c722',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    40000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 19334,
    59334, 0, 0, 0, 750,
    15000, 0.05, 875,
    0, 1625, 57709,
    'completed', NOW()
);


--  (68000250)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '401c4fc2-c6e9-42de-bdb9-a1435b99a007',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '780e64f2-2e21-55cc-ab4d-17132e63c8e6',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    17000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3000,
    20000, 0, 0, 0, 0,
    15000, 0.05, 850,
    0, 850, 19150,
    'completed', NOW()
);


--  (68000254)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c21c4785-634d-40e2-9a2a-63ad594416bf',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    73333, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    73333, 0, 0, 0, 500,
    15000, 0.05, 875,
    1000, 2375, 70958,
    'completed', NOW()
);


--  (68000256)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '54870c1b-17e4-4fcd-87e6-373ddaa06543',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'd8a906e6-41d6-592d-bb22-dd02219a8d57',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    33333, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3167,
    36500, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 35625,
    'completed', NOW()
);


--  (69000001)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd2cafeef-8913-4d03-a7e0-d8652e3be4e1',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '47edf2aa-8c3b-5d53-87e6-647e4d8ac594',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    20267, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1900,
    22167, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 21292,
    'completed', NOW()
);


--  (69000015)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f74b53de-9158-4a2f-9627-6cebf9d36fd5',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '7a30a6ae-81be-5d24-aa71-3b2dfab8f149',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    15167, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3300,
    18467, 0, 0, 0, 0,
    15000, 0.05, 758,
    0, 758, 17709,
    'completed', NOW()
);


--  (69000012)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '93bb8650-9c96-461a-8a1e-c5d0fe8c7f26',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    '0baae162-2014-529f-880f-2624bc8a7fa5',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    10000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1200,
    11200, 0, 0, 0, 0,
    11200, 0.05, 500,
    0, 500, 10700,
    'completed', NOW()
);


--  (68000252)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9e814dde-8acf-49b7-b3c6-e8a9fe31e386',
    (SELECT id FROM payroll_periods WHERE company_id = 'a684555a-e44d-4441-9af8-521115cd000a' AND year = 2026 AND month = 2 LIMIT 1),
    'bdc5955f-e72d-51ac-9419-71a04cb0e914',
    'a684555a-e44d-4441-9af8-521115cd000a',
    2026, 2,
    33500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3500,
    35883, 1117, 0, 0, 0,
    15000, 0.05, 875,
    0, 1992, 35008,
    'completed', NOW()
);


--  (64000007)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '83e8e53b-3b5b-431f-935d-dbe4631c2130',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'd30e684c-33b9-563f-842a-c91c917f42b9',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    25770, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1240,
    27010, 0, 0, 0, 950,
    15000, 0.05, 875,
    0, 1825, 25185,
    'completed', NOW()
);


--  (66000060)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3f8eb7b0-8055-46ea-8b05-89ce711e5811',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '802e77f9-2e16-54cb-8074-cff31dc1ad4d',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    36950, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1235,
    38088, 0, 97, 0, 0,
    15000, 0.05, 875,
    513, 1485, 36700,
    'completed', NOW()
);


--  (66000062)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '61c7b342-3bc4-45ea-9f7d-621f276b7512',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'f6e156c7-10aa-50b9-8b47-38954627ba02',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    53650, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1110,
    54760, 0, 0, 0, 950,
    15000, 0.05, 875,
    2070, 3895, 50865,
    'completed', NOW()
);


--  (67000006)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ce0abc81-0e1f-4e0d-bbae-4c88cbfa83c7',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '793a1798-aebf-5b6e-b824-9c0096102698',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    32000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1320,
    33320, 0, 0, 0, 0,
    15000, 0.05, 875,
    265, 1140, 32180,
    'completed', NOW()
);


--  (67000007)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ec7159be-5db0-4678-84e3-56302c962522',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'a658837b-4b2e-5ea4-873f-75abbf1882e4',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    33470, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1085,
    34541, 0, 14, 631, 0,
    15000, 0.05, 875,
    339, 1859, 32696,
    'completed', NOW()
);


--  (67000017)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '391f1b2d-010b-4a3f-99e3-64781ec992a2',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '07011d28-ec15-5afe-8bc7-0a24f4127b26',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    77000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 11400,
    88400, 0, 0, 0, 500,
    15000, 0.05, 875,
    5475, 6850, 81550,
    'completed', NOW()
);


--  (67000106)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3939b082-036c-4ae1-bb6f-58ee8d7ec73e',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '13cd8ec0-e612-5049-91af-0e9f93e8e380',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21615, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 4212,
    25757, 0, 70, 0, 0,
    15000, 0.05, 875,
    0, 945, 24882,
    'completed', NOW()
);


--  (67000145)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '208a7b60-20c1-4d1c-80b9-18174e567227',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    28500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3012,
    31472, 0, 40, 0, 0,
    15000, 0.05, 875,
    90, 1005, 30507,
    'completed', NOW()
);


--  (67000166)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '6f63d1ca-e5f0-4813-8967-9462fb513e83',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    24406, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2458,
    26864, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 25989,
    'completed', NOW()
);


--  (67000170)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a5475e2f-5bd2-423a-9642-5ea391e1941e',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '5a8848e9-1cb3-5147-b7b2-db12ec254d20',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    26625, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2400,
    29013, 0, 12, 0, 0,
    15000, 0.05, 875,
    0, 887, 28138,
    'completed', NOW()
);


--  (67000172)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'eceb66dd-9129-4b51-b970-13d15abc9199',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '64137af9-0eea-547a-bae4-73ddc8138906',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20970, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2240,
    23210, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 22335,
    'completed', NOW()
);


--  (67000194)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'aeeba515-0b9b-474d-970b-0309f98d6256',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '1369abad-794f-5ff7-9f9b-be437b1808ba',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    33260, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3315,
    36508, 0, 67, 0, 0,
    15000, 0.05, 875,
    328, 1270, 35305,
    'completed', NOW()
);


--  (67000212)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c507877b-faef-47fe-a196-708961154f4c',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '3b01d99f-0cc2-53ec-96ca-e0f09339f37f',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    24970, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3245,
    28215, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 27340,
    'completed', NOW()
);


--  (67000221)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5633d05b-eb34-404e-bf4a-a3941cd224dd',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '7290e5f6-41c8-5c86-90d1-2fab07f56bac',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    22380, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2814,
    25178, 0, 16, 0, 0,
    15000, 0.05, 875,
    0, 891, 24303,
    'completed', NOW()
);


--  (67000222)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5b0a4e79-0c5e-4855-9e5e-0a2330b107c3',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '77795aab-26bf-50e9-b8f3-064ac641b836',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    24500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2375,
    26844, 0, 31, 630, 0,
    15000, 0.05, 875,
    0, 1536, 25339,
    'completed', NOW()
);


--  (67000234)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd2bcf774-773f-4a75-8d2b-5544c747d178',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'ebd63099-b4ee-5f5b-ae09-33845b383555',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    26835, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2952,
    29783, 0, 4, 0, 0,
    15000, 0.05, 875,
    7, 886, 28901,
    'completed', NOW()
);


--  (67000239)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a435fba0-77f4-4774-bdb4-5795cf6481a9',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '625309a9-adc8-5402-a4f6-ea34aaae2b1b',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    18720, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2180,
    20422, 0, 478, 0, 600,
    15000, 0.05, 875,
    0, 1953, 18947,
    'completed', NOW()
);


--  (68000016)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '56c3ea35-4c81-4734-997b-3a209662ed0a',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '84f74b39-53f4-537e-b586-22d343f2ce03',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20890, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2220,
    22903, 0, 207, 0, 0,
    15000, 0.05, 875,
    0, 1082, 22028,
    'completed', NOW()
);


--  (68000023)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c7f30f49-56e5-4c42-a65c-956f8b3c015b',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '48d6ef71-defa-58b7-b39b-7368acce71cc',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    29210, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2300,
    31310, 0, 200, 0, 1250,
    15000, 0.05, 875,
    126, 2451, 29059,
    'completed', NOW()
);


--  (68000091)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cf7db584-3ae2-4f1e-b545-b847581a440e',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '83657e81-303f-5055-ad23-ec79bc4073fd',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    30725, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3185,
    33910, 0, 0, 0, 850,
    15000, 0.05, 875,
    201, 1926, 31984,
    'completed', NOW()
);


--  (68000107)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '00a26e87-0c2c-433d-8f8e-230cdadaec36',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '707b476a-8c5a-5430-89fe-021cbda2fc38',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    29705, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3175,
    32880, 0, 0, 0, 650,
    15000, 0.05, 875,
    150, 1675, 31205,
    'completed', NOW()
);


--  (68000236)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '64c58ddd-7397-455c-8542-a1b09d777957',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '1826a0d5-5354-541e-abf9-df791e02c5dd',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    25000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2000,
    27000, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 26125,
    'completed', NOW()
);


--  (68000259)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a0a1e3e3-52e1-48b1-80d6-f438ad9cc048',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '6006e3e6-fd6d-53c9-a31b-985b21607ba6',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    32000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3000,
    34582, 400, 18, 0, 0,
    15000, 0.05, 875,
    265, 1558, 33442,
    'completed', NOW()
);


--  (66000086)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'fb3fc7f5-b090-4e1c-a664-1e3f2f0c72c2',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'f6382597-6a8c-579d-8d94-0a1193902f0f',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    33840, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 810,
    34435, 0, 215, 0, 0,
    15000, 0.05, 875,
    261, 1351, 33299,
    'completed', NOW()
);


--  (67000136)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e9849643-6421-4e18-83ee-5150182692a2',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'ee734673-cef9-596f-b7fe-5de609bc4f7c',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    23600, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3500,
    26975, 0, 125, 0, 0,
    15000, 0.05, 875,
    0, 1000, 26100,
    'completed', NOW()
);


--  (67000137)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '53c01e94-ea5a-4e53-87a2-fd9327e1a144',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '2235859b-73c7-5c77-bdd4-0c159adb7624',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    22000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2300,
    24300, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 23425,
    'completed', NOW()
);


--  (67000230)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd2d5a363-9304-4383-9f58-c52dbaac7d14',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'b54351d3-da2f-5d26-8f92-92889a1ca8ab',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    22900, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3225,
    26104, 0, 21, 0, 0,
    15000, 0.05, 875,
    0, 896, 25229,
    'completed', NOW()
);


--  (68000215)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '28795da9-2aa7-4186-9283-4d5663faa4fa',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '09359ced-93b1-5e0b-9ee9-fabb567d48b0',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2000,
    23000, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 22125,
    'completed', NOW()
);


--  (67000018)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e41a8bbe-ef5b-4401-b049-2f29404c8eaa',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'c88c6626-a374-539d-930b-306136977997',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20810, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 270,
    21080, 0, 0, 183, 0,
    15000, 0.05, 875,
    0, 1058, 20022,
    'completed', NOW()
);


--  (67000039)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5c52e06d-b548-4896-a0ce-c777cbf809b1',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21460, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5470,
    26897, 0, 33, 0, 0,
    15000, 0.05, 875,
    0, 908, 26022,
    'completed', NOW()
);


--  (67000040)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f5b33e70-a6e6-4105-b524-cc4e4825264c',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21320, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5410,
    26698, 0, 32, 0, 0,
    15000, 0.05, 875,
    0, 907, 25823,
    'completed', NOW()
);


--  (67000041)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'abbe1381-86bb-40ce-9d24-570afe751377',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    18710, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2235,
    20945, 0, 0, 963, 0,
    15000, 0.05, 875,
    0, 1838, 19107,
    'completed', NOW()
);


--  (67000078)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '6d8b7292-a49e-46b9-936d-1ac387f34b4c',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '1b793501-8afc-5531-88c1-205bf90a30e8',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    17000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1852,
    18852, 0, 0, 730, 0,
    15000, 0.05, 850,
    0, 1580, 17272,
    'completed', NOW()
);


--  (67000113)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'bdf77e4f-e481-42dc-b3f3-956eda52ae99',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'a1532a3c-f9d0-53dc-9399-2b253ba98fa1',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    19050, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1776,
    20728, 0, 98, 0, 0,
    15000, 0.05, 875,
    0, 973, 19853,
    'completed', NOW()
);


--  (67000114)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '627f990b-5d94-49e2-bfc9-44225f5061e9',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '42712cac-bd84-5f56-a186-61f3a30739fc',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    17520, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1760,
    19261, 0, 19, 0, 0,
    15000, 0.05, 875,
    0, 894, 18386,
    'completed', NOW()
);


--  (67000139)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'af5f047e-803a-4bed-896d-b5a263a8711c',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '664708b3-13aa-5759-b160-9f79d6aa25c3',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 208,
    21208, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 20333,
    'completed', NOW()
);


--  (67000192)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '023f3de8-fbc7-4a19-aa65-498b0c8d7b91',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '485a1650-6a25-56e8-afcc-d4b4d55a46fb',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20800, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2190,
    22990, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 22115,
    'completed', NOW()
);


--  (67000199)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '70890e47-2775-41e1-bf91-484f75058079',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'a005ef46-0d18-59af-831a-8ee184c1e553',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    24100, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1820,
    25920, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 25045,
    'completed', NOW()
);


--  (67000217)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '905500ac-95ce-4297-aa90-b35e133a03cc',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    25980, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2235,
    28199, 0, 16, 0, 0,
    15000, 0.05, 875,
    0, 891, 27324,
    'completed', NOW()
);


--  (67000228)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '76fd06ff-4854-4cd4-a831-d3b683bbd09e',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '664a11a2-c908-5141-b6cf-25338e5ebed5',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    15810, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 4400,
    20210, 0, 0, 0, 0,
    15000, 0.05, 791,
    0, 791, 19419,
    'completed', NOW()
);


--  (67000231)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'dceb8632-bd82-420c-b74c-d2af21a9a1b1',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'df6340d1-f9e4-5cea-96a5-27648403aab4',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    16650, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1728,
    18378, 0, 0, 0, 0,
    15000, 0.05, 833,
    0, 833, 17545,
    'completed', NOW()
);


--  (68000098)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '19310806-2024-49ed-b55f-99ef1cb84673',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'b2c6b689-9bdb-5a09-978c-92a6eb85e111',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    18425, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 1680,
    20105, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 19230,
    'completed', NOW()
);


--  (68000255)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e94dea52-bbe8-476f-b394-a5dd75c06126',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'afe52e0b-fbee-58f4-b3e9-8256047867e0',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    45000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 4500,
    49500, 0, 0, 0, 50,
    15000, 0.05, 875,
    1205, 2130, 47370,
    'completed', NOW()
);


--  (65000026)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ca3ef206-2457-4155-821a-0965963f0ee5',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '68718dc3-bd6a-5360-a508-bf786665cf8b',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    29600, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 8244, 600,
    38253, 0, 191, 704, 0,
    15000, 0.05, 875,
    145, 1915, 36529,
    'completed', NOW()
);


--  (67000121)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2a9e9aa0-fa33-4f20-91c3-a5adf112711d',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'ac2495ca-9f04-573b-b948-762cb2d9181e',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    18350, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 7663, 150,
    26158, 0, 5, 0, 0,
    15000, 0.05, 875,
    0, 880, 25283,
    'completed', NOW()
);


--  (67000216)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'bf086fe0-640d-4daa-b554-8bcd49d9d1e0',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 8165, 0,
    28102, 0, 63, 995, 0,
    15000, 0.05, 875,
    0, 1933, 26232,
    'completed', NOW()
);


--  (66000081)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2785e534-fcf1-4315-b198-e737070a8fe1',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    23570, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 5250, 1840,
    30632, 0, 28, 630, 0,
    15000, 0.05, 875,
    0, 1533, 29127,
    'completed', NOW()
);


--  (67000030)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'afeaf23f-3e6c-4872-b9eb-ebcfb3452ccd',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'd598a557-45d1-573f-91b1-596205ba1d6d',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    19000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 5250, 220,
    24444, 0, 26, 0, 0,
    15000, 0.05, 875,
    0, 901, 23569,
    'completed', NOW()
);


--  (67000155)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b6d3f80f-8a4a-466a-8e53-116a4d6e9908',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '51cd8c49-fbde-5867-972d-3d0652dd2fd2',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    18640, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 5250, 246,
    24122, 0, 14, 0, 0,
    15000, 0.05, 875,
    0, 889, 23247,
    'completed', NOW()
);


--  (68000031)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ac882d9b-3c18-4cec-bdc4-594163110340',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20670, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 5250, 0,
    25920, 0, 0, 65, 0,
    15000, 0.05, 875,
    0, 940, 24980,
    'completed', NOW()
);


--  (66000043)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8fad68e9-4554-4be3-bcb4-56e4c928fa4e',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'c082977a-0bc1-5dde-b47f-0ed372760372',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21100, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 1633, 195,
    22855, 0, 73, 0, 0,
    15000, 0.05, 875,
    0, 948, 21980,
    'completed', NOW()
);


--  (66000057)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c19a5405-6d6d-4f5a-a137-626b9556ddb9',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'dec74611-986e-5d89-b59e-1b7934707223',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    25315, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 1633, 580,
    27419.00, 0, 109.00, 515, 0,
    15000, 0.05, 875,
    0, 1499.00, 26029.00,
    'completed', NOW()
);


--  (66000065)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0c241920-fb79-45f0-9001-51a90820f962',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '5c65c996-3864-5ef9-8a32-43096cabc679',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    17820, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 168,
    17973, 0, 15, 0, 0,
    15000, 0.05, 875,
    0, 890, 17098,
    'completed', NOW()
);


--  (66000090)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e7be57ab-12ca-4224-babc-302391158f40',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'da050d9a-49bb-5707-90e3-df3936e06ee2',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21470, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 1633, 370,
    23357, 0, 116, 0, 0,
    15000, 0.05, 875,
    0, 991, 22482,
    'completed', NOW()
);


--  (67000025)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b215ed51-1b36-45de-9ac5-7c60a03c50fa',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '081bda8b-41a9-5b6d-8438-d9956686312d',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20860, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 4773, 2090,
    27723, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 26848,
    'completed', NOW()
);


--  (67000206)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b79ef858-402e-4e80-a37d-174c65fb5960',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '05ff0a88-7333-5168-85d3-7e41b4132f9d',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    18720, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 3128, 180,
    22028, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 21153,
    'completed', NOW()
);


--  (68000238)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3278f37a-3bb0-4c49-b1db-f96e60c4e27b',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '457a6c56-7848-5815-a0ab-048a6f040c42',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    22000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 2000, 0,
    24000, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 23125,
    'completed', NOW()
);


--  (68000184)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8a85cfb0-a206-48f7-8544-16d3a4fed114',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '86ec31d6-74a7-515f-b8cb-ef8aea291ff2',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    16000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 4413, 0,
    20413, 0, 0, 0, 0,
    15000, 0.05, 800,
    0, 800, 19613,
    'completed', NOW()
);


--  (68000185)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1be2d081-66b7-4da9-8fef-6282477af6c5',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '85a24d25-201f-54d6-9d29-c4131a11c151',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    16000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 4413, 0,
    20413, 0, 0, 0, 0,
    15000, 0.05, 800,
    0, 800, 19613,
    'completed', NOW()
);


--  (66000110)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '20103090-79ba-46f9-8f4a-c636b0de6daa',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '1bb51058-8477-5429-b58f-cea1c9b42f89',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    23150, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 11796, 0,
    34851, 0, 95, 522, 0,
    15000, 0.05, 875,
    0, 1492, 33454,
    'completed', NOW()
);


--  (67000174)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '797a74d2-1d3d-4b95-8063-0ead3d1e360c',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '8a488bb8-0545-5437-92d3-6a291cb433f3',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13655, 0, 0, 0,
    0, 0, 0,
    4111, 0, 0, 0, 2600,
    20226, 0, 0, 0, 140,
    15000, 0.05, 683,
    0, 823, 19543,
    'completed', NOW()
);


--  (67000183)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c4251774-72ad-4e93-ae80-4a675a414690',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '153ddbde-3392-5515-ba7b-c70713398f98',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13490, 0, 0, 0,
    0, 0, 0,
    3752, 0, 0, 0, 3800,
    21042, 0, 0, 0, 0,
    15000, 0.05, 675,
    0, 675, 20367,
    'completed', NOW()
);


--  (67000202)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7af5a5f2-9481-4330-93c9-987395f1c6a1',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13440, 0, 0, 0,
    0, 0, 0,
    3836, 0, 0, 0, 1800,
    19076, 0, 0, 0, 0,
    15000, 0.05, 672,
    0, 672, 18404,
    'completed', NOW()
);


--  (67000203)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c2f13994-3b51-4925-90a5-a5db3112d098',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '186afdf0-dd25-5244-a5aa-901ef2c116f6',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13740, 0, 0, 0,
    0, 0, 0,
    2920, 0, 0, 0, 1300,
    17895, 0, 0, 0, 65,
    15000, 0.05, 687,
    0, 752, 17208,
    'completed', NOW()
);


--  (67000213)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '100b733f-2bb8-415b-b48a-778b5fded3f6',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'd9d3518f-d84f-5f04-a5e8-b1495a91462b',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13540, 0, 0, 0,
    0, 0, 0,
    3329, 0, 0, 0, 1800,
    18104, 0, 0, 0, 565,
    15000, 0.05, 677,
    0, 1242, 17427,
    'completed', NOW()
);


--  (67000238)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd6f1ce33-6124-41a9-bfdc-253ce62da85d',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '16e2ad45-d2bc-59ca-b661-973cc8ef9642',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13715, 0, 0, 0,
    0, 0, 0,
    3586, 0, 0, 0, 1700,
    19001, 0, 0, 0, 0,
    15000, 0.05, 686,
    0, 686, 18315,
    'completed', NOW()
);


--  (67000242)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '45b89ec1-6a29-46fd-9012-132cffacd4cf',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'a4e58a74-865e-511e-abad-777a9289935f',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13715, 0, 0, 0,
    0, 0, 0,
    4086, 0, 0, 0, 2550,
    20216, 0, 0, 0, 135,
    15000, 0.05, 686,
    0, 821, 19530,
    'completed', NOW()
);


--  (68000001)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cfc43e37-a3d7-4f47-add1-22ebaa5b35c3',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'a177bfbe-6129-5224-ba4e-33c497244c62',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13340, 0, 0, 0,
    0, 0, 0,
    2056, 0, 0, 0, 1450,
    16832, 0, 14, 0, 0,
    15000, 0.05, 667,
    0, 681, 16165,
    'completed', NOW()
);


--  (68000022)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '57be80c7-e75a-42b5-b260-627ec65f9b3b',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'b8e73cc0-3e5f-563a-8706-290ac4b62a16',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13290, 0, 0, 0,
    0, 0, 0,
    3877, 0, 0, 0, 1750,
    18819, 0, 0, 0, 98,
    15000, 0.05, 665,
    0, 763, 18154,
    'completed', NOW()
);


--  (68000026)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'b4855336-3ac8-4741-ad4e-bca9588de662',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '76cfa76e-3fad-5ac9-84d3-efa06995ec78',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    14710, 0, 0, 0,
    0, 0, 0,
    2728, 0, 0, 0, 3450,
    20888, 0, 0, 0, 0,
    15000, 0.05, 736,
    0, 736, 20152,
    'completed', NOW()
);


--  (68000027)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '020fd589-1a62-49bb-b999-e1965dbf74c6',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    13290, 0, 0, 0,
    0, 0, 0,
    3655, 0, 0, 0, 2300,
    19245, 0, 0, 143, 0,
    15000, 0.05, 665,
    0, 808, 18437,
    'completed', NOW()
);


--  (68000137)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3a72eeb8-732f-4c92-8941-3a7a7dcf709f',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '86febf74-ea70-54bd-a977-5fef41535de6',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    40000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 140000, 0,
    180000, 0, 0, 0, 0,
    15000, 0.05, 875,
    3000, 3875, 176125,
    'completed', NOW()
);


--  (67000138)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '216c169c-ed36-4d06-acb5-bf46a5a55792',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '92f4096b-2a1b-5143-a99a-cd7ec01d9362',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    20053, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5067,
    25120, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 24245,
    'completed', NOW()
);


--  (68000265)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a73948c9-4dd6-4eb1-a9f2-8e8fc823802e',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '796a0b4c-79c4-5520-a5e6-1ca795541916',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    23333, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3167,
    26500, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 25625,
    'completed', NOW()
);


--  (68000257)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1696eedc-5b36-4f84-8f5e-e76880929a25',
    (SELECT id FROM payroll_periods WHERE company_id = '3d383dcd-9544-4b38-8cff-a37b69b9db57' AND year = 2026 AND month = 2 LIMIT 1),
    '01e70aa5-7aa3-5dfd-94de-8449453da0c0',
    '3d383dcd-9544-4b38-8cff-a37b69b9db57',
    2026, 2,
    21000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    21000, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 20125,
    'completed', NOW()
);


--  (68000109)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8898ad41-a8e1-4443-a6fc-275f7c28b74a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'f48a1ebc-9a36-520b-989c-27f98a568367',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    20000, 0, 3000, 0,
    0, 0, 0,
    4412.50, 0, 0, 6032, 4000,
    37432.50, 0, 12, 0, 0,
    15000, 0.05, 875,
    0, 887, 36557.50,
    'completed', NOW()
);


--  (68000010)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '39dc012d-8e45-413d-a82a-e5c2bcd1c114',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '5042062a-fafb-5613-bd98-6c5df5e2446e',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 3000, 0,
    0, 0, 0,
    3187.50, 0, 0, 23267, 0,
    44451.50, 0, 3, 0, 0,
    15000, 0.05, 750,
    0, 753, 43701.50,
    'completed', NOW()
);


--  (68000150)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a5af0eb5-a655-4115-9922-6df4d6163f1d',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'e4f2e946-8f12-5c41-b917-806f22fdaa71',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    2500, 0, 0, 11722, 0,
    27222, 0, 0, 0, 0,
    15000, 0.05, 600,
    0, 600, 26622,
    'completed', NOW()
);


--  (68000130)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '23083061-db3c-44f5-95ce-bcd37fd8ab3a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 1000, 0,
    13994, 0, 6, 0, 0,
    13994, 0.05, 600,
    0, 606, 13394,
    'completed', NOW()
);


--  (68000071)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '4f37ad42-b7bd-4b21-aad7-8658dbfb9e3e',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'b71285ba-208d-5ad4-a2bf-5c5210ab1c37',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    450, 0, 0, 13860, 0,
    27299, 0, 11, 0, 0,
    15000, 0.05, 600,
    0, 611, 26699,
    'completed', NOW()
);


--  (68000156)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7a12804c-c170-4e0e-b735-a13790d4d046',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'bf2af5ec-b907-532c-b526-a7c25e64b444',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    5200, 0, 433, 0,
    0, 0, 0,
    0, 0, 0, 6258, 0,
    11879, 0, 12, 0, 0,
    11879, 0.05, 260,
    0, 272, 11619,
    'completed', NOW()
);


--  (67000057)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cf834257-f758-44e4-a6a5-34e6a4bfcee6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'eb1ead33-8b1a-5574-9c62-487464194b46',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    900, 0, 0, 23266, 0,
    37166, 0, 0, 0, 0,
    15000, 0.05, 600,
    0, 600, 36566,
    'completed', NOW()
);


--  (68000230)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3b25a059-1043-4873-8e29-0944308caa15',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '10902689-7bcc-5f16-949a-4cceb705ba47',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    9500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 1200, 0,
    10679, 0, 21, 0, 0,
    10679, 0.05, 475,
    0, 496, 10204,
    'completed', NOW()
);


--  (68000200)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '27801532-8251-40c7-98f3-e0262360733e',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'cb15f429-7960-5737-955c-e8665139179a',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    3187.50, 0, 0, 3500, 0,
    21594.50, 0, 93, 0, 0,
    15000, 0.05, 750,
    0, 843, 20844.50,
    'completed', NOW()
);


--  (68000064)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5e2a3b63-1b88-43c2-9052-a52d4f4eac24',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '0e9d1639-6683-5898-bdc1-cd45a564f12b',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    1297.50, 0, 0, 12476, 0,
    26674.50, 0, 99, 0, 0,
    15000, 0.05, 600,
    0, 699, 26074.50,
    'completed', NOW()
);


--  (67000160)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9456a86f-3b75-4954-bde1-8cd096e50885',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '0780080e-5529-5a0f-ba33-ebf948042c22',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12050, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 2350, 0,
    15400, 0, 0, 0, 0,
    15000, 0.05, 603,
    0, 603, 14797,
    'completed', NOW()
);


--  (68000187)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '09406458-da7e-4b9e-9ad1-ad6b334f3ac8',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '525c17d6-fa6b-5b0e-936e-95a0621ea2cc',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 2280, 0,
    17239, 0, 41, 0, 0,
    15000, 0.05, 750,
    0, 791, 16489,
    'completed', NOW()
);


--  (68000207)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9a6cd70d-157d-45b5-9bdc-0398958d88be',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'aa8e9fe9-91f0-55c0-b923-f304d75617c4',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    25000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 9000,
    33999, 0, 1, 0, 0,
    15000, 0.05, 875,
    0, 876, 33124,
    'completed', NOW()
);


--  (66000117)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8d89e802-60e2-447f-a22c-6a1d7ed96e0f',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '08c9ebe2-cb8b-561c-86b2-e6e2395b8491',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    17850, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 19996,
    37846, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 36971,
    'completed', NOW()
);


--  (66000122)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c6ecace6-c31e-4c33-bae8-dacaef97c02e',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '91c83bdd-f1d8-5664-8241-a2014277fbf7',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    13650, 0, 3000, 0,
    0, 0, 0,
    0, 0, 0, 15478, 0,
    32126, 0, 2, 0, 0,
    15000, 0.05, 683,
    0, 685, 31443,
    'completed', NOW()
);


--  (67000067)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '20e142f4-599e-435b-bd62-b8f43eaefab6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'd75c0d8c-6cf5-5463-9f06-972464d768a9',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 12664, 0,
    25664, 0, 0, 0, 0,
    15000, 0.05, 600,
    0, 600, 25064,
    'completed', NOW()
);


--  (67000148)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '00a44ec3-d3b8-485d-9c81-69a71daa4802',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '4540c941-274c-5a7a-9b65-950a5bdbbe39',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15062, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 17496,
    32555, 0, 3, 0, 0,
    15000, 0.05, 753,
    0, 756, 31802,
    'completed', NOW()
);


--  (68000243)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '12f8bb83-6257-45bc-aa46-647117ca9c3a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '4c072784-039a-50aa-9360-5c0d655130d9',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    13000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    13000, 0, 0, 0, 0,
    13000, 0.05, 520,
    0, 520, 12480,
    'completed', NOW()
);


--  (66000157)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '31c1c9da-7662-4541-be84-9b308c439ea9',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 11871,
    26868, 0, 3, 0, 0,
    15000, 0.05, 750,
    0, 753, 26118,
    'completed', NOW()
);


--  (67000005)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e95119c0-3281-43f3-8e84-4f6c68aa7025',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'e9c17fc7-1f0a-5581-b47c-2650deefb509',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15438, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 11671,
    27100, 0, 9, 0, 0,
    15000, 0.05, 772,
    0, 781, 26328,
    'completed', NOW()
);


--  (67000063)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7182d368-e45b-4307-bd7f-0f3ec9c9963f',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'b2aa721c-be83-502e-981b-6d5b7af9ff64',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12100, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 11858, 700,
    25658, 0, 0, 0, 0,
    15000, 0.05, 605,
    0, 605, 25053,
    'completed', NOW()
);


--  (68000009)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '53c18f59-aa60-4b7f-8696-4db874b9fee1',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'de5c24c4-40c0-5be8-94cd-76475d77f735',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 11858, 0,
    24858, 0, 0, 0, 0,
    15000, 0.05, 600,
    0, 600, 24258,
    'completed', NOW()
);


--  (68000248)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '20836452-d44a-4b3b-9809-b5e86b59441b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '7d0da298-493e-5195-80db-dcc1bf14a586',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    14998, 0, 2, 0, 0,
    14998, 0.05, 425,
    0, 427, 14573,
    'completed', NOW()
);


--  (67000179)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '200c1afe-b44f-432b-9545-b010841087eb',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '8e9ac011-bd26-57e5-ad81-851a487bff74',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 11858, 0,
    24856, 0, 2, 0, 0,
    15000, 0.05, 600,
    0, 602, 24256,
    'completed', NOW()
);


--  (67000187)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3f798641-55fb-4845-9c9d-a87edcaf20d6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'c6c80162-b3d6-5cc5-8894-74c06f8e69ff',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 8800,
    23779, 0, 21, 0, 0,
    15000, 0.05, 750,
    0, 771, 23029,
    'completed', NOW()
);


--  (68000050)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3f7ed052-630d-4c6a-be91-ba07c4464e7e',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '125b70c0-b68a-55be-b901-7ae49354419b',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 9000,
    23978, 0, 22, 0, 0,
    15000, 0.05, 750,
    0, 772, 23228,
    'completed', NOW()
);


--  (68000052)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a2e26e89-e99f-4022-99e3-a628a0a56441',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '821507e5-bcb7-5d3b-b6af-1bb249c93e3d',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 6606, 0,
    19586, 0, 20, 0, 0,
    15000, 0.05, 600,
    0, 620, 18986,
    'completed', NOW()
);


--  (68000057)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '17839173-b3f1-429f-ac95-4099b834c3b6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'd9aa9fe5-ef23-5bf5-954c-87fb722752c0',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 11971,
    26971, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 26221,
    'completed', NOW()
);


--  (68000090)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '100aa54a-0a70-4092-9a2c-3d2c3bea23d9',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    17000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 6260,
    23260, 0, 0, 0, 0,
    15000, 0.05, 850,
    0, 850, 22410,
    'completed', NOW()
);


--  (68000101)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd2e697d7-a86d-4585-b2a8-8d135e80ebab',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 6278, 0,
    19278, 0, 0, 0, 0,
    15000, 0.05, 600,
    0, 600, 18678,
    'completed', NOW()
);


--  (68000125)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '61a113f1-de44-4136-85cf-b8a3410d3529',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'd9374f1c-a86e-59dd-8bf5-907fb2e0222f',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5260,
    20260, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 19510,
    'completed', NOW()
);


--  (68000146)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3c7dd3b4-de27-4988-bd01-0ffecbb66d6a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 5260,
    20260, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 19510,
    'completed', NOW()
);


--  (66000142)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '4e7eba7d-26c4-4646-9a20-3f33f75e6778',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '69f26489-1d61-535f-89a6-3a704b365993',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15038, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 16761, 0,
    32795, 0, 4, 0, 0,
    15000, 0.05, 752,
    0, 756, 32043,
    'completed', NOW()
);


--  (67000074)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '61b91710-0a65-4b15-aa8e-2e66854c1798',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '22fc8531-282a-5628-96e2-c1ffb582f4dc',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12150, 0, 1000, 0,
    0, 0, 0,
    76, 0, 0, 13251, 0,
    26477, 0, 0, 0, 0,
    15000, 0.05, 608,
    0, 608, 25869,
    'completed', NOW()
);


--  (67000158)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '82be3574-eaef-433e-b42f-39a5e42ab28a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '4df3bef4-a420-51d3-9b39-6775a01e81f3',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12050, 0, 1000, 0,
    0, 0, 0,
    0, 0, 0, 13251, 0,
    26301, 0, 0, 0, 0,
    15000, 0.05, 603,
    0, 603, 25698,
    'completed', NOW()
);


--  (68000186)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '746fbb6a-8dc9-4a1f-ae0e-76d335bd1cdf',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '99e7fbda-e804-556f-aa77-f6d31396196d',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1500, 0, 0, 10756, 0,
    27256, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 26506,
    'completed', NOW()
);


--  (68000193)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '94d8b349-df80-4dc1-80bc-551a1e0c9ffb',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'f8d4c553-8292-5f4a-a623-61a2801f54bf',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1434, 0, 0, 10756, 0,
    27190, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 26440,
    'completed', NOW()
);


--  (68000204)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '34c51522-7235-491a-95a9-2375f8a97004',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'b9aa155a-ae77-5480-9afa-541840cfc63f',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1406.25, 0, 0, 12680, 0,
    29086.25, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 28336.25,
    'completed', NOW()
);


--  (67000103)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1c52b146-afc1-4df1-9e2b-47e9b7b9aaf6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12100, 0, 1000, 0,
    0, 0, 0,
    302.50, 0, 0, 5485, 0,
    18887.50, 0, 0, 0, 0,
    15000, 0.05, 605,
    0, 605, 18282.50,
    'completed', NOW()
);


--  (68000029)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '664c9db9-3b46-4791-8985-5d1cc1522f04',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '2f8de48d-9ede-562f-b143-648c0982930a',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    540, 0, 0, 5485, 0,
    19005, 0, 20, 0, 0,
    15000, 0.05, 600,
    0, 620, 18405,
    'completed', NOW()
);


--  (68000160)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ad1edc7e-f234-4f95-b806-313aba115e6b',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'dd3ac8f8-85f9-5893-8d8d-00c705615d95',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    3375, 0, 0, 968, 0,
    19327, 0, 16, 0, 0,
    15000, 0.05, 750,
    0, 766, 18577,
    'completed', NOW()
);


--  (68000167)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5de4f957-d5e0-4eb3-8bba-bd7a2922ae59',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '221f4ce3-8559-5a20-b8da-45a4bc9d9808',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1312.50, 0, 0, 10908, 0,
    27198.50, 0, 22, 0, 0,
    15000, 0.05, 750,
    0, 772, 26448.50,
    'completed', NOW()
);


--  (68000195)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '656b5435-561c-455c-9039-df47a77ce6ac',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '09650291-b21c-5341-9ac2-4cae6e1d15f4',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1781.25, 0, 0, 10908, 0,
    27689.25, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 26939.25,
    'completed', NOW()
);


--  (68000147)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '97c2b30f-afa2-4bcb-aebd-6ce9d7545637',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'f7023f53-4a76-51b1-86cd-cf9f1f41ec04',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    2062.50, 0, 0, 3010, 0,
    18046.50, 0, 26, 0, 0,
    15000, 0.05, 600,
    0, 626, 17446.50,
    'completed', NOW()
);


--  (68000148)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd5a271a2-b28e-4500-8337-b70a74183970',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '61391e19-c7ab-5cb2-bac6-091bc676bf1f',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    2925, 0, 0, 3010, 0,
    18935, 0, 0, 0, 0,
    15000, 0.05, 600,
    0, 600, 18335,
    'completed', NOW()
);


--  (68000124)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '01fb3278-015f-4905-8d92-8aafacda9d93',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'c607ca11-6d7f-5ddb-bffb-2520f2c652ba',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    12000, 0, 1000, 0,
    0, 0, 0,
    3150, 0, 0, 37029, 0,
    53169, 0, 10, 0, 0,
    15000, 0.05, 600,
    0, 610, 52569,
    'completed', NOW()
);


--  (68000208)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8c7bdf1f-406b-486c-a77b-c7251165f592',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    937.50, 0, 0, 785, 0,
    16701.50, 0, 21, 0, 0,
    15000, 0.05, 750,
    0, 771, 15951.50,
    'completed', NOW()
);


--  (68000216)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2d40c4c0-3115-4173-94e1-bbb20a79b010',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '0112bd55-30fe-5356-b803-780b8324b198',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    843.75, 0, 0, 785, 0,
    16628.75, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 15878.75,
    'completed', NOW()
);


--  (68000192)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7da15ef1-9a32-4060-bf67-5e688646d40a',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '8eb394aa-d000-50c7-8961-5e6e93d5d2fe',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1312.50, 0, 0, 533, 0,
    16845.50, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 16095.50,
    'completed', NOW()
);


--  (68000217)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '6feb37fb-5883-428b-8c30-fbd4ad23c1bf',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    1312.50, 0, 0, 533, 0,
    16570.50, 250, 25, 0, 0,
    15000, 0.05, 750,
    0, 1025, 15820.50,
    'completed', NOW()
);


--  (68000233)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1a8e235a-3a9f-4a26-850a-b7e1e2ed1861',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '370635ca-4642-50d4-8f7b-a28c9fad804b',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    3500, 0, 0, 0,
    0, 0, 0,
    937.50, 0, 0, 670, 0,
    5107.50, 0, 0, 0, 600,
    5107.50, 0.05, 175,
    0, 775, 4332.50,
    'completed', NOW()
);


--  (69000017)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1c6b1c70-5c31-4ddd-9a53-f6abfe9326ee',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '6a338509-e525-53ec-940c-21bd7329edf3',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    4400, 0, 1833, 0,
    0, 0, 0,
    1350, 0, 0, 0, 2800,
    10383, 0, 0, 0, 0,
    10383, 0.05, 220,
    0, 220, 10163,
    'completed', NOW()
);


--  (69000018)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '4c2cd8d7-2e49-4146-bee1-574b795dbde3',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '66522e0c-15d1-5f8e-9908-725c0dff39df',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    4800, 0, 2000, 0,
    0, 0, 0,
    1762.50, 0, 0, 0, 2800,
    11362.50, 0, 0, 0, 0,
    11362.50, 0.05, 240,
    0, 240, 11122.50,
    'completed', NOW()
);


--  (69000016)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a65acc26-70b8-42b2-9b29-d26cf3e69056',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'd6781c94-8acb-5bca-8f1a-87b91b21b2a1',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    6000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3500,
    9409, 0, 91, 0, 0,
    9409, 0.05, 300,
    0, 391, 9109,
    'completed', NOW()
);


--  (69000021)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a9bf0d13-e384-49ef-95f2-10da0b4007eb',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '48c82575-eae0-57e3-98aa-b83d421e73fd',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    6000, 0, 0, 0,
    0, 0, 0,
    1875, 0, 0, 0, 3500,
    11375, 0, 0, 0, 0,
    11375, 0.05, 300,
    0, 300, 11075,
    'completed', NOW()
);


--  (69000028)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd5a89614-7a17-4c5d-9d50-557a9cdfbfd3',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '8beafe18-b109-544d-ac59-07c7810e1a92',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    1500, 0, 0, 0,
    0, 0, 0,
    187.50, 0, 0, 0, 3500,
    5177.50, 0, 10, 0, 0,
    5177.50, 0.05, 83,
    0, 93, 5094.50,
    'completed', NOW()
);


--  (68000240)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c5ea6e78-e2d9-401c-b33d-1c0482c86d40',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'cf23521a-f49a-5f16-bc8e-6868ae9d2b61',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    6500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3500,
    10000, 0, 0, 0, 0,
    10000, 0.05, 325,
    0, 325, 9675,
    'completed', NOW()
);


--  (69000010)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2ed4db60-1ef4-4e0b-b1e9-ce254d27ccfd',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'b871ae33-5778-5f96-9561-2c612960b46d',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    8280, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3500,
    11780, 0, 0, 0, 0,
    11780, 0.05, 414,
    0, 414, 11366,
    'completed', NOW()
);


--  (69000026)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9972372e-f8a8-4adc-882b-9655128e8049',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '6174c2f6-3787-5818-b109-2d49857deaa0',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    2000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2800,
    4800, 0, 0, 0, 0,
    4800, 0.05, 100,
    0, 100, 4700,
    'completed', NOW()
);


--  (69000027)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '056e3f89-9a57-4bea-8742-91f84ec6243d',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    2000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2800,
    4794, 0, 6, 0, 0,
    4794, 0.05, 100,
    0, 106, 4694,
    'completed', NOW()
);


--  (69000005)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '186d9b0b-9b5e-4ec4-a4c5-eb19d3a6a2f6',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '29031ab6-5d1c-5c39-9250-9caf4abdbc9c',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    11000, 0, 0, 0,
    0, 0, 0,
    2437.50, 0, 0, 0, 3500,
    16866.50, 0, 71, 0, 0,
    15000, 0.05, 550,
    0, 621, 16316.50,
    'completed', NOW()
);


--  (69000004)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8c3dc046-587f-4e6c-aeb6-fa3b505521ca',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    10500, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 3500,
    13978, 0, 22, 0, 0,
    13978, 0.05, 525,
    0, 547, 13453,
    'completed', NOW()
);


--  (69000023)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '787e7f57-03bd-499c-94c2-768e382f9c72',
    (SELECT id FROM payroll_periods WHERE company_id = 'a24d6342-8720-42c7-bb8a-5932169274bf' AND year = 2026 AND month = 2 LIMIT 1),
    '82517c4d-c0b9-54a2-ac6c-36b1799e2ed2',
    'a24d6342-8720-42c7-bb8a-5932169274bf',
    2026, 2,
    0, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 2500,
    2500, 0, 0, 0, 0,
    2500, 0.05, 0,
    75, 75, 2425,
    'completed', NOW()
);


--  (61000001)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cebaa6f6-d8bf-49bc-823a-3daacc96b43f',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'e939f7de-7ff7-5e57-b19e-e4625c3fa66e',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    100000, 8500, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    108500, 0, 0, 0, 0,
    15000, 0.05, 875,
    6915, 7790, 100710,
    'completed', NOW()
);


--  (62000008)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '82a44ef2-82b8-40f2-a27e-0cd46c5c191b',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '04cd3508-bd0c-50e3-a676-1c63a0db7bef',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    90515, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 800,
    91315, 0, 0, 0, 0,
    15000, 0.05, 875,
    7075, 7950, 83365,
    'completed', NOW()
);


--  (64000076)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'dad81373-50c1-43ad-8884-6d5b4dc61c91',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '998d6f38-fcad-58dd-a19c-50c9d7a5a846',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    100000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    100000, 0, 0, 0, 0,
    15000, 0.05, 875,
    10198, 11073, 88927,
    'completed', NOW()
);


--  (65000027)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'de6f8bfb-219f-44ba-a186-2914b33c46d7',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    52000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    52000, 0, 0, 0, 0,
    15000, 0.05, 875,
    1905, 2780, 49220,
    'completed', NOW()
);


--  (63000004)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '45848a86-20d2-484a-9eb4-ee15494dfb4b',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    21660, 0, 1200, 0,
    0, 0, 0,
    1331.19, 0, 0, 0, 2500,
    26691.19, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 25816.19,
    'completed', NOW()
);


--  (63000013)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'fa0cd1e5-8c16-4c4f-8df5-40d0b34f1acd',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '8782c4a8-1e20-576e-84bc-c26f8a7ba212',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    18775, 0, 720, 0,
    0, 0, 0,
    801.85, 0, 0, 0, 1800,
    22096.85, 0, 0, 447, 0,
    15000, 0.05, 875,
    0, 1322, 20774.85,
    'completed', NOW()
);


--  (66000103)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3aea5f1c-9c25-47b1-a732-0ad7307ff78b',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14265, 0, 720, 0,
    0, 0, 0,
    876.70, 0, 0, 0, 2400,
    18261.70, 0, 0, 0, 0,
    15000, 0.05, 713,
    0, 713, 17548.70,
    'completed', NOW()
);


--  (67000016)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7264f9de-dd3e-4c69-8f31-7b800bdf13c5',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16145, 0, 0, 0,
    0, 0, 0,
    790.43, 0, 0, 0, 1700,
    18635.43, 0, 0, 0, 0,
    15000, 0.05, 807,
    0, 807, 17828.43,
    'completed', NOW()
);


--  (67000047)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f17e016a-8404-421c-aa5c-757079e73304',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '761e2d60-c9a2-5980-8291-33d7e6003b77',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14925, 0, 0, 0,
    0, 0, 0,
    1197.11, 0, 0, 0, 1300,
    17422.11, 0, 0, 0, 0,
    15000, 0.05, 746,
    0, 746, 16676.11,
    'completed', NOW()
);


--  (67000048)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0234d705-5f5a-49c5-91dc-7d527f1c72de',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '01de89c3-e9b9-5e00-9ad0-f84120e68f32',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14630, 0, 0, 0,
    0, 0, 0,
    716.26, 0, 0, 0, 1200,
    16546.26, 0, 0, 0, 0,
    15000, 0.05, 732,
    0, 732, 15814.26,
    'completed', NOW()
);


--  (67000079)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'aa736c62-13dd-473f-b3d8-2d743413a952',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '92434f86-a3f3-59fb-a171-2737f7e4eeb3',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    18000, 0, 0, 0,
    0, 0, 0,
    768.75, 0, 0, 0, 1800,
    20568.75, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 19693.75,
    'completed', NOW()
);


--  (67000122)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a1cc39e3-a87e-4034-92ee-b063da5aa964',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'ac785da4-dad6-5d02-a244-5cfbcab2d652',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15750, 0, 0, 0,
    0, 0, 0,
    869.53, 0, 0, 0, 1700,
    18319.53, 0, 0, 0, 0,
    15000, 0.05, 788,
    0, 788, 17531.53,
    'completed', NOW()
);


--  (67000131)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '34dc7652-c614-4ed7-a9da-f2a877620cd3',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '01cba86c-0fec-53e0-ae47-3d0c9b89114d',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15780, 0, 0, 0,
    0, 0, 0,
    871.19, 0, 0, 0, 1800,
    18451.19, 0, 0, 0, 0,
    15000, 0.05, 789,
    0, 789, 17662.19,
    'completed', NOW()
);


--  (67000141)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '444bada8-544a-4bda-b22c-02a1f648d45c',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '27a88639-284e-56a1-8411-e220b1ff791c',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15450, 0, 0, 0,
    0, 0, 0,
    1094, 0, 0, 0, 900,
    17444, 0, 0, 0, 0,
    15000, 0.05, 773,
    0, 773, 16671,
    'completed', NOW()
);


--  (67000142)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '140a7b84-73e3-47c5-a06a-02532810b0e3',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '14212460-9e81-582a-bb96-29396c6a6042',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15900, 0, 0, 0,
    0, 0, 0,
    977.19, 0, 0, 0, 2000,
    18877.19, 0, 0, 0, 0,
    15000, 0.05, 795,
    0, 795, 18082.19,
    'completed', NOW()
);


--  (68000083)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '4987532a-31fd-461d-9850-6dad852b2e21',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '211dbd0d-5a0e-5292-a304-47b7d7558ee4',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15250, 0, 0, 0,
    0, 0, 0,
    937.24, 0, 0, 0, 600,
    16787.24, 0, 0, 0, 0,
    15000, 0.05, 763,
    0, 763, 16024.24,
    'completed', NOW()
);


--  (68000092)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '83ca54e9-674d-476e-83e5-2f700083251c',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'a8df724a-6971-57a6-9179-d322345a337a',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15480, 0, 0, 0,
    0, 0, 0,
    1144.88, 0, 0, 0, 1800,
    18424.88, 0, 0, 0, 0,
    15000, 0.05, 774,
    0, 774, 17650.88,
    'completed', NOW()
);


--  (68000181)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '49fe9cfb-c093-48af-b99f-76758bda783e',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '9802ed5a-ab9e-55c1-965c-f39d4fcac334',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    734.38, 0, 0, 0, 0,
    15734.38, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 14984.38,
    'completed', NOW()
);


--  (68000191)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ef8fa386-8944-4eec-9345-5ce4fb9ca430',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '3335315b-d3a9-5b61-a1d7-e1c790b7379e',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    15000, 0, 0, 0, 0,
    15000, 0.05, 750,
    0, 750, 14250,
    'completed', NOW()
);


--  (63000007)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ebbc86d5-e983-4351-888d-97ba9cc7cf37',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'cbecb087-f26d-50e0-9226-c158353aed33',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    20615, 0, 0, 0,
    0, 0, 0,
    4552.48, 0, 0, 0, 4050,
    29217.48, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 28342.48,
    'completed', NOW()
);


--  (63000030)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '86689f63-22a7-472c-a7a8-091c7513c296',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'c62ae54d-1b75-5b9e-b578-de1d9b564671',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    19900, 0, 0, 0,
    0, 0, 0,
    6560.29, 0, 0, 0, 4040,
    30500.29, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 29625.29,
    'completed', NOW()
);


--  (64000037)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '4722e07c-00ee-41ce-83fb-23d151c07df2',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '1ffb0382-09aa-53d0-a817-29d984423507',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16965, 0, 0, 0,
    0, 0, 0,
    2756.81, 0, 0, 0, 4000,
    23721.81, 0, 0, 0, 0,
    15000, 0.05, 848,
    0, 848, 22873.81,
    'completed', NOW()
);


--  (65000004)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2fbe0532-cda7-47f2-b10a-c7bde86ea332',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'd0a056fc-fe69-5613-910a-de09ff7c4a88',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15760, 0, 0, 0,
    0, 0, 0,
    1838.67, 0, 0, 0, 3980,
    21578.67, 0, 0, 0, 0,
    15000, 0.05, 788,
    0, 788, 20790.67,
    'completed', NOW()
);


--  (66000017)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '945c58d3-1801-4c41-9414-8dfb4424b18c',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '0eb5e253-d653-50a5-9352-8616c6dad676',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    17100, 0, 0, 0,
    0, 0, 0,
    4577.81, 0, 0, 0, 4010,
    25687.81, 0, 0, 0, 0,
    15000, 0.05, 855,
    0, 855, 24832.81,
    'completed', NOW()
);


--  (66000069)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'dc962fe9-e621-4850-b67b-3b6ea17f8a3d',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'f512ff81-3577-58b8-bc43-c165f2527d96',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16785, 0, 0, 0,
    0, 0, 0,
    2570.20, 0, 0, 0, 4010,
    23365.20, 0, 0, 0, 0,
    15000, 0.05, 839,
    0, 839, 22526.20,
    'completed', NOW()
);


--  (67000024)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd14ee7dc-fb6b-4ab0-9daa-e520f28a6d02',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '4fdf0298-8a50-569a-9ccc-47e027bad5bf',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16900, 0, 322, 0,
    0, 0, 0,
    1320.31, 0, 0, 0, 0,
    18542.31, 0, 0, 0, 0,
    15000, 0.05, 845,
    0, 845, 17697.31,
    'completed', NOW()
);


--  (67000077)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2cc966c9-ad7e-4463-af91-1a13fb4d9cfc',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '7d4edb9b-bdfd-5eb1-853b-97186b34397b',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    22900, 0, 0, 0,
    0, 0, 0,
    7156.25, 0, 0, 0, 3225,
    33281.25, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 32406.25,
    'completed', NOW()
);


--  (67000135)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ae5b9ea9-a32b-4a28-a0cd-caa5bf760810',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15665, 0, 0, 0,
    0, 0, 0,
    3377.77, 0, 0, 0, 5140,
    24182.77, 0, 0, 0, 0,
    15000, 0.05, 783,
    0, 783, 23399.77,
    'completed', NOW()
);


--  (68000237)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd4fb0f93-94ec-437d-b348-acddff8d0aa4',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '8560d71d-54bd-5475-8503-a591f9e86510',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    33000, 0, 0, 0,
    0, 0, 0,
    6462.50, 0, 0, 0, 2000,
    41462.50, 0, 0, 0, 0,
    15000, 0.05, 875,
    360, 1235, 40227.50,
    'completed', NOW()
);


--  (61000002)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7d5a8865-1fce-450b-bc22-327c4babb963',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '05adf243-cb3e-570b-bf50-2b72a7b1f739',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    23050, 0, 0, 0,
    0, 0, 0,
    6674.90, 0, 0, 0, 3300,
    33024.90, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 32149.90,
    'completed', NOW()
);


--  (61000004)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c8db5380-078c-4ff6-aadb-5f80ede1ba9b',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '7ab44fce-fced-5f3f-8f25-1db966f9c14b',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    27880, 0, 0, 0,
    0, 0, 0,
    8480.17, 0, 0, 0, 1500,
    37860.17, 0, 0, 1208, 0,
    15000, 0.05, 875,
    495, 2578, 35282.17,
    'completed', NOW()
);


--  (61000005)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8ae6aa4a-f46d-49a5-a489-1e569838690b',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'f41241e9-4510-5f92-9743-55982477ea03',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    31240, 0, 0, 0,
    0, 0, 0,
    9411.62, 0, 0, 0, 3800,
    44451.62, 0, 0, 0, 0,
    15000, 0.05, 875,
    638, 1513, 42938.62,
    'completed', NOW()
);


--  (64000101)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0c82561d-4c74-4859-a836-229c27c395af',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '70235a7f-36c5-59d8-959b-9cd3d10c925c',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16690, 0, 0, 0,
    0, 0, 0,
    5302.55, 0, 0, 0, 2800,
    24694.55, 0, 0, 0, 98,
    15000, 0.05, 835,
    0, 933, 23859.55,
    'completed', NOW()
);


--  (64000104)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'da64a4ec-db53-4f22-91e6-52c654d97bec',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'bd56b283-9b42-568d-a514-2397a909aaee',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    17460, 0, 0, 0,
    0, 0, 0,
    9457.50, 0, 0, 0, 2300,
    29217.50, 0, 0, 0, 0,
    15000, 0.05, 873,
    0, 873, 28344.50,
    'completed', NOW()
);


--  (64000107)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3d13c7cd-f1ce-468a-ab71-404833805aae',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '5df9bf71-89a8-546a-8456-897c58407d36',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    17660, 0, 0, 0,
    0, 0, 0,
    5923.46, 0, 0, 0, 3800,
    27383.46, 0, 0, 273, 0,
    15000, 0.05, 875,
    0, 1148, 26235.46,
    'completed', NOW()
);


--  (65000010)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'da391add-97b3-44ed-b158-cd792b373435',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16950, 0, 0, 0,
    0, 0, 0,
    9171.94, 0, 0, 0, 2300,
    28421.94, 0, 0, 0, 0,
    15000, 0.05, 848,
    0, 848, 27573.94,
    'completed', NOW()
);


--  (65000063)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd73d8294-5363-4d46-afb7-a8891c1ff0b5',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'e4d5e196-ae83-5461-ac69-7591ed03d182',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15710, 0, 0, 0,
    0, 0, 0,
    7773.18, 0, 0, 0, 1500,
    24983.18, 0, 0, 0, 0,
    15000, 0.05, 786,
    0, 786, 24197.18,
    'completed', NOW()
);


--  (65000067)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '2038e818-d95b-4c1b-946d-cd652b0ea762',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '4168d710-be67-5e11-a2b9-30b130980b5f',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16400, 0, 0, 0,
    0, 0, 0,
    5107.92, 0, 0, 0, 3400,
    24772.92, 0, 0, 840, 135,
    15000, 0.05, 820,
    0, 1795, 23112.92,
    'completed', NOW()
);


--  (66000055)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c26d03a8-2039-4be0-900e-275e5091c721',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    41650, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    41650, 0, 0, 0, 0,
    15000, 0.05, 875,
    870, 1745, 39905,
    'completed', NOW()
);


--  (66000113)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0d75e82a-73a0-4ef7-b173-994d3c23f0b1',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'affaf1cd-7b35-522b-8cb4-9b2da375e2a1',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14710, 0, 0, 0,
    0, 0, 0,
    3892.02, 0, 0, 0, 2400,
    21002.02, 0, 0, 0, 0,
    15000, 0.05, 736,
    0, 736, 20266.02,
    'completed', NOW()
);


--  (66000115)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7038b06e-01ac-4f35-8c5f-4549d2c30385',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '1e22d175-b7ab-5634-846b-d06d493c291e',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16455, 0, 0, 0,
    0, 0, 0,
    5296.45, 0, 0, 0, 3200,
    24951.45, 0, 0, 0, 0,
    15000, 0.05, 823,
    0, 823, 24128.45,
    'completed', NOW()
);


--  (67000096)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1048050b-9247-4aef-96ad-9eeae8a11d25',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '35bbe2c8-93e5-5736-8ef8-a531fbfbe321',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13525, 0, 0, 0,
    0, 0, 0,
    4522.42, 0, 0, 0, 2800,
    20847.42, 0, 0, 0, 0,
    15000, 0.05, 676,
    0, 676, 20171.42,
    'completed', NOW()
);


--  (67000128)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '76c1f0ef-ee9b-4252-a97c-732acb873397',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13990, 0, 0, 0,
    0, 0, 0,
    4809.06, 0, 0, 0, 2450,
    21249.06, 0, 0, 0, 0,
    15000, 0.05, 700,
    0, 700, 20549.06,
    'completed', NOW()
);


--  (67000224)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e6da7fcd-6d2f-44f3-8e82-e6746fb0b037',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '50876a37-ea0b-55a8-882d-a7778ef5fe34',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14705, 0, 0, 0,
    0, 0, 0,
    1654.31, 0, 0, 0, 3025,
    19384.31, 0, 0, 0, 0,
    15000, 0.05, 735,
    0, 735, 18649.31,
    'completed', NOW()
);


--  (67000233)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7b0ad93f-d932-4939-bd03-b7026f8cd452',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'c281bc5d-8b81-5652-87e9-ed6a373c9521',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14705, 0, 0, 0,
    0, 0, 0,
    1838.12, 0, 0, 0, 3875,
    20418.12, 0, 0, 0, 0,
    15000, 0.05, 735,
    0, 735, 19683.12,
    'completed', NOW()
);


--  (68000053)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8f6db9a3-3fcf-4f58-90fd-ff9772373db5',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '7879198a-47eb-5287-868a-46184c4e20fc',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13300, 0, 0, 0,
    0, 0, 0,
    3976.15, 0, 0, 0, 1500,
    18332.15, 444, 0, 0, 0,
    15000, 0.05, 665,
    0, 1109, 17667.15,
    'completed', NOW()
);


--  (68000078)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0e93d84d-0492-468d-ac2f-c5b50626126a',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'd29a237f-3405-5fad-a674-111a79fdf72a',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12360, 0, 0, 0,
    0, 0, 0,
    1236, 0, 0, 0, 800,
    14396, 0, 0, 0, 0,
    14396, 0.05, 618,
    0, 618, 13778,
    'completed', NOW()
);


--  (68000084)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'afe704fc-d20b-4338-a9f3-0672444e3975',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '517f9a6a-d0db-51d9-a416-0158489f3161',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12135, 0, 0, 0,
    0, 0, 0,
    1580.08, 0, 0, 0, 800,
    14515.08, 0, 0, 0, 0,
    14515.08, 0.05, 607,
    0, 607, 13908.08,
    'completed', NOW()
);


--  (68000096)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'fde32cd0-7da3-4b0f-98b3-d6c1a1550f0f',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13120, 0, 0, 0,
    0, 0, 0,
    4223, 0, 0, 0, 2300,
    19643, 0, 0, 0, 0,
    15000, 0.05, 656,
    0, 656, 18987,
    'completed', NOW()
);


--  (68000099)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ddb03b44-7982-46e2-a6ad-ec85a030dbf1',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '4c8ac637-78b3-5d13-b3ec-f7e002e6b629',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13050, 0, 0, 0,
    0, 0, 0,
    4091.72, 0, 0, 0, 2000,
    19141.72, 0, 0, 0, 0,
    15000, 0.05, 653,
    0, 653, 18488.72,
    'completed', NOW()
);


--  (68000103)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '644b75ab-dea1-42ee-a6f8-cef77f54b537',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13100, 0, 0, 0,
    0, 0, 0,
    2074.17, 0, 0, 0, 2300,
    17474.17, 0, 0, 0, 0,
    15000, 0.05, 655,
    0, 655, 16819.17,
    'completed', NOW()
);


--  (68000105)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e4f882b3-fe6f-4647-a1c1-7b39e77cd2d6',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '39e57597-eb36-5a13-81b1-6405012c8f50',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    41650, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 800,
    42450, 0, 0, 0, 0,
    15000, 0.05, 875,
    950, 1825, 40625,
    'completed', NOW()
);


--  (68100004)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '24228304-cdaf-409c-a570-54faf702eb8f',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'aceb5a8d-378a-5055-8980-0af1fe42ff72',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13030, 0, 0, 0,
    0, 0, 0,
    3135.34, 0, 0, 0, 1500,
    17599.59, 0, 0, 0, 65.75,
    15000, 0.05, 652,
    0, 717.75, 16947.59,
    'completed', NOW()
);


--  (68100005)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'f65a3170-a21f-4ba7-85a5-3b02e939e7ed',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '557e7170-28be-5496-aaf6-a6f8ef015d73',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13050, 0, 0, 0,
    0, 0, 0,
    3140.16, 0, 0, 0, 2250,
    18440.16, 0, 0, 0, 0,
    15000, 0.05, 653,
    0, 653, 17787.16,
    'completed', NOW()
);


--  (68000112)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e0e100d7-5275-4f03-b7c0-8979a28688a7',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '567a43db-535d-5c8d-a0f0-c5b587b72f32',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13280, 0, 0, 0,
    0, 0, 0,
    3071, 0, 0, 0, 1700,
    17485.40, 0, 0, 0, 565.60,
    15000, 0.05, 664,
    0, 1229.60, 16821.40,
    'completed', NOW()
);


--  (68100006)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5ef289f3-14fe-45e5-a774-0c385ef5e348',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '801c4439-a99d-5930-b3c6-04330b6d3aeb',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13160, 0, 0, 0,
    0, 0, 0,
    3509.33, 0, 0, 0, 1600,
    18269.33, 0, 0, 0, 0,
    15000, 0.05, 658,
    0, 658, 17611.33,
    'completed', NOW()
);


--  (68100008)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8509d37f-7872-4e1a-8317-49f5b2a1bcfd',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '985acd7c-d2f5-5477-8f99-58aaceec2453',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13290, 0, 0, 0,
    0, 0, 0,
    6049.72, 0, 0, 0, 2800,
    21574.12, 0, 0, 0, 565.60,
    15000, 0.05, 665,
    605, 1835.60, 20304.12,
    'completed', NOW()
);


--  (68100010)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '919146c6-98f5-4c45-a3a3-3fc0ff40ada4',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '9de24856-3251-5daa-90d2-c50418b50f1c',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13100, 0, 0, 0,
    0, 0, 0,
    1937.71, 0, 0, 0, 2400,
    17437.71, 0, 0, 0, 0,
    15000, 0.05, 655,
    0, 655, 16782.71,
    'completed', NOW()
);


--  (68100011)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cb4a8ffe-2897-4ae8-8467-77f4597df90a',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '96579141-0036-5180-afb0-34c949c4eb47',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13190, 0, 0, 0,
    0, 0, 0,
    4630.24, 0, 0, 0, 3200,
    21020.24, 0, 0, 0, 0,
    15000, 0.05, 660,
    0, 660, 20360.24,
    'completed', NOW()
);


--  (68100013)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'cda12d9e-c836-415b-b7dc-3314cac00e02',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'db803dde-0a25-5c9c-820e-9e88125640e9',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    4713.54, 0, 0, 0, 2800,
    20013.54, 0, 0, 0, 0,
    15000, 0.05, 0,
    600.41, 600.41, 19413.14,
    'completed', NOW()
);


--  (68100014)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'a684a63c-0dc1-4f20-8b75-6b51bb00a4cb',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'b18bf0ca-b052-51a9-9e12-2609feebf78d',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    4283.85, 0, 0, 0, 2450,
    18668.25, 0, 0, 0, 565.60,
    15000, 0.05, 0,
    560.05, 1125.65, 18108.21,
    'completed', NOW()
);


--  (68100015)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5d6085bd-1a3e-45fc-9688-6a226a70c171',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'd3ee833a-707a-5f09-acf0-104def5a0b76',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    3502.60, 0, 0, 0, 3100,
    19102.60, 0, 0, 0, 0,
    15000, 0.05, 0,
    573.08, 573.08, 18529.53,
    'completed', NOW()
);


--  (68100019)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5049f671-c77b-4f75-961c-1135864ae318',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '3a2274aa-1922-5659-ab28-ff332c027911',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    3606.77, 0, 0, 0, 2300,
    18308.77, 0, 0, 0, 98,
    15000, 0.05, 0,
    549.26, 647.26, 17759.51,
    'completed', NOW()
);


--  (68100022)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '51e7de01-e04d-4ca1-a7f1-2c9baacead98',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '5c735131-aa5c-5b05-9463-4bb622a0ffbc',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    4075.52, 0, 0, 0, 1500,
    18075.52, 0, 0, 0, 0,
    15000, 0.05, 0,
    542.27, 542.27, 17533.26,
    'completed', NOW()
);


--  (68100026)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8e10d092-821c-43be-b475-5b73ad857f50',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'fb1135d8-3185-585f-8a07-88dd63c6f813',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    1588.54, 0, 0, 0, 300,
    13972.54, 416, 0, 0, 0,
    13972.54, 0.05, 0,
    419.18, 835.18, 13553.37,
    'completed', NOW()
);


--  (68100031)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '1c6659ea-12b9-4622-ae3c-72384b63ffec',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '52d1ae36-9dfa-56e1-bb7a-69389679d153',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    2838.54, 0, 0, 0, 2050,
    16972.54, 416, 0, 0, 0,
    15000, 0.05, 0,
    509.18, 925.18, 16463.37,
    'completed', NOW()
);


--  (68100034)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'bdc6b203-fec9-4ab3-aac2-b7655fee3525',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'da37a2bc-4e5a-5939-8c31-41152e00e266',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    3593.75, 0, 0, 0, 1900,
    17428.15, 0, 0, 0, 565.60,
    15000, 0.05, 0,
    522.84, 1088.44, 16905.31,
    'completed', NOW()
);


--  (68100037)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '0f8cfc6b-dfab-4f2e-957a-5665c88ef14f',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'bb5b9b81-8128-5443-89d1-80e892dc3ea0',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    4075.52, 0, 0, 0, 1900,
    17642.52, 833, 0, 0, 0,
    15000, 0.05, 0,
    529.28, 1362.28, 17113.25,
    'completed', NOW()
);


--  (69000007)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '21556e1c-8dda-47d4-99c6-c7ca9bdde7db',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '1626dd3b-35d6-5975-8947-e2ad80b3e357',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    3684.90, 0, 0, 0, 500,
    16684.90, 0, 0, 0, 0,
    15000, 0.05, 0,
    500.55, 500.55, 16184.35,
    'completed', NOW()
);


--  (69000008)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9bfef0b3-c3bc-413c-a2d8-e8da4869315d',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '0229c72f-ae2b-5abe-ba68-4e12f4ed387e',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    3502.94, 0, 0, 0, 500,
    16362.94, 0, 0, 0, 140,
    15000, 0.05, 0,
    490.89, 630.89, 15872.05,
    'completed', NOW()
);


--  (69000002)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd0ba0cb7-d4b8-4da7-a933-af57e7a3c4c8',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    468.75, 0, 0, 0, 916,
    13884.75, 0, 0, 0, 0,
    13884.75, 0.05, 0,
    416.54, 416.54, 13468.21,
    'completed', NOW()
);


--  (69000024)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '34f38ab7-781e-4005-b854-aa24a714dfb6',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '93713aeb-34a6-5c25-8207-6292fcf7caa9',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    7083, 0, 0, 0,
    0, 0, 0,
    545.98, 0, 0, 0, 0,
    7628.98, 0, 0, 0, 0,
    7628.98, 0.05, 0,
    228.87, 228.87, 7400.11,
    'completed', NOW()
);


--  (69000025)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '8a0d8c8f-6b48-4870-8d70-374a2713d0d9',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    5000, 0, 0, 0,
    0, 0, 0,
    0, 0, 0, 0, 0,
    5000, 0, 0, 0, 0,
    5000, 0.05, 0,
    150, 150, 4850,
    'completed', NOW()
);


--  (62000004)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '88d86942-0f7b-4035-87b5-bc4cda9db2f3',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '385dda09-e293-5f2d-bde4-4f663bf8d399',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    19800, 0, 0, 0,
    0, 0, 0,
    2722.50, 0, 0, 0, 0,
    22522.50, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 21647.50,
    'completed', NOW()
);


--  (62000006)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd09f0286-2d43-495d-9bac-64b79aa08c0e',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '3e1111f2-00b9-538d-82ad-08524935f918',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    23320, 0, 0, 0,
    0, 0, 0,
    2040.50, 0, 0, 0, 800,
    26160.50, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 25285.50,
    'completed', NOW()
);


--  (63000036)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '5c676fcc-8a66-4c4a-9e4a-9f0cc36e77a3',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '6fb24cf5-7d6f-50bf-a45d-893f879b9bce',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    17620, 0, 0, 0,
    0, 0, 0,
    5065.75, 0, 0, 0, 0,
    22685.75, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 21810.75,
    'completed', NOW()
);


--  (64000046)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '9d1de7ab-0eae-4507-9f55-f5f69e9bf296',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '7413f985-25f9-5031-b2df-bfaf59568792',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    18860, 0, 0, 0,
    0, 0, 0,
    589.38, 0, 0, 0, 800,
    20249.38, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 19374.38,
    'completed', NOW()
);


--  (65000002)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '656ea233-2d28-4b3a-a371-18d5a4bcba8a',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '0e1ccb9a-35e1-5441-b5b7-211ea13f6033',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    22140, 0, 0, 0,
    0, 0, 0,
    1107, 0, 0, 0, 0,
    23247, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 22372,
    'completed', NOW()
);


--  (65000003)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd61e1bf6-eb71-4325-a713-c9ceaa09e8e5',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '1ae6348f-2c52-56ac-86e3-e91579348600',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    22760, 0, 0, 0,
    0, 0, 0,
    284.50, 0, 0, 0, 800,
    23844.50, 0, 0, 0, 0,
    15000, 0.05, 875,
    0, 875, 22969.50,
    'completed', NOW()
);


--  (66000029)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'c4fe6b17-1570-4ccb-9a3f-07a419fcfdbe',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'e812f3c2-feea-5992-b1c7-4fea26c4680a',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15590, 0, 0, 0,
    0, 0, 0,
    3929.98, 0, 0, 0, 0,
    19519.98, 0, 0, 346, 0,
    15000, 0.05, 780,
    0, 1126, 18393.98,
    'completed', NOW()
);


--  (66000035)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '56586a44-3841-4141-96d1-59cc137e70a7',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '51394f04-92ac-5a69-8516-5f7bece30192',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16454, 0, 0, 0,
    0, 0, 0,
    257.09, 0, 0, 0, 3000,
    19711.09, 0, 0, 0, 0,
    15000, 0.05, 823,
    0, 823, 18888.09,
    'completed', NOW()
);


--  (66000104)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'e7d4153a-4a1e-497f-9baf-0d9b86ebed12',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'cc9304a2-77ab-5ae6-80ea-d1830cf2f143',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13000, 0, 0, 0,
    0, 0, 0,
    2681.25, 0, 0, 0, 2800,
    18481.25, 0, 0, 0, 0,
    15000, 0.05, 650,
    0, 650, 20360.25,
    'completed', NOW()
);


--  (67000101)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7cf6809a-1b29-4a67-84a3-120fbabebc8d',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '73826abd-667f-50cf-a372-799e1c0c3f16',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    12500, 0, 0, 0,
    0, 0, 0,
    2656.25, 0, 0, 0, 2800,
    17956.25, 0, 0, 0, 0,
    15000, 0.05, 625,
    0, 625, 17331.25,
    'completed', NOW()
);


--  (67000195)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd5a8a05f-0050-4fdd-9186-056de8a8f67c',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '8dbd9f52-aa10-57d2-842d-fad2a5586455',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    15340, 0, 0, 0,
    0, 0, 0,
    287.62, 0, 0, 0, 2800,
    18427.62, 0, 0, 0, 0,
    15000, 0.05, 767,
    0, 767, 17660.62,
    'completed', NOW()
);


--  (68000015)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'd1a897b0-9cd0-4ec7-8aa9-079c0a889f76',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '94b5eb99-d5f8-5278-a0f1-df3317f4762c',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14290, 0, 0, 0,
    0, 0, 0,
    446.56, 0, 0, 0, 2800,
    17536.56, 0, 0, 0, 0,
    15000, 0.05, 715,
    0, 715, 16821.56,
    'completed', NOW()
);


--  (68000077)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '033c5fa4-c9a1-4960-941a-a712a05429d1',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'dffa9393-9791-5e33-825b-c5584a79b44d',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14210, 0, 0, 0,
    0, 0, 0,
    355.25, 0, 0, 0, 2800,
    17365.25, 0, 0, 0, 0,
    15000, 0.05, 711,
    0, 711, 16654.25,
    'completed', NOW()
);


--  (68000102)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '7c802cf8-13dd-46b8-989e-a5ed6b31e9de',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    'e1bb913d-be36-5415-a8a6-03ee4ee3ada0',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    16180, 0, 0, 0,
    0, 0, 0,
    404.50, 0, 0, 0, 2800,
    19384.50, 0, 0, 0, 0,
    15000, 0.05, 809,
    0, 809, 18575.50,
    'completed', NOW()
);


--  (68000119)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    'ddeaf58a-2591-4f1a-a687-28ea1295ad53',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '23ffc8a9-4fec-58a0-b289-f3a4846c61eb',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13125, 0, 0, 0,
    0, 0, 0,
    1421.88, 0, 0, 0, 2000,
    16546.88, 0, 0, 0, 0,
    15000, 0.05, 656,
    0, 656, 15890.88,
    'completed', NOW()
);


--  (68000145)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '87969114-51c7-4a17-bdd1-92d0b6c3c16f',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '2be66e56-c051-5bc4-96b1-2e10c91d5588',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13060, 0, 0, 0,
    0, 0, 0,
    205, 0, 0, 0, 2000,
    15265, 0, 0, 0, 0,
    15000, 0.05, 653,
    0, 653, 14612,
    'completed', NOW()
);


--  (68000177)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '3b123017-6825-486b-a9fb-056f08b64f09',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '816e33ed-e784-582d-93b7-afe7b35abf3d',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    13000, 0, 0, 0,
    0, 0, 0,
    568.75, 0, 0, 0, 2000,
    15568.75, 0, 0, 0, 0,
    15000, 0.05, 650,
    0, 650, 14822,
    'completed', NOW()
);


--  (68000232)
INSERT INTO payroll_records (
    id, payroll_period_id, employee_id, company_id, year, month,
    base_salary, allowance_position, allowance_transport, allowance_food,
    allowance_phone, allowance_housing, allowance_other,
    ot_amount, ot_hours, bonus, commission, other_income,
    gross_income, deduct_absent, deduct_late, deduct_loan, deduct_other,
    social_security_base, social_security_rate, social_security_amount,
    monthly_tax_withheld, total_deductions, net_salary,
    status, updated_at
)
VALUES (
    '64176f3c-ca5e-44ae-9750-9cd8d247b582',
    (SELECT id FROM payroll_periods WHERE company_id = '03d7debf-d6d9-4b6b-afde-e8e91a3758e5' AND year = 2026 AND month = 2 LIMIT 1),
    '3f9e762a-9573-5803-a799-f409aa7d781b',
    '03d7debf-d6d9-4b6b-afde-e8e91a3758e5',
    2026, 2,
    14000, 0, 0, 0,
    0, 0, 0,
    591.50, 0, 0, 0, 800,
    15391.50, 0, 0, 900, 0,
    15000, 0.05, 677,
    0, 1577, 13814.50,
    'completed', NOW()
);

COMMIT;

-- Import complete: 313 payroll records for Feb 2026