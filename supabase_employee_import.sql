-- ============================================================
-- GOODHR Employee Import Migration
-- Generated from: cleanของจริงพนักงาน.xlsx
-- Date: 2026-03-18
-- KEEPS: SHD-005 (id: 11655ff2-5e7e-4e80-8a26-e910aa257192)
-- ============================================================

BEGIN;

-- ══════════════════════════════════════════════════════════════
-- STEP 1: Clean up old data (keep SHD-005)
-- ══════════════════════════════════════════════════════════════

-- Delete dependent records first (FK cascade might not cover all)
DELETE FROM payroll_records WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM attendance_records WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM leave_requests WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM leave_balances WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM salary_structures WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM work_schedules WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM employee_manager_history WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM overtime_requests WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM time_adjustment_requests WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM notifications WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM employee_loans WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM kpi_forms WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';

-- Delete schedule profiles and shift assignments
DELETE FROM employee_schedule_profiles WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM monthly_shift_assignments WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';

-- Delete offsite requests
DELETE FROM offsite_checkin_requests WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';
DELETE FROM employee_allowed_locations WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';

-- Delete resignation requests
DELETE FROM resignation_requests WHERE employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';

-- Delete users linked to other employees
DELETE FROM users WHERE employee_id IS NOT NULL AND employee_id != '11655ff2-5e7e-4e80-8a26-e910aa257192';

-- Delete employees (except SHD-005)
DELETE FROM employees WHERE id != '11655ff2-5e7e-4e80-8a26-e910aa257192';

-- Clean old reference data that will be replaced
DELETE FROM positions WHERE company_id NOT IN (SELECT id FROM companies);
DELETE FROM departments WHERE company_id NOT IN (SELECT id FROM companies);
DELETE FROM branches WHERE company_id NOT IN (SELECT id FROM companies);


-- ══════════════════════════════════════════════════════════════
-- STEP 2: Upsert Companies
-- ══════════════════════════════════════════════════════════════

INSERT INTO companies (id, code, name_th, name_en, is_active)
VALUES ('a684555a-e44d-4441-9af8-521115cd000a', 'SHD', 'SHD Technology Co., Ltd.', 'SHD Technology Co., Ltd.', true)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name_th=EXCLUDED.name_th, is_active=true;

INSERT INTO companies (id, code, name_th, name_en, is_active)
VALUES ('84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'RABBIT', 'Rabbit Co., Ltd.', 'Rabbit Co., Ltd.', true)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name_th=EXCLUDED.name_th, is_active=true;

INSERT INTO companies (id, code, name_th, name_en, is_active)
VALUES ('a7690b7b-9883-5ac1-b940-db5f13582c7a', 'TOP_ONE', 'Top One Co., Ltd.', 'Top One Co., Ltd.', true)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name_th=EXCLUDED.name_th, is_active=true;

INSERT INTO companies (id, code, name_th, name_en, is_active)
VALUES ('ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'PTC', 'PTC Co., Ltd.', 'PTC Co., Ltd.', true)
ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code, name_th=EXCLUDED.name_th, is_active=true;


-- ══════════════════════════════════════════════════════════════
-- STEP 3: Departments (per company)
-- ══════════════════════════════════════════════════════════════

-- Clean existing departments
DELETE FROM departments WHERE id NOT IN (SELECT DISTINCT department_id FROM employees WHERE department_id IS NOT NULL);

INSERT INTO departments (id, company_id, name, code)
VALUES ('845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายการตลาดออนไลน์', 'ฝ่ายการตลาดออนไลน์')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ฝ่ายการตลาดออนไลน์', 'ฝ่ายการตลาดออนไลน์')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ฝ่ายการตลาดออนไลน์', 'ฝ่ายการตลาดออนไลน์')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายขาย', 'ฝ่ายขาย')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('628922fd-c84a-50e9-b99e-b174bc50e9ff', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ฝ่ายขาย', 'ฝ่ายขาย')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('6130efbf-f715-5e59-8572-f6de5c39203f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'ฝ่ายขาย', 'ฝ่ายขาย')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('99c8eaa2-844a-51fa-afff-f1e43f1a6128', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายคลังสินค้า', 'ฝ่ายคลังสินค้า')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ฝ่ายคลังสินค้า', 'ฝ่ายคลังสินค้า')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('e3f50c8d-04a4-5342-873c-935d623a00c8', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ฝ่ายคลังสินค้า', 'ฝ่ายคลังสินค้า')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ฝ่ายบรการหลังการขาย (เคลม)', 'ฝ่ายบรการหลังการขาย_')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('26ca7534-bd3c-4920-b866-1f3ed620eaac', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายบริหาร', 'ฝ่ายบริหาร')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('38da8e29-65d1-5682-a8b6-dac42cbc972b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ฝ่ายบริหาร', 'ฝ่ายบริหาร')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('5df973f1-9161-59a4-8b41-95f6d3579b8c', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายบัญชี', 'ฝ่ายบัญชี')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('ed055f95-3926-592f-a39e-e2dd9536b264', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ฝ่ายบัญชี', 'ฝ่ายบัญชี')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายบุคคล', 'ฝ่ายบุคคล')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO departments (id, company_id, name, code)
VALUES ('0ff7087e-1a4e-5508-9320-0be8fc2bebc0', 'a684555a-e44d-4441-9af8-521115cd000a', 'ฝ่ายสนับสนุน', 'ฝ่ายสนับสนุน')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;


-- ══════════════════════════════════════════════════════════════
-- STEP 4: Branches
-- ══════════════════════════════════════════════════════════════

DELETE FROM branches WHERE id NOT IN (SELECT DISTINCT branch_id FROM employees WHERE branch_id IS NOT NULL);

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('fe6376f8-801d-4d0b-abed-263bbeaa13a6', 'a684555a-e44d-4441-9af8-521115cd000a', 'ICS Mall', 'ICS_Mall', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('ad969d30-503e-56de-9166-a8dc8e191b77', 'a684555a-e44d-4441-9af8-521115cd000a', 'Ratchadaphisek 8', 'Ratchadaphisek_8', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('e7c08087-65a5-5a9a-9a04-78608d810732', 'a684555a-e44d-4441-9af8-521115cd000a', 'SHD Warehouse', 'SHD_Warehouse', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('2140af71-7f97-57e5-aead-7451c341765f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ICS Mall', 'ICS_Mall', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('b4f82564-eb15-5941-b2cf-bf527ab44673', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Sampeng 2 Soi 3', 'Sampeng_2_Soi_3', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'SHD Warehouse', 'SHD_Warehouse', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('6cba8814-5f13-5eff-ae2d-b9a876484dd5', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Ratchadaphisek 8', 'Ratchadaphisek_8', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('5728df09-8350-5b1b-a56b-83bbfbad44bc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ICS Mall', 'ICS_Mall', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'SHD Warehouse', 'SHD_Warehouse', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('42836a20-2a11-598b-b2f9-e7e243de4c09', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Ratchadaphisek 8', 'Ratchadaphisek_8', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('c1c77169-12d7-550b-9b59-52bb59664700', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anywhere', 'Anywhere', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('a8b5cc03-208b-5a4a-9e14-90b2fd3831f1', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Terminal21 Pattaya', 'Terminal21_Pattaya', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('e172cdbf-1a69-59b8-8687-b3e6921762ff', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Chengmai', 'Central_Chengmai', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('e2cc542b-7d58-55ea-a53f-2ba65ca74217', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Dreame CDS Fashion Island', 'Dreame_CDS_Fashion_Island', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('ded35774-6894-5b81-b083-391f61992abe', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker Fashion Island', 'Anker_Fashion_Island', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('a023fcb8-6cac-5812-8c1a-9ab0b117c36c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Ladprao', 'Central_Ladprao', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('25a95fb7-a785-50fa-b5b1-2c54591aa6ac', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Rama 9', 'Central_Rama_9', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('13d33704-4528-5238-b624-763f6d740bfe', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Pattaya', 'Central_Pattaya', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('ee06b0cf-ee54-5c46-9226-111eb6cbc0be', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Pinklao', 'Central_Pinklao', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('07a8742e-40f8-5929-b0d7-26327383f0bb', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker Central Pinklao', 'Anker_Central_Pinklao', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('484cf2f2-255e-5c04-8b16-56a40e9aad74', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Shop manager', 'Shop_manager', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('24db28a7-6c95-578e-a9c7-666186fa1648', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Dreame Central Rama2', 'Dreame_Central_Rama2', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('cec69ecb-ce16-544f-b981-25f91e193deb', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker Central Dusit Park', 'Anker_Central_Dusit_Park', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('16e46b82-97e7-5fa1-97b4-40c862dd8f45', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Future Park Rangsit', 'Future_Park_Rangsit', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('2eca9aaf-ac6a-5828-980a-31e366bc7e71', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker The mall bangkapi', 'Anker_The_mall_bangkapi', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('8e6f2476-2710-5a83-8746-6fce8f34e603', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker The Mall Ngamwongwan', 'Anker_The_Mall_Ngamwongwan', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('8b808126-2615-5f9f-ac30-957b738bcc31', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Maga Bangna', 'Central_Maga_Bangna', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('817065a2-78c9-58d0-bb23-358ca20b0b36', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Dreame The Mall Ngamwongwan', 'Dreame_The_Mall_Ngamwongwan', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('b59d8328-bc9e-5290-8402-9232b7180726', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Siam TV Chengmai', 'Siam_TV_Chengmai', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('b42e111d-909c-5093-9b99-570aa7af0df9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Dreame Seacon Srinakarin', 'Dreame_Seacon_Srinakarin', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('0033f8d2-2f7b-5ed5-acb5-6716d660c070', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Hashtag Central Westgate', 'Hashtag_Central_Westgate', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('15d9bfd5-935a-531b-baa2-3dc2935eb881', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'SIS Central Westgate', 'SIS_Central_Westgate', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('2b2a91b7-0ab9-5c88-9668-0dba64ea8f40', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker Central Rama9', 'Anker_Central_Rama9', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('3bd4e308-bf3a-5ee4-87d6-29700259b87c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central Eastvile', 'Central_Eastvile', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('6c576a7b-089a-59f0-b6b2-a9f4c04629ee', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Central World', 'Central_World', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('c13eca0a-abc5-5c2a-8295-41b1a1144fdb', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Anker Central world', 'Anker_Central_world', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('c1a947ce-18c5-5afa-b3ce-52c10e916cb2', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Betrand The Mall Bangkapi', 'Betrand_The_Mall_Bangkapi', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '70 Mai รามอินทรา', '70_Mai__________', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('300103da-9a71-5c86-a3ec-3a811db3312d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '70 Mai ท่าพระ', '70_Mai_______', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '70 Mai กาญจนาภิเษก', '70_Mai____________', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO branches (id, company_id, name, code, geo_radius_m, timezone)
VALUES ('0e83183c-58f4-50ae-a0e1-543fac413c00', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '70 Mai สาขาชลบุรี', '70_Mai___________', 200, 'Asia/Bangkok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;


-- ══════════════════════════════════════════════════════════════
-- STEP 5: Positions
-- ══════════════════════════════════════════════════════════════

DELETE FROM positions WHERE id NOT IN (SELECT DISTINCT position_id FROM employees WHERE position_id IS NOT NULL);

INSERT INTO positions (id, company_id, name, code)
VALUES ('18aeafc3-620b-513e-9757-b46d2824e3c2', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Admin Service', 'Admin_Service')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('61c6a643-49b5-54b4-82c2-32dad660eeee', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'PC Event', 'PC_Event')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('210d4ed7-ef4e-530a-b888-bbcc5f4f610b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'PC Supervisor', 'PC_Supervisor')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('200b8d51-d3f6-5c9e-af63-5402893072b3', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'เจ้าหน้าที่บัญชีเจ้าหนี้อาวุโส', '______________________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('842f16a5-0ba7-5b8e-95b4-94d9da620bc8', 'a684555a-e44d-4441-9af8-521115cd000a', 'Admin Brand shop', 'Admin_Brand_shop')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('82861dc6-685d-5bd0-95b8-4ae4061240d8', 'a684555a-e44d-4441-9af8-521115cd000a', 'Admin Support', 'Admin_Support')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('eff4fb8e-7f24-585c-bd6d-ecb4b350e806', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Admin Tiktok', 'Admin_Tiktok')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('b18a59eb-a086-53aa-9326-b0122461da6b', 'a684555a-e44d-4441-9af8-521115cd000a', 'Admin online manager', 'Admin_online_manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('a3b2824d-615a-5f45-af04-5190e9e17be0', 'a684555a-e44d-4441-9af8-521115cd000a', 'AdminE-commerce', 'AdminE_commerce')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('95ca746b-f7b7-5ba7-9c82-30f383bd431e', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Ads Optimizer', 'Ads_Optimizer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('86206982-da93-52b3-9021-65c8af458eec', 'a684555a-e44d-4441-9af8-521115cd000a', 'Assistant  GTM', 'Assistant__GTM')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('cae3a84c-324f-500a-bf62-a338c5a866e1', 'a684555a-e44d-4441-9af8-521115cd000a', 'Assistant Accounting Manager', 'Assistant_Accounting_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('9dff4f0e-73a4-5f34-822e-7ca5b5959a0d', 'a684555a-e44d-4441-9af8-521115cd000a', 'Assistant Brand Shop Manager', 'Assistant_Brand_Shop_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('5edcf90e-3761-53c9-9d92-d922a95195d9', 'a684555a-e44d-4441-9af8-521115cd000a', 'Assistant Brand shop', 'Assistant_Brand_shop')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('7642d82b-d09d-5eed-ab78-04afb57c2c16', 'a684555a-e44d-4441-9af8-521115cd000a', 'Assistant Project Manager', 'Assistant_Project_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('78c2ecff-d5b9-5756-ac93-37e136914e46', 'a684555a-e44d-4441-9af8-521115cd000a', 'Automotive Dealer Manager', 'Automotive_Dealer_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('d6ef68ab-83a4-5963-b52a-b1003a195934', 'a684555a-e44d-4441-9af8-521115cd000a', 'Brand shop manager', 'Brand_shop_manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('8a43b1e1-6808-5310-bc06-bb0fe0159bcc', 'a684555a-e44d-4441-9af8-521115cd000a', 'Business  Development  Manager', 'Business__Development__Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('bc64dc0c-ce95-5890-9748-f26ab1dd54e3', 'a684555a-e44d-4441-9af8-521115cd000a', 'Channel Manager', 'Channel_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('724cac40-c102-588d-aa51-23052f207e4c', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Chief Sales Officer', 'Chief_Sales_Officer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('6cf792d7-d44d-5430-bf58-10bd326fb927', 'a684555a-e44d-4441-9af8-521115cd000a', 'Chinese translator', 'Chinese_translator')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('95b9c9f3-a3fe-51e2-84bd-0e6dd2799567', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Chinese translator', 'Chinese_translator')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('7b8deaf1-e9aa-5585-abb4-2cd1ee5c1bae', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Content  and  Event  Manager', 'Content__and__Event__Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('acde04cb-da1f-555a-a566-765a5ae784c3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Content and Video Editor', 'Content_and_Video_Editor')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('99da1164-7269-564a-9680-b76dbb91f95d', 'a684555a-e44d-4441-9af8-521115cd000a', 'Data Analyst', 'Data_Analyst')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('2494cd98-bdc9-5587-904b-eadfcfa3fbd0', 'a684555a-e44d-4441-9af8-521115cd000a', 'Data Engineer', 'Data_Engineer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('15037a03-81a4-5749-9f75-f0b15695157c', 'a684555a-e44d-4441-9af8-521115cd000a', 'Designer', 'Designer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('5dd16114-dd66-546c-b49c-fc993269ae4a', 'a684555a-e44d-4441-9af8-521115cd000a', 'Digital Marketing', 'Digital_Marketing')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c0fd518b-80d8-5f78-b931-5dfa77653b38', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Digital Marketing', 'Digital_Marketing')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('fc128aab-1f04-526d-b26d-5731d4290adf', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Digital Marketing supervisor', 'Digital_Marketing_supervisor')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('ad41f88d-d33a-5736-b3fb-2d2f54cc6409', 'a684555a-e44d-4441-9af8-521115cd000a', 'Director', 'Director')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('6468a153-9684-50db-90d6-ed699eb416fb', 'a684555a-e44d-4441-9af8-521115cd000a', 'E-Commerce Analyst', 'E_Commerce_Analyst')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('aa766175-9108-5f20-94ec-c93454e6d205', 'a684555a-e44d-4441-9af8-521115cd000a', 'Graphic Designer', 'Graphic_Designer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('451e1dc1-89c2-5ba1-9d3d-f3c977ddb719', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Graphic Designer (Dreame)', 'Graphic_Designer__Dreame_')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('f17c1393-858a-57d4-ae71-8573242c79fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Graphic Desiner', 'Graphic_Desiner')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('4b03c15d-ac90-57fc-b8b7-ede7fbd83ca4', 'a684555a-e44d-4441-9af8-521115cd000a', 'HC of China', 'HC_of_China')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('d83c5480-0877-5273-87d1-dd5d7d8cabfc', 'a684555a-e44d-4441-9af8-521115cd000a', 'HR Officer', 'HR_Officer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('bbeefcac-d206-5fb3-85f0-fccfd23c0b92', 'a684555a-e44d-4441-9af8-521115cd000a', 'HR Recruitment', 'HR_Recruitment')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('a94ac1a5-7631-55a4-adda-4ae0bdb330ca', 'a684555a-e44d-4441-9af8-521115cd000a', 'HR payroll', 'HR_payroll')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('17f02b7c-9810-5594-8f15-4ab799e2f83b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Head Sale Offline', 'Head_Sale_Offline')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('5fe4252a-56a5-59c5-8da3-81f341d350f4', 'a684555a-e44d-4441-9af8-521115cd000a', 'Human resources manager', 'Human_resources_manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c06d105f-4483-5966-aa34-b4442fcd5bab', 'a684555a-e44d-4441-9af8-521115cd000a', 'IT Support', 'IT_Support')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('2338b189-186b-5bf5-a393-916bd80ee693', 'a684555a-e44d-4441-9af8-521115cd000a', 'Junior Payroll', 'Junior_Payroll')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('2d0600f8-4532-5614-b9a3-8625deb125e2', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'KOL Service', 'KOL_Service')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c8915c06-9ab8-59dd-b1b6-ef316eac213b', 'a684555a-e44d-4441-9af8-521115cd000a', 'Key Account ( sale - offline )', 'Key_Account___sale___offline__')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('a74da548-394b-5cd1-8f33-3d3238ae70c2', 'a684555a-e44d-4441-9af8-521115cd000a', 'Key Account Management', 'Key_Account_Management')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('93b5bfce-5273-5b37-b99b-2ebc1c2c9fee', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Key Account Management', 'Key_Account_Management')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('101cd731-b8b3-5c0f-abbf-3688666fad42', 'a684555a-e44d-4441-9af8-521115cd000a', 'Key Account Manager', 'Key_Account_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c33c01be-8ca2-597c-857f-5559107270b5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'MC Live Streaming', 'MC_Live_Streaming')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('2001275e-1df4-578e-b8d0-f13c7823fb9f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Marketting Team Lead', 'Marketting_Team_Lead')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c9787d19-d00d-56bc-a62e-4db80986b59d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Offline Marketing', 'Offline_Marketing')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('41081ae7-048a-58ce-a65a-04f3b3ea03c6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Photographer & Videographer', 'Photographer___Videographer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('4b517e4e-5d8c-52c2-a24e-3fc677c3b209', 'a684555a-e44d-4441-9af8-521115cd000a', 'Product  Specialist', 'Product__Specialist')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('d1bd9606-ec95-5d03-87fd-494237be2c6e', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Product Consultant (PC)', 'Product_Consultant__PC_')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('bd670d39-fb54-543c-937a-4d9d415dab53', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Quality Control (QC)', 'Quality_Control__QC_')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('d77a6c1b-db84-53d4-9208-b17373074de8', 'a684555a-e44d-4441-9af8-521115cd000a', 'Retail Marketing & Event', 'Retail_Marketing___Event')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('a1b6ce6c-2f8c-57fd-95d9-efa75e9e07e0', 'a684555a-e44d-4441-9af8-521115cd000a', 'Retail Support', 'Retail_Support')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('561f72ab-995c-5684-899e-2518070dac93', 'a684555a-e44d-4441-9af8-521115cd000a', 'Sale Coordinator', 'Sale_Coordinator')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('22da91e8-1eb7-503d-bf27-ea11f313a02d', 'a684555a-e44d-4441-9af8-521115cd000a', 'Sales Representative', 'Sales_Representative')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('a357856b-cff7-5828-973d-bf9480546b2d', 'a684555a-e44d-4441-9af8-521115cd000a', 'Sell-out Performance Executive', 'Sell_out_Performance_Executive')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('ea64e6b9-c5f8-5784-8d98-a69cc1ef2bed', 'a684555a-e44d-4441-9af8-521115cd000a', 'Senior 3D graphic designer and construction', 'Senior_3D_graphic_designer_and')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('e730c179-a4ed-5349-9132-afa3a225d214', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Senior Graphic Desiner', 'Senior_Graphic_Desiner')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('66670de9-1a53-5592-8ee0-05dc2f70abe8', 'a684555a-e44d-4441-9af8-521115cd000a', 'Senior Key Account', 'Senior_Key_Account')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('126cd19d-d518-5529-8388-6ba2f1bbed5e', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Senior MC Live Streaming (TIKTOK)', 'Senior_MC_Live_Streaming__TIKT')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('7266ba0d-caf4-5212-800a-d3d79345aa9b', 'a684555a-e44d-4441-9af8-521115cd000a', 'Team Lead Key Account Management', 'Team_Lead_Key_Account_Manageme')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('292dc9ea-3ba4-589d-bb52-ad96a92d6414', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'Team Technician 70 Mai', 'Team_Technician_70_Mai')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('d707223b-218b-5025-a5b0-4a90d98f882b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'Technical', 'Technical')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c4a44e60-7d78-5e1b-9aad-9b280e8d68a7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Tele sale', 'Tele_sale')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('53cc60a6-9d62-5218-b562-5964fdfe8b66', 'a684555a-e44d-4441-9af8-521115cd000a', 'Trade marketing Support', 'Trade_marketing_Support')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('4eabedf2-7783-5815-a588-a31baa939ca4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'Video Editor', 'Video_Editor')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('a5eaf3fc-0cc7-546a-807a-6960a26f5368', 'a684555a-e44d-4441-9af8-521115cd000a', 'Warehouse Manager', 'Warehouse_Manager')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('efc309aa-6778-5d49-a195-62074996d00a', 'a684555a-e44d-4441-9af8-521115cd000a', 'Web Designer', 'Web_Designer')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('04fb514f-9556-533d-8627-c672df09b7be', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'คนขับรถ', '_______')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('e347cad3-32cc-5d85-8595-268d594001e9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'ช่างติดตั้งกล้องประจำร้าน 70mai', '__________________________70ma')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('7e39db0e-5c27-5441-941e-4c9b776d33fc', 'a684555a-e44d-4441-9af8-521115cd000a', 'นักศึกษาฝึกงาน', '______________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('34fe534e-5287-5c1f-8b2e-0db5d0c96944', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'บริหาร', '______')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('80220d20-0283-5d6a-ad56-279ea30c8331', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'ผู้จัดการคลังสินค้า', '___________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('336bb825-35ca-5cc8-a74b-aad30ffd48d7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'พนักงานคลังสินค้า', '_________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('c910955a-eb0d-5f18-a444-34cd45c8ba00', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'พนักงานแพ็คสินค้า', '_________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('9823e0d0-f9a6-5bfc-ac39-b1df496b204b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'หัวหน้าคลังสินค้า', '_________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('6da73601-a4e2-5d1d-8491-4275067424ac', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'หัวหน้าทีมจัดสินค้า', '___________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('bf22341b-66e3-5eda-95ab-4179b49c9e67', 'a684555a-e44d-4441-9af8-521115cd000a', 'หัวหน้าทีมบัญชี GL', '________________GL')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('939e472f-b95a-572e-aae2-248ef77a2ba9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'หัวหน้าธุรการ', '_____________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('65b53cdc-a37b-5dc4-965e-c1ce1e5bfca9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'หัวหน้าแอดมินคลังสินค้า', '_______________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'เจ้าหน้าที่ บัญชี', '_________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('8267c998-3b18-5311-981b-2ed9102c8399', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'เจ้าหน้าที่แอดมินออนไลน์', '________________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('bfcc2725-0978-52ce-a140-57e1a71de410', 'a684555a-e44d-4441-9af8-521115cd000a', 'แม่บ้าน', '_______')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('598e95c5-e0fe-50ec-a73c-b6a400618456', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'แอดมินคลังสินค้า', '________________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;

INSERT INTO positions (id, company_id, name, code)
VALUES ('799179f4-885a-55ec-b7d9-ed4c2436ac6d', 'a684555a-e44d-4441-9af8-521115cd000a', 'ไม่ระบุตำแหน่ง', '______________')
ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, company_id=EXCLUDED.company_id;


-- ══════════════════════════════════════════════════════════════
-- STEP 6: Shift Templates
-- ══════════════════════════════════════════════════════════════

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('cfe1350d-0121-56f0-92d1-aed5daa0a80c', 'a684555a-e44d-4441-9af8-521115cd000a', '09:00-18:00', 'normal', '09:00:00', '18:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('4506ce1a-cfbe-5014-b442-33f2b918e3ec', 'a684555a-e44d-4441-9af8-521115cd000a', '11:00-20:00', 'normal', '11:00:00', '20:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('df110651-9d4f-57d7-9262-1cb4bd553f12', 'a684555a-e44d-4441-9af8-521115cd000a', '15:30-00:30', 'normal', '15:30:00', '00:30:00', 60, true, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('0c44f790-f10f-581b-8175-600276b9c765', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '09:00-18:00', 'normal', '09:00:00', '18:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('1b967086-55a2-5488-8ed3-c2de5601e73b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '11:00-20:00', 'normal', '11:00:00', '20:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('cb2e9b13-e4aa-5d5e-bcff-6d87b9f34fe1', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '15:30-00:30', 'normal', '15:30:00', '00:30:00', 60, true, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('b569cc17-5d5c-5680-a9ba-a01c2ed0c8d8', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '09:00-18:00', 'normal', '09:00:00', '18:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('f0be866b-5be8-5483-8c00-201a181b178b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '11:00-20:00', 'normal', '11:00:00', '20:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('1733e875-d024-5351-b3ce-2fc507fe78a5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '15:30-00:30', 'normal', '15:30:00', '00:30:00', 60, true, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('0e7629dd-9812-5b02-b52a-eee97b237c63', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '09:00-18:00', 'normal', '09:00:00', '18:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('67b24297-b202-5d65-ba9e-ec34e9019280', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '11:00-20:00', 'normal', '11:00:00', '20:00:00', 60, false, 30)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shift_templates (id, company_id, name, shift_type, work_start, work_end, break_minutes, is_overnight, ot_start_after_minutes)
VALUES ('b0b6195f-6b99-5ce4-b541-114de3d834d7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '15:30-00:30', 'normal', '15:30:00', '00:30:00', 60, true, 30)
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════════════════════════
-- STEP 7: Insert Employees (327 people)
-- ══════════════════════════════════════════════════════════════

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1fc1c300-7a04-55f6-af90-7a85bdb89621', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '26ca7534-bd3c-4920-b866-1f3ed620eaac', 'ad41f88d-d33a-5736-b3fb-2d2f54cc6409',
  '67000124', 'YALING', 'CHEN', 'YALING', 'CHEN',
  NULL, NULL, '0968237327', 'female', '168 อาคารไอซีเอส ชั้น 7 ห้อง 7 เจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร',
  '0991027076396', '1993-06-04', '2024-06-20', '2024-10-18',
  'SCB', '434-1-89266-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '26ca7534-bd3c-4920-b866-1f3ed620eaac', '8a43b1e1-6808-5310-bc06-bb0fe0159bcc',
  '68000254', 'กฤติณภัทร', 'โตม่วง', 'Kittinapat', 'Tomuang',
  'เอ็กซ์ต้า', 'extratomuang@gmail.com', '0924544446', 'male', '9/245 ถ.จรัญสนิทวงศ์ แขวงบางอ้อ เขตบางพลัด กรุงเทพมหานคร',
  '1100500369604', '1989-10-18', '2026-02-02', '2026-05-31',
  'SCB', '202-2-45818-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5bc1ff1c-0228-580e-b9ac-69f60d749f70', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '26ca7534-bd3c-4920-b866-1f3ed620eaac', '4b03c15d-ac90-57fc-b8b7-ede7fbd83ca4',
  'Chinese-002', 'XIN', 'LI', 'XIN', 'LI',
  NULL, 'axin@shd-technology.co.th', '0994699920', 'female', '168 อาคารไอซีเอส ชั้น 7 ห้อง 7 เจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร',
  '1111111111111', '1999-07-03', '2024-11-06', '2024-11-06',
  'SCB', '156-4-47248-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e189e7d0-c010-55e8-ba56-99dfb8dbb106', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '26ca7534-bd3c-4920-b866-1f3ed620eaac', 'ad41f88d-d33a-5736-b3fb-2d2f54cc6409',
  '64000075', 'CHEN', 'JINBIAO', NULL, NULL,
  'อากิมบิว', NULL, NULL, 'male', NULL,
  '0991012015108', '1991-02-22', '2022-12-13', '2023-04-12',
  'SCB', '120-2-53589-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bd592ab4-f6a5-56da-8c9f-e16855727c08', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '26ca7534-bd3c-4920-b866-1f3ed620eaac', '8a43b1e1-6808-5310-bc06-bb0fe0159bcc',
  '68000140', 'กันตา', 'วรเพียรกุล', 'Kanta', 'Woraphiankul',
  'แอปเปิ้ล', 'apple.kanta@shd-technology.co.th', NULL, 'female', NULL,
  '1103700871403', '1992-09-02', '2025-08-27', '2025-12-24',
  'SCB', '212-2-18738-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e33a24bf-f250-54bc-8b3e-0eaf4fe62547', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '66000134', 'ปาณิสรา', 'ศรีวงษ์', 'Panisara', 'Sriwong',
  'บิ๊ว', 'panisara.bty@gmail.com', '0911911917', 'female', '4 ซ.เลียบฯ ฝั่งเหนือ 22 แยก 1 แขวงหนองแขม เขตหนองแขม กรุงเทพมหานคร 10160',
  '1102002757311', '1997-05-13', '2023-11-16', '2024-03-15',
  'SCB', '212-2-18738-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '547d54e5-3b9c-5074-b8ff-7a70c029da58', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '66000015', 'ธันยธรณ์', 'จักรไพศาล', 'TUNYATORN', 'JAKPAISAN',
  'ฟรังค์', 'Tunyafrung.jak@gmail.com', '0644146147', 'female', '84 ซ.ม.พุดตาน ถ.มาเจริญ แขวงหนองแขม เขตหนองแขม กรุงเทพมหานคร 10160',
  '1120300093117', '1999-05-24', '2023-02-13', '2023-06-13',
  'SCB', '120-2-53589-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4cd519ef-216a-5a5b-8a80-3fcd0e85d777', 'a684555a-e44d-4441-9af8-521115cd000a', 'ad969d30-503e-56de-9166-a8dc8e191b77', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'b18a59eb-a086-53aa-9326-b0122461da6b',
  '62000002', 'วรินทร', 'หลวงปัน', 'VARINTRON', 'HLANGPAN',
  'ฝน', 'Varintornn29@gmail.com', '0968366862', 'female', '90 หมู่ที่ 2 ตำบลแม่ลอย อำเภอเทิง จังหวัดเชียงราย 57230',
  '2570400022020', '1986-06-04', '2019-03-01', '2019-05-31',
  'SCB', '352-2-54062-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '87f33a2c-4186-5d58-824d-71754a1981fc', 'a684555a-e44d-4441-9af8-521115cd000a', 'ad969d30-503e-56de-9166-a8dc8e191b77', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '66000155', 'พุฒิพงศ์', 'ศรีศุภวัฒนะ', 'Puttiphong', 'Srisupawattana',
  'อมร', 'puttiphong.sri@gmail.com', '0834229961', 'male', '24 ซ.จันทร์ 34/2 แขวงทุ่งวัดดอน เขตสาทร กรุงเทพมหานคร 10120',
  '1100700699136', '1987-09-02', '2024-01-03', '2024-05-02',
  'SCB', '031-4-09817-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '505100f5-e973-5189-9fdd-ade03c5a9d65', 'a684555a-e44d-4441-9af8-521115cd000a', 'ad969d30-503e-56de-9166-a8dc8e191b77', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'aa766175-9108-5f20-94ec-c93454e6d205',
  '64000108', 'เบญญาภา', 'พวงปัญญา', 'BENYAPA', 'POUNGPUNYA',
  'เบญ', 'balenjajo19@gmail.com', '0919900316', 'female', '230/9 ถ.นเรศ แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500',
  '1100702442892', '1996-12-19', '2021-12-01', '2022-03-31',
  'SCB', '162-4-11659-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e098f35b-7b09-5c1d-9542-1b158aed1702', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '63000009', 'ณัฐวดี', 'อนุภาพ', 'NATTAWADEE', 'ANUPAP',
  'ติ๊ดตี่', 'teewadee@gmail.com', '0817733831', 'female', '225 ซ.เพชรเกษม 69 แยก 7 แขวงหลักสอง เขตบางแค กรุงเทพมหานคร 10160',
  '1103700420304', '1991-04-01', '2020-04-01', '2020-07-01',
  'SCB', '120-2-53747-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd219c41b-264d-5125-a1a1-84e81e7cb20f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '64000109', 'รัตนา', 'สุดตัง', 'RATTANA', 'SUDTANG',
  'แบม', 'bam.rattana@shd-technology.co.th', '0822931772', 'female', '176/16 ตำบลหินกอง อำเภอสุวรรณภูมิ จังหวัดร้อยเอ็ด 45130',
  '1459900460299', '1995-02-06', '2021-12-01', '2022-03-31',
  'SCB', '438-1-12380-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '87b3c2cf-1067-5a7e-b717-7b5ea4000c53', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a3b2824d-615a-5f45-af04-5190e9e17be0',
  '66000059', 'วิภา', 'เอมสรรค์', 'Wipa', 'Emsan',
  'กิ๊ฟ', 'giftwipa@gmail.com', '0988515571', 'female', '38 ม.3 ตำบลกุดจอก อำเภอหนองมะโมง จังหวัดชัยนาท 17120',
  '1100702647435', '1998-01-17', '2023-05-29', '2023-09-26',
  'SCB', '407-1-15475-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5dc95722-7b21-5c28-b14d-406a6de0bb26', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', '7266ba0d-caf4-5212-800a-d3d79345aa9b',
  '66000085', 'บุศรา', 'วราฤทธิชัย', 'Busara', 'Waralittichai',
  'โบ', 'busarawara@gmail.com', '0894959904', 'female', '619/272 ถ.อนามัยงามเจริญ แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '1103300105631', '1993-08-31', '2023-07-26', '2023-11-23',
  'SCB', '235-2-35087-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '798d04af-f201-544d-b3d6-d77ae68ec6b2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '67000043', 'หทัยรัตน์', 'แก้วโสภานิมิต', 'Hatairat', 'Kaewsoparnimit',
  'ป๊อบ', 'Hatairat.k33@gmail.com', '0616633989', 'female', '5 ซอยสีม่วงอนุสรณ์ แขวงรัชดาภิเษก เขตดินแดง กรุงเทพมหานคร 10400',
  '1104000025918', '1999-03-03', '2024-03-18', '2024-07-16',
  'SCB', '418-1-84272-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b68624a5-e13f-52d4-99cc-2d577b9835e2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '67000044', 'ศรุตยา', 'สงวนวงศ์', 'Saruttaya', 'Sanguanwong',
  'เนท', 'Saruttaya.s39@gmail.com', '0959261144', 'female', '86/6 ม.10 ตำบลบางม่วง อำเภอบางใหญ่ จังหวัดนนทบุรี 11140',
  '1102002625384', '1996-09-14', '2024-03-18', '2024-07-16',
  'SCB', '235-2-43622-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '67000058', 'ระวีวรรณ', 'วิริยะธรรมสาร', 'Raveewan', 'Wiriyatammasarn',
  'เบล', 'Raveewan.wiriya@gmail.com', '0873696596', 'female', '2220/6 ถ.ข้าวหลาม แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100',
  '1219900452450', '1994-08-14', '2024-04-22', '2024-08-20',
  'SCB', '413-0-62458-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3ff757f7-d102-5b85-9c7b-716f3d5d256f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', '6468a153-9684-50db-90d6-ed699eb416fb',
  '67000111', 'กัญญาณัฐ', 'ขำสัจจา', 'Kanyanut', 'Kamsatja',
  'น้ำทิพย์', 'kkanyanut.08@gmail.com', '0949648616', 'female', '81 ซ.พระรามที่2 ซอย44 แยก 3 แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '1749900632666', '1998-10-08', '2024-06-26', '2024-10-24',
  'SCB', '769-2-70427-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f9fab60d-d405-5691-9251-2651a4459ff9', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', '6468a153-9684-50db-90d6-ed699eb416fb',
  '67000144', 'ธนัญญา', 'ทองพิมพ์', 'Thananya', 'Thongpim',
  'แป้ง', 'thananya.tho@gmail.com', '0884803607', 'female', '89 หมู่ที่ 7 ตำบลนาสะไม อำเภอตระการพืชผล จังหวัดอุบลราชธานี 34130',
  '1341100321174', '1998-03-06', '2024-08-01', '2024-11-28',
  'SCB', '324-4-18770-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '67000235', 'ชนิสรา', 'เลิศจตุพร', 'Chanisara', 'Lertjatuporn',
  'แป้ง', 'pang.lertjatu@gmail.com', '0958653963', 'female', '7 ซ.สวนสยาม 6 แยก 4 แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร 10230',
  '1809900720661', '1996-07-03', '2025-01-13', '2025-05-13',
  'SCB', '409-0-14085-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '37165ccc-a53f-50bf-af12-f069ce27e138', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '68000183', 'ธัญญนันต์', 'เสริมสายประสิทธิ์', 'Tanyanan', 'Seamsaiprasit',
  'ฟิว', 'fewforyou@hotmail.com', '0831178086', 'female', '5/34 ซอยวิฑูรย์ดำริ 9 ถนนวิฑูรย์ดำริ ตำบลบ้านบึง อำเภอบ้านบึง จังหวัดชลบุรี 20170',
  '1209501093031', '1997-07-13', '2025-12-01', '2026-03-30',
  'SCB', '245-2-12551-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '54eeadd4-2edb-5c16-935c-584e2da41515', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'a74da548-394b-5cd1-8f33-3d3238ae70c2',
  '68000190', 'ณรงค์ศักดิ์', 'ต้นทอง', 'Narongsak', 'Tonthong',
  'เอ็มฟิน', 'Narongsak.tont@gmail.com', '0804467777', 'male', '8/110 ถ.รัชดา-รามอินทรา แขวงรามอินทรา เขตคันนายาว กรุงเทพมหานคร 10230',
  '1341500274661', '1997-04-08', '2025-11-03', '2026-03-02',
  'SCB', '206-4-25622-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a2981567-26e5-5f8c-a3ce-9853f660b533', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '66670de9-1a53-5592-8ee0-05dc2f70abe8',
  '66000158', 'กิ่งแก้ว', 'ศรีโยหะ', 'Gingkaew', 'Sriyoha',
  'นิว', 'new00gingkeaw@gmail.com', '0961419111', 'female', '195 ม.4 ตำบลมุกดาหาร อำเภอเมืองมุกดาหาร จังหวัดมุกดาหาร 49000',
  '1499900182191', '1994-09-08', '2024-01-03', '2024-05-02',
  'SCB', '404-2-29637-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8429e766-c22a-5c55-b79d-9628732e3879', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'd6ef68ab-83a4-5963-b52a-b1003a195934',
  '66000123', 'พิพัชร์', 'ธรรมการฐิติคุณ', 'Pipat', 'thammakarnthitikhun',
  'เล็ก', 'lekpipat@gmail.com', '0861055555', 'male', '29 ถนนประชาอุทิศ แขวงบางมด เขตทุ่งครุ กรุงเทพมหานคร 10140',
  '3100400258505', '1969-02-04', '2023-10-11', '2024-02-08',
  'SCB', '216-2-00999-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2bcc724a-136a-5e75-ae22-e2a3471e8a41', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '5edcf90e-3761-53c9-9d92-d922a95195d9',
  '66000127', 'ธนดล', 'วรงค์สิงหรา', 'Tanadol', 'Warongsinghara',
  'ม่อน', 'tanadolvr@gmail.com', '0632469556', 'male', '59/161 หมู่บ้านโฮมเพลสเดอะพาร์ค ถนนบางกรวย-ไทรน้อย ตำบลบางเลน อำเภอบางใหญ่ จังหวัดนนทบุรี 11140',
  '3100400796027', '1973-11-12', '2023-11-01', '2024-02-29',
  'SCB', '197-2-00215-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd5379adf-9d35-535a-9099-98eda97ab38f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '78c2ecff-d5b9-5756-ac93-37e136914e46',
  '65000045', 'ภัฏ', 'ทองใหม่', 'PHAT', 'TONGMAI',
  'เดี่ยว', 'phattong1@gmail.com', '0818054484', 'male', '52/100 ถ.เฉลิมพระเกียรติ ร.๙ แขวงประเวศ เขตประเวศ กรุงเทพมหานคร 10250',
  '3800400391225', '1979-08-02', '2022-08-08', '2022-12-06',
  'SCB', '175-2-22367-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '58fdab55-3165-5db1-a465-d26991330ec5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '22da91e8-1eb7-503d-bf27-ea11f313a02d',
  '66000153', 'เสาวลักษณ์', 'เปรมปรุงวิทย์', 'Saowalak', 'Premprungwit',
  'ปิง', 'pingyul@hotmail.com', '0903356091', 'female', '102 ถ.ธรรมสิทธิ์เสนา(ฆ) ตำบลเสนา อำเภอเสนา จังหวัดพระนครศรีอยุธยา 13110',
  '1100800747922', '1991-12-28', '2024-01-03', '2024-05-01',
  'SCB', '162-4-12683-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2b405200-f740-57ad-a488-756ce95fb5d5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '22da91e8-1eb7-503d-bf27-ea11f313a02d',
  '67000087', 'ธนเมศฐ์', 'เลิศสิริสกุลสุข', 'Thanamet', 'Lertsirisakulsuk',
  'โฟล์ค', 'folk2speed@gmail.com', '0891102293', 'male', '19/59 ซ.รามคำแหง 2 ซอย 23 แยก 7 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
  '3100700976772', '1980-06-27', '2024-06-04', '2024-10-02',
  'SCB', '278-2-36750-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5d01aff0-34a5-5039-be00-90fd212a84c8', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '68000047', 'ธีรพัฒน์', 'นุตเจริญกุล', 'Teeraphat', 'Nutcharoenkul',
  'เต้ย', 'sale999.toei@gmail.com', '0917849937', 'male', '106 ถ.เจิดจอมพล ตำบลศรีราชา อำเภอศรีราชา จังหวัดชลบุรี 20110',
  '1209700727978', '1997-02-11', '2025-03-17', '2025-07-15',
  'SCB', '411-0-51158-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '68000244', 'ศุภศิษฎิ์', 'สุวรรณอนุรังสี', 'Suphasit', 'Suwananurangsee',
  'โบ๊ท', 'suphasitboat@gmail.com', '0630066657', 'male', NULL,
  '3101801180923', '1980-11-23', '2026-01-05', '2026-05-04',
  'SCB', '160-2-93396-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0baae162-2014-529f-880f-2624bc8a7fa5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '22da91e8-1eb7-503d-bf27-ea11f313a02d',
  '69000012', 'วรัญญา', 'ยั่งยืน', NULL, NULL,
  'น้ำตาล', 'warunya.yangyuen@gmail.com', NULL, 'female', NULL,
  '1101600031487', '1994-06-18', '2026-02-10', '2026-06-09',
  'SCB', '344-2-49321-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5eded7cf-84e9-57fd-b8b0-c3923d7edd34', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '22da91e8-1eb7-503d-bf27-ea11f313a02d',
  '69000014', 'ปรียาวรรณรัฌ', 'พุดพิมเสน', NULL, NULL,
  'โบ', 'for.get_me.not@hotmail.com', NULL, 'female', NULL,
  '3110400090914', '1983-05-31', '2026-02-02', '2026-02-02',
  'SCB', '337-4-02236-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b41547ed-4e66-5789-ac51-1dfb787e3876', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'c8915c06-9ab8-59dd-b1b6-ef316eac213b',
  '67000186', 'ฉัฐนันท์', 'อารีเพิ่มพร', 'Chatthanan', 'Areepermporn',
  'ทรายแก้ว', 'saikaew.nu@gmail.com', '0640454624', 'female', '288/31 ซ.ประชาอุทิศ 33 แขวงบางมด เขตทุ่งครุ กรุงเทพมหานคร 10140',
  '1480700093367', '1990-08-17', '2024-09-26', '2025-01-21',
  'SCB', '407-9-29182-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ea90425f-ca79-50fc-b7ac-9a29f649f225', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'c8915c06-9ab8-59dd-b1b6-ef316eac213b',
  '68000008', 'วิชัย', 'เขียวไข่กา', 'Wichai', 'Khieawkhaika',
  'โอ๊ต', 'Wichai Khieawkhaika', '0922469019', 'male', '666 หมู่ที่ 12 ตำบลต้นธงชัย อำเภอเมืองลำปาง จังหวัดลำปาง 52000',
  '1101800072110', '1985-02-15', '2025-01-14', '2025-05-14',
  'SCB', '162-4-25955-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8c7ae749-bd6a-5e65-9601-8b6ae73381ea', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '68000097', 'ชัยเมธ', 'วรรธนเศรณี', 'Chaiyameth', 'Watanaseranee',
  'แบร์รี่', 'chaimeth.barry@gmail.com', '0626615656', 'male', '267/99 ถนนเทศบาล 4 ตำบลปากเพรียว อำเภอเมืองสระบุรี จังหวัดสระบุรี 18000',
  '1199900291872', '1991-09-07', '2025-07-14', '2025-11-09',
  'SCB', '156-4-45042-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'd6ef68ab-83a4-5963-b52a-b1003a195934',
  '68000158', 'กวิน', 'เอกอรัญพงศ์', 'Kawin', 'Ekarunpong',
  'บอล', 'Kawin.ekarunpong@gmail.com', '0955249395', 'male', NULL,
  '1100801167971', '1996-10-24', '2025-10-06', '2026-02-02',
  'SCB', '438-0-78396-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'da89221c-cacf-58c8-b46c-1292f3a8956e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'd77a6c1b-db84-53d4-9208-b17373074de8',
  '68000162', 'พัชรเดช', 'ทาสะหลี', 'Phatcharadet', 'Thasalee',
  'ดุ๊ก', 'medook2534@gmail.com', '0641744040', 'male', NULL,
  '1639800110294', '1991-05-14', '2025-10-01', '2026-01-28',
  'SCB', '278-2-41745-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e9631ebd-681e-5305-b1d4-101405f39833', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'a357856b-cff7-5828-973d-bf9480546b2d',
  '68000172', 'วิภาวี', 'เดชจุ้ย', 'vipawee', 'Dechjui',
  'วี', 'vipawee.dec@gmail.com', NULL, 'female', '88 หมู่ที่ 3 ตำบลบางครุ อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1100200782336', '1992-11-13', '2025-11-17', '2026-03-16',
  'SCB', '366-4-36792-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7318811e-5e85-56f7-abe0-707e832578bb', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '68000188', 'ช่อผกา', 'เศรษฐการวิจิตร', 'Chorpaka', 'Setthakanwijit',
  'ข้าวโอ๊ต', 'Chorpaka.oat@gmail.com', '0969646446', 'female', NULL,
  '1103700729836', '1992-03-02', '2025-11-03', '2026-03-02',
  'SCB', '407-4-69914-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '00aac6c6-27fd-51ca-93f1-9f40deb0787c', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'bc64dc0c-ce95-5890-9748-f26ab1dd54e3',
  '68000198', 'ธัญพัธร์', 'ยืนยงค์นาน', 'Thanyapat', 'Yuenyongnan',
  'โอปอล์', 'tyuenyongnan@gmail.com', '0656153962', 'female', '131/99 หมู่ที่ 6 ตำบลโคกขาม อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
  '3170100260385', '1981-04-20', '2025-12-01', '2026-03-30',
  'SCB', '412-2-36212-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'a1b6ce6c-2f8c-57fd-95d9-efa75e9e07e0',
  '68000212', 'ณัชชา', 'อ๊อตจังหรีด', 'Nutcha', 'Odjungreed',
  'นัตตี้', 'nutty.mheng58@gmail.com', '0634460832', 'female', NULL,
  '1101800890840', '1997-06-30', '2025-11-21', '2026-03-20',
  'SCB', '430-1-14098-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2e0fa686-82fc-54f3-9381-ecca30db2c15', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'a1b6ce6c-2f8c-57fd-95d9-efa75e9e07e0',
  '68000213', 'ชัชวาลย์', 'เสริมสุขประเสริฐ', 'Chatchawan', 'Sermsukprasert',
  'เฟม', 'fameveil2016@gmail.com', '0628282517', 'male', NULL,
  '1100801026595', '1995-04-30', '2025-11-21', '2026-03-20',
  'SCB', '108-2-36547-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '31f98fd2-9493-5f30-9a8b-683d5647c722', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '7266ba0d-caf4-5212-800a-d3d79345aa9b',
  '68000251', 'ชนาธิป', 'ชาญชัยศรี', NULL, NULL,
  'ต้า', 'chanathip.chs@gmail.com', NULL, 'male', NULL,
  '1309901116169', '1995-01-21', '2026-01-15', '2026-05-14',
  'SCB', '424-0-42093-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '47edf2aa-8c3b-5d53-87e6-647e4d8ac594', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '4b517e4e-5d8c-52c2-a24e-3fc677c3b209',
  '69000001', 'สิรินภา', 'เรืองเดช', NULL, NULL,
  'น้ำฟ้า', 'namfah0501@gmail.com', NULL, 'female', NULL,
  '1100201573871', '2001-01-05', '2026-02-03', '2026-04-03',
  'SCB', '319-2-99480-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7a30a6ae-81be-5d24-aa71-3b2dfab8f149', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '101cd731-b8b3-5c0f-abbf-3688666fad42',
  '69000015', 'ศิวพร', 'มีชัย', NULL, NULL,
  'โบว์', 'Siwapornmeechai@gmail.com', NULL, 'female', NULL,
  '1120100095469', '1987-05-15', '2026-02-09', '2026-02-09',
  'SCB', '289-2-08857-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '182b4acf-db08-5d7e-8f6f-c8ea178d2252', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '66000034', 'พัชรวิภา', 'มั่งประสิทธิ์', 'PHATCHARAWIPHA', 'MANGPRASIT',
  'แตงกวา', 'phatcharawipha38@gmail.com', '0614165252', 'female', '73/1 ม.1 ตำบลบ้านนา อำเภอกบินทร์บุรี จังหวัดปราจีนบุรี 25110',
  '1250100320810', '1995-12-13', '2023-04-04', '2023-08-01',
  'SCB', '383-4-35945-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '325a4de8-6270-53f1-8d62-ca99f1dfdd8d', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'ea64e6b9-c5f8-5784-8d98-a69cc1ef2bed',
  '66000037', 'สถิรพร', 'ทรัพย์เอนก', 'SATHIRAPORN', 'SAP-A-NEK',
  'รี', 'reesathi1805@gmail.com', '0825047523', 'male', '16/3 ม.2 ตำบลชะไว อำเภอไชโย จังหวัดอ่างทอง 14140',
  '1101402074741', '1995-08-15', '2023-04-20', '2023-08-18',
  'SCB', '419-1-50491-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd9ca3057-049c-5046-8390-95ec35d707b0', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '842f16a5-0ba7-5b8e-95b4-94d9da620bc8',
  '66000131', 'นภสร', 'บุณยาคม', 'Napasorn', 'Boonyakorn',
  'ข้าวจ้าว', 'nmpnsy@gmail.com', '0902358418', 'female', '92/23 ตรอกวัดราชสิทธาราม แขวงวัดท่าพระ เขตบางกอกใหญ่ กรุงเทพมหานคร 10600',
  '1102003232416', '2000-12-04', '2023-11-13', '2024-03-12',
  'SCB', '409-3-28629-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '15037a03-81a4-5749-9f75-f0b15695157c',
  '67000056', 'พงษ์เทพ', 'เสเกกุล', 'Pongthep', 'Sekekul',
  'เบนซ์', 'Sekekulp@gmail.com', '0988077376', 'male', '76 ซอยเพชรเกษม68แยก25 แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร 10160',
  '1630400089605', '1998-06-08', '2024-04-17', '2024-08-15',
  'SCB', '197-2-34940-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ead7fea4-52b0-5044-95d8-a70927211a86', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '68000068', 'ชลปรียา', 'เสียงเสนาะ', 'Chonpreeya', 'Seingsanor',
  'เจน', 'jane_chon@hotmail.com', '0916982521', 'female', '14 หมู่ที่9 ตำบลบางน้ำผึ้ง อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1101500885620', '1996-06-14', '2025-04-22', '2025-08-20',
  'SCB', '156-2-81758-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bac13023-3360-5441-8c32-a81ef94010ba', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '53cc60a6-9d62-5218-b562-5964fdfe8b66',
  '68000095', 'คุณากร', 'จารุไชยจินดา', 'Kunakorn', 'Jaruchaijinda',
  'แสตมป์', 'kunakorn.jcd@gmail.com', '0816269972', 'male', '41/413  ซ.นวมินทร์111 แขวงนวมินทร์ เขตบึงกุ่ม กรุงเทพมหานคร 10240',
  '1103701136171', '1993-07-10', '2025-06-09', '2025-10-07',
  'SCB', '406-1-08916-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '02463fc8-e6c5-5405-ba03-75fb92666043', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '68000110', 'ธนาธรณ์', 'ศรีคำหู้', 'Thanapron', 'Srikumhu',
  'กวาง', 'kwang.thanapron@hotmail.com', '0955480015', 'female', '13 ซอยกรุงธนบุรี ถนนกรุงธนบุรี แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร 10600',
  '1103100364543', '1995-12-10', '2025-07-02', '2025-11-28',
  'SCB', '232-2-74735-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1ecc722f-0dd1-5dca-9110-a02849e56a6c', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'd77a6c1b-db84-53d4-9208-b17373074de8',
  '68000176', 'ปพิชญา', 'ไทยสมบูรณ์สุข', 'Papitchaya', 'Thaisomboonsuk',
  'ดรีม', 'dreammppcy@gmail.com', '0955120523', 'female', '40/05327 หมู่ที่ 13 ตำบลคลองหนึ่ง อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
  '1139600076038', '1999-08-05', '2025-10-22', '2026-02-18',
  'SCB', '769-2-72980-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4800ca0d-4d6b-5756-8751-ed4f6d53d984', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '15037a03-81a4-5749-9f75-f0b15695157c',
  '68000199', 'จิตสอางค์', 'ตุรีย์ตรัยพร', 'Chitsaang', 'Tureetriyaporn',
  'แคนดี้', 'chitsaang1998@gmail.com', '0922939324', 'female', '10/83 ซอย 7/2 ถนนกาญจนาภิเษก แขวงบางแค เขตบางแค กรุงเทพมหานคร 10160',
  '1129900500838', '1998-09-04', '2025-11-14', '2026-03-14',
  'SCB', '418-2-19831-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '780e64f2-2e21-55cc-ab4d-17132e63c8e6', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '82861dc6-685d-5bd0-95b8-4ae4061240d8',
  '68000250', 'พิชญะวรรณ', 'ชื่นบุญ', NULL, NULL,
  'หนูนิด', 'Pichayawan2003@gmail.com', NULL, 'female', NULL,
  '1101801319330', '2003-10-07', '2026-01-12', '2026-05-11',
  'SCB', '170-2-99622-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd8a906e6-41d6-592d-bb22-dd02219a8d57', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '86206982-da93-52b3-9021-65c8af458eec',
  '68000256', 'อภิรดี', 'กิจสวัสดิ์', NULL, NULL,
  'ขนุน', 'kanoon27021994@gmail.com', NULL, 'female', NULL,
  '1100701835963', '1994-02-27', '2026-02-02', '2026-06-01',
  'SCB', '165-4-06881-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd7d0369a-101c-502f-a5cf-7669c0dcca45', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '9dff4f0e-73a4-5f34-822e-7ca5b5959a0d',
  '69000036', 'ยารวี', 'ปลื้มสติ', NULL, NULL,
  'อาย', 'Eeaayy1803@gmail.com', NULL, 'female', NULL,
  '1103100536981', '2026-02-20', '2026-02-23', '2026-06-22',
  'SCB', '428-2-28118-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c7bbe76c-0220-5ea4-b416-4acd6fca94a4', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '5dd16114-dd66-546c-b49c-fc993269ae4a',
  '68000159', 'รมัณยา', 'อินคล้าย', 'Ramanya', 'Inklai',
  'เมจิ', 'ramanyaink@gmail.com', '0945700502', 'female', NULL,
  '1839901770662', '2003-06-18', '2025-10-01', '2026-01-28',
  'SCB', '170-4-25919-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '79209d32-cf9e-5ee5-bffa-920d45dfd7db', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '67000099', 'ชุติมา', 'พิณโกศล', 'Chutima', 'Pinkosol',
  'ตู่', 'chutimap.tu@gmail.com', '0805912765', 'female', '27 ซ.วัดราชสิทธาราม ถนน อิสรภาพ แขวงวัดท่าพระ เขตบางกอกใหญ่ กรุงเทพมหานคร 10600',
  '1102001564896', '1991-07-19', '2024-06-11', '2024-10-09',
  'SCB', '408-8-91223-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd5c61796-bc14-5185-8795-517eef98433f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '68000069', 'อรนิดา', 'บัวไชโย', 'Onnida', 'Buachaiyo',
  'ออย', 'oiloilonnida@gmail.com', '0980970319', 'female', '505/28 ซ.ตรอกบางอุทิศ แขวงวัดพระยาไกร เขตบางคอแหลม กรุงเทพมหานคร 10120',
  '2110201071610', '2001-03-18', '2025-04-22', '2025-08-20',
  'SCB', '139-2-24749-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f80a403e-f671-534e-925c-998c3bcbcb3e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', '561f72ab-995c-5684-899e-2518070dac93',
  '69000037', 'รัฐติยา', 'นิยมอําไพ', NULL, NULL,
  'ฝน', 'Real_love_fon@hotmail.com', NULL, 'female', NULL,
  '1103100113931', '1992-03-16', '2026-03-02', '2026-06-29',
  'SCB', '086-2-88083-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '9a1cdbf7-a679-5a4c-8414-ec629c8dba28', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '37d7b067-892c-58bc-a8b6-170cdde2bb1b', 'd83c5480-0877-5273-87d1-dd5d7d8cabfc',
  '68000088', 'พิชชาอร', 'ธีระบุตร', 'Pitchaon', 'Thirabut',
  'ใบตอง', 'pitchaonthirabut@gmail.com', '0925072952', 'female', '211 หมู่ที่ 7 ตำบลบ้านแก้ง อำเภอเมืองสระแก้ว จังหวัดสระแก้ว 27000',
  '1279900175308', '2001-10-04', '2025-05-19', '2025-09-16',
  'SCB', '012-2-81463-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '63a37220-6950-5b93-8af6-60ec35886d6a', 'a684555a-e44d-4441-9af8-521115cd000a', 'e7c08087-65a5-5a9a-9a04-78608d810732', '99c8eaa2-844a-51fa-afff-f1e43f1a6128', 'a5eaf3fc-0cc7-546a-807a-6960a26f5368',
  '68000089', 'ธนัทปวินทร์', 'ใจแสน', 'Thanatprawin', 'Jaisaen',
  'นิค', 'thanaprawin.hhm@gmail.com', '0954217716', 'male', '168/105 หมู่ที่ 3 ตำบลบ้านคลองสวน อำเภอพระสมุทรเจดีย์ จังหวัดสมุทรปราการ 10290',
  '1669800061552', '1986-12-16', '2025-05-16', '2025-09-13',
  'SCB', '415-0-46038-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5724ca0e-00ed-5bf6-b350-19bb67a3ca83', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '5df973f1-9161-59a4-8b41-95f6d3579b8c', 'bf22341b-66e3-5eda-95ab-4179b49c9e67',
  '63000021', 'สุภาวดี', 'มุงเมือง', 'SUPHAWADEE', 'MUNGMUANG',
  'ไร', 'rayrai_mm@hotmail.com', '0814851619', 'female', '223 หมู่ 2 ตำบลทุ่งผึ้ง อำเภอแจ้ห่ม จังหวัดลำปาง 52120',
  '3520600379621', '1977-05-06', '2020-08-07', '2020-11-06',
  'SCB', '405-2-88087-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '45243a33-d4c9-5e54-85f4-fbb91180eca2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '5df973f1-9161-59a4-8b41-95f6d3579b8c', 'cae3a84c-324f-500a-bf62-a338c5a866e1',
  '68000151', 'ชนิดา', 'นิยมราษฏร์', 'Chanida', 'Niyomrot',
  'หนูนา', 'chanidaleef@gmail.com', '0917346586', 'female', '12 ซอยประชาอุทิศ 54 แยก 3 แขวงบางมด เขตทุ่งครุ กรุงเทพมหานคร 10140',
  '1101200193714', '1989-06-16', '2025-09-16', '2026-01-13',
  'SCB', '078-2-38204-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '189ba125-bf10-5648-aaa9-442e8791c4ed', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '5df973f1-9161-59a4-8b41-95f6d3579b8c', 'cae3a84c-324f-500a-bf62-a338c5a866e1',
  '68000197', 'พิทยุตม์', 'คฑารัตน์', 'Pittayut', 'Katarat',
  'กัน', 'pt.xuhaodong@gmail.com', '0886004847', 'male', '9/47 หมู่ที่ 2 ตำบลศาลาแดง อำเภอเมืองอ่างทอง จังหวัดอ่างทอง 14000',
  '1159900294359', '1998-01-14', '2025-11-10', '2026-03-10',
  'SCB', '627-2-40066-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '065f663e-401f-5593-983a-149cbbad6924', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', '5fe4252a-56a5-59c5-8da3-81f341d350f4',
  '65000035', 'ศุภาพิชญ์', 'เตชะนันท์มี', 'SUPAPIT', 'TECHANANMANEE',
  'รถตู้', 'recruitment@shd-technology.co.th', '0988077376', 'female', '106 ซ.สุขุมวิท 56 แขวงบางจาก เขตพระโขนง กรุงเทพมหานคร 10260',
  '1100701338374', '1991-04-13', '2022-04-07', '2025-12-25',
  'SCB', '871-2-10163-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', '799179f4-885a-55ec-b7d9-ed4c2436ac6d',
  '0007', 'ดวิษ', 'ตุติยากรณ์', NULL, NULL,
  'ปาล์ม', NULL, NULL, 'male', NULL,
  '1369900318876', '1995-01-20', '2024-02-26', '2024-06-24',
  'SCB', '399-4-46524-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '37da4d12-64a1-5007-846d-36f1c49d3b23', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'a94ac1a5-7631-55a4-adda-4ae0bdb330ca',
  '66000067', 'ภิรมย์พร', 'โชคเจริญ', 'Phiromphon', 'Chokcharoen',
  'ฝ้าย', 'Piromporn.929@gmail.com', '0959509473', 'female', '331/ ม.2 ตำบลโนนกอก อำเภอเกษตรสมบูรณ์ จังหวัดชัยภูมิ 36120',
  '1360400251413', '2025-12-25', '2023-06-07', '2023-10-05',
  'SCB', '123-4-56789-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'bfcc2725-0978-52ce-a140-57e1a71de410',
  '66000147', 'เพ็ญจันทร์', 'ชัยอามาตย์', 'Penjan', 'Chaiarmat',
  'เหมียว', 'meawok1@gmail.com', '0824503391', 'female', '130 หมู่12 บ้านโพธิ์งาม ตำบลวัดธาตุ อำเภอเมืองหนองคาย จังหวัดหนองคาย 43000',
  '1411900008836', '1984-05-31', '2023-12-12', '2024-04-10',
  'SCB', '170-4-14283-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'bbeefcac-d206-5fb3-85f0-fccfd23c0b92',
  '68000086', 'สงวนลักษณ์', 'สุวรรณงาม', 'Sanguanlak', 'Suwanngam',
  'แอน', 'ann.sanguanlak@shd-technology.co.th', '0631979626', 'female', '7 หมู่ที่ 1 ตำบลบางกระไห อำเภอเมืองฉะเชิงเทรา จังหวัดฉะเชิงเทรา 24000',
  '1200101725228', '1997-07-28', '2025-05-13', '2025-09-10',
  'SCB', '415-1-29844-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd2424c33-a067-5999-8787-90624c6de80f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', '2338b189-186b-5bf5-a393-916bd80ee693',
  '68000182', 'ชาญชัย', 'นิโรรัมย์', 'Chanchai', 'Nirorum',
  'ต้นอ้อ', 'tonaor.chanchai@shd-technology.co.th', '0852245006', 'male', '155 หมู่ที่ 12 ตำบลลำดวน อำเภอกระสัง จังหวัดบุรีรัมย์ 31160',
  '1319500020471', '2003-12-22', '2025-11-05', '2026-03-03',
  'SCB', '206-4-22466-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1de4da72-36df-5bce-a298-ec902801dc5a', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'bbeefcac-d206-5fb3-85f0-fccfd23c0b92',
  '68000202', 'สุทธิพงษ์', 'วงศ์แก้ว', 'Sutthiphong', 'Wongkaew',
  'ออย', 'Sutthipongwangkaew11@gmail.com', '0880200173', 'male', '39 หมู่ที่ 3 ตำบลวัดละมุด อำเภอนครชัยศรี จังหวัดนครปฐม 73120',
  '1739901972061', '2001-11-19', '2025-11-17', '2026-03-15',
  'SCB', '333-2-92195-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '6ccf9608-9200-5b8c-8227-28427fbb54fd', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'bbeefcac-d206-5fb3-85f0-fccfd23c0b92',
  'LN027', 'ศิรินัดดา', 'เกตุอุดม', NULL, NULL,
  'ปอเปี๊ยะ', 'popia.sririnudda@shd-technology.co.th', NULL, 'female', NULL,
  '1100801474539', '2006-09-10', '2025-06-23', '2025-10-20',
  'SCB', '271-2-58130-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7dd94e90-8d7b-5c5a-a951-05417269bbe6', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', 'bfcc2725-0978-52ce-a140-57e1a71de410',
  '66000012', 'กุมารี', 'ขำสัจจา', 'KUMAREE', 'KHAMSAJJA',
  'เจี๊ยบ', 'kumaree141977@gmail.com', '0947837657', 'female', '752/2 แขวงตลาดน้อย เขตสัมพันธวงศ์ กรุงเทพมหานคร 10100',
  '5101600026940', '1977-07-14', '2023-02-01', '2023-04-01',
  'SCB', '416-1-53901-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a0d5f05b-e948-567c-9fab-f55a4aee49af', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', '7e39db0e-5c27-5441-941e-4c9b776d33fc',
  '68100023', 'อากัณฌา', 'ตรีปากี', NULL, NULL,
  'กัน', 'akancha.treepakee04@gmail.com', NULL, 'female', NULL,
  '1101801387173', '2004-11-01', '2025-11-10', '2026-03-09',
  'SCB', '037-2-59986-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ee627c60-8120-5a24-97a4-f50c12571d41', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', '7e39db0e-5c27-5441-941e-4c9b776d33fc',
  '68100024', 'ณัฐพร', 'ศิริเกษ', NULL, NULL,
  'ฟ้า', '655051500222@mail.rmutk.ac.th', NULL, 'female', NULL,
  '1418600022155', '2002-07-22', '2025-11-10', '2026-03-09',
  'SCB', '424-2-13009-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '85b72e61-26c7-5a99-bb0c-15cad1e983db', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '4e12fd33-dbdb-521b-88dc-70349a5aa0f2', '7e39db0e-5c27-5441-941e-4c9b776d33fc',
  '68100029', 'รพีพรรณ', 'วัชรวรรณวงศ์', NULL, NULL,
  'แพน', 'raphiphan.w@ku.th', NULL, 'female', NULL,
  '1101801358998', '2004-05-26', '2025-11-24', '2026-03-23',
  'SCB', '417-0-87536-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', '82861dc6-685d-5bd0-95b8-4ae4061240d8',
  '67000146', 'ศุภิสรา', 'กิติยะวงศ์', 'Supitsara', 'Kitiyawong',
  'โมเม', 'supitsara.kiti@gmail.com', '0833307786', 'female', '55 ม.6 ตำบลหมูม่น อำเภอเมืองอุดรธานี จังหวัดอุดรธานี 41000',
  '1419901798765', '1998-10-03', '2024-08-05', '2024-12-03',
  'SCB', '432-1-90481-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '03054231-d09f-593c-9614-e3539576a74e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', '561f72ab-995c-5684-899e-2518070dac93',
  '67000200', 'นพมาศ', 'คงสุข', 'Noppamat', 'Kongsuk',
  'เจน', 'jennopamad@hotmail.com', '0652566369', 'female', '73/1 ม.11 ตำบลบะ อำเภอท่าตูม จังหวัดสุรินทร์ 32120',
  '1100702355311', '1996-07-20', '2024-10-22', '2025-02-18',
  'SCB', '023-4-07586-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '57772cb0-784f-5525-b7df-bddded652e7e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', 'efc309aa-6778-5d49-a195-62074996d00a',
  '67000211', 'ดวงลดา', 'ดวงใย', 'Doanglada', 'Doungyai',
  'บีบี', 'doanglada.b@gmail.com', '0822093211', 'female', '105 ม.2 ตำบลท่าผา อำเภอเกาะคา จังหวัดลำปาง 52130',
  '1520300062986', '1998-01-14', '2024-11-04', '2025-03-04',
  'SCB', '015-4-69385-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', 'c06d105f-4483-5966-aa34-b4442fcd5bab',
  '68000161', 'จิตเทพ', 'บุญยืด', 'Jitthep', 'Boonyued',
  'จอห์น', 'jittap888@gmail.com', '0616500125', 'male', NULL,
  '1279900089151', '1998-03-30', '2025-10-01', '2026-01-28',
  'SCB', '420-0-94159-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd62503b0-fcc2-53c0-9890-1c98aae5c3a7', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', '2494cd98-bdc9-5587-904b-eadfcfa3fbd0',
  '68000178', 'พีรชาญ', 'เหม็งทะเหล็ก', 'Pheerachan', 'Mengtaleg',
  'ทิว', 'peerachantiw@gmail.com', '0820812421', 'male', '129 หมู่ที่ 2 ตำบลสันสลี อำเภอเวียงป่าเป้า จังหวัดเชียงราย 57170',
  '1579900977223', '2002-08-17', '2025-10-22', '2025-10-22',
  'SCB', '434-2-00660-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'fff2b4aa-c914-52dc-b869-af609eb7a949', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', '99da1164-7269-564a-9680-b76dbb91f95d',
  '68000179', 'สรรค์', 'ธนสิทธิ์สมบูรณ์', 'Sun', 'Thanasitsomboon',
  'เซฟ', 'safe.th@hotmail.com', '0823616162', 'male', '73 หมู่ที่ 7 ตำบลธารเกษม อำเภอพระพุทธบาท จังหวัดสระบุรี 18120',
  '1199600319330', '2002-02-21', '2025-10-22', '2025-10-22',
  'SCB', '789-4-00627-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2a137c36-1cf5-5c33-8386-cc1db2ec244a', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', '7642d82b-d09d-5eed-ab78-04afb57c2c16',
  '68000180', 'รุ่งวิกรัย', 'จริยธำรงวิทย์', 'Rungwikrai', 'Jariyathamrongwit',
  'นุ่น', 'rungwikrai123@gmail.com', '0614206935', 'female', '88/64 หมู่ที่ 9 ตำบลอ้อมน้อย อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74130',
  '1101801246316', '2002-08-10', '2025-10-22', '2025-10-22',
  'SCB', '162-4-26956-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bdc5955f-e72d-51ac-9419-71a04cb0e914', 'a684555a-e44d-4441-9af8-521115cd000a', 'fe6376f8-801d-4d0b-abed-263bbeaa13a6', '0ff7087e-1a4e-5508-9320-0be8fc2bebc0', '6cf792d7-d44d-5430-bf58-10bd326fb927',
  '68000252', 'ณัฐณิชา', 'อังศุโภไคย', NULL, NULL,
  'หมูแฮม', 'ham25341@gmail.com', NULL, 'female', NULL,
  '1709901198960', '1998-03-25', '2026-01-19', '2026-05-18',
  'SCB', '407-6-94797-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e939f7de-7ff7-5e57-b19e-e4625c3fa66e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', '38da8e29-65d1-5682-a8b6-dac42cbc972b', '17f02b7c-9810-5594-8f15-4ab799e2f83b',
  '61000001', 'วินัย', 'หนูรูปงาม', 'WINAI', 'NURUPNGAM',
  'นัย', 'winai.n@shd-technology.co.th', '0872480577', 'male', '5/467 ถนนป็อปปูล่า ตำบลบางพูด อำเภอปากเกร็ด จังหวัดนนทบุรี 11120',
  '3720900716728', '1981-04-16', '2018-02-01', '2018-06-01',
  'SCB', '417-1-00396-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '04cd3508-bd0c-50e3-a676-1c63a0db7bef', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', '38da8e29-65d1-5682-a8b6-dac42cbc972b', '93b5bfce-5273-5b37-b99b-2ebc1c2c9fee',
  '62000008', 'ประดิษฐ์', 'แสนแก้ว', 'PRADIT', 'SAEN-GAEW',
  'เม', 'pradit.saenkaew@gmail.com', '0929972075', 'male', '81 หมู่ที่ 10 ตำบลนาแก อำเภอนาวัง จังหวัดหนองบัวลำภู 39170',
  '1411400169130', '1991-04-11', '2019-08-21', '2019-12-19',
  'SCB', '120-2-53744-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '998d6f38-fcad-58dd-a19c-50c9d7a5a846', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', '38da8e29-65d1-5682-a8b6-dac42cbc972b', '34fe534e-5287-5c1f-8b2e-0db5d0c96944',
  '64000076', 'เฉิน', 'จินเซิ้น', 'CHEN', 'JINSHENG',
  'เซ่ง', NULL, NULL, 'male', NULL,
  '0991020861454', '1993-12-11', '2021-09-03', '2022-01-01',
  'SCB', '120-2-58969-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', '38da8e29-65d1-5682-a8b6-dac42cbc972b', '34fe534e-5287-5c1f-8b2e-0db5d0c96944',
  '65000027', 'เฉิน', 'จินจื้อ', 'CHEN', 'JINZHI',
  'เฉิน', NULL, NULL, 'male', NULL,
  '0991014376116', '1995-10-21', '2022-09-16', '2023-01-14',
  'SCB', '408-8-62943-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '385dda09-e293-5f2d-bde4-4f663bf8d399', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '62000004', 'นภัสวรรณ', 'บุญประเสริฐ', 'NAPHATSAWAN', 'BOONPRASERT',
  'เมย์เม่', 'nongnamay111@gmail.com', '0839154026', 'female', '25/3 หมู่ที่ 1 ตำบลคลองเกลือ อำเภอปากเกร็ด จังหวัดนนทบุรี 11120',
  '2129701032557', '1999-07-05', '2019-05-03', '2019-08-31',
  'SCB', '120-2-53737-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3e1111f2-00b9-538d-82ad-08524935f918', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '62000006', 'ณัฐพงษ์', 'กมลนิมิตกุล', 'NUTTAPHONG', 'KAMOLNIMITAKUL',
  'โบนัส', 'april.ago1989@gmail.com', '0647198777', 'male', '11 ซ.กำนันแม้น 13 แยก 4 แขวงคลองบางพราน เขตบางบอน กรุงเทพมหานคร 10150',
  '1101800341722', '1989-04-03', '2019-06-24', '2019-10-22',
  'SCB', '407-7-00379-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '6fb24cf5-7d6f-50bf-a45d-893f879b9bce', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '63000036', 'กนกอร', 'คงธนาสมบูรณ์', 'KANOKON', 'KONGTHANASOMBOON',
  'นก', 'kanokon.kkn29@gmail.com', '0824498703', 'female', '2 ซ.เอกชัย 76 แยก 2 แขวงบางบอน เขตบางบอน กรุงเทพมหานคร 10150',
  '1100400945255', '1998-04-29', '2020-11-16', '2021-03-16',
  'SCB', '409-3-43697-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1ae6348f-2c52-56ac-86e3-e91579348600', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', 'd707223b-218b-5025-a5b0-4a90d98f882b',
  '65000003', 'พลพัต', 'พลเสน', 'PONPAT', 'PONSAN',
  'นัด', 'ponpat1978@gmail.com', '0899520910', 'male', '75/239 หมู่ที่ 1 ตำบลบ้านเกาะ อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
  '3739900004866', '1978-11-18', '2022-01-03', '2022-05-03',
  'SCB', '147-2-50089-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e812f3c2-feea-5992-b1c7-4fea26c4680a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '66000029', 'ศิริพร', 'มณีบวรสิน', 'SIRIPORN', 'MANIBOWONSIN',
  'ใบเตย', 'sphonehot255933@gmail.com', '0987363980', 'female', '97/2 หมู่ที่ 3 ตำบลบ้านสระ อำเภอสามชุก จังหวัดสุพรรณบุรี 72130',
  '2720601030109', '2000-02-05', '2023-03-13', '2023-07-11',
  'SCB', '162-4-20662-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '51394f04-92ac-5a69-8516-5f7bece30192', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '66000035', 'ศักดิ์สิทธิ์', 'รุ่งวงศา', 'SOKSIT', 'RONGWONGSA',
  'เบิร์ด', 'birxzazabirx@gmail.com', '0802714493', 'male', '239/156 ซ.พุทธมณฑลสาย2ซอย 7 แขวงบางแคเหนือ เขตบางแค กรุงเทพมหานคร 10160',
  '1740300164574', '1998-03-26', '2023-04-03', '2023-08-01',
  'SCB', '411-0-54780-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'cc9304a2-77ab-5ae6-80ea-d1830cf2f143', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '66000104', 'ฐานิดา', 'บุญชูศรี', 'Thanida', 'Boonshusri',
  'ใบเตย', 'Baitoey.tnd@hotmail.com', '0806965113', 'female', '16 ซ.ศิริเกษม9 แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160',
  '1102003454575', '2003-01-31', '2023-09-05', '2024-01-03',
  'SCB', '162-4-10437-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '73826abd-667f-50cf-a372-799e1c0c3f16', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '67000101', 'ฐานิษา', 'บุญชูศรี', 'Thanisa', 'Boonshusri',
  'ใบหยก', 'thanisa2200550055@gmail.com', '0985989649', 'female', '16 ซ.ศิริเกษมอ แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160',
  '1102300110528', '2005-05-26', '2024-06-12', '2024-10-10',
  'SCB', '418-1-89480-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8dbd9f52-aa10-57d2-842d-fad2a5586455', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '67000195', 'ธิติมา', 'มาลีรัตน์', 'Thitima', 'Maleerat',
  'ยุ้ย', 'titima.ma8393@gmail.com', '0933375675', 'female', '18 ถ.ราชบุตร ตำบลในเมือง อำเภอเมืองอุบลราชธานี จังหวัดอุบลราชธานี 34000',
  '1349900520039', '1992-11-28', '2024-10-15', '2025-02-12',
  'SCB', '120-2-59209-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '94b5eb99-d5f8-5278-a0f1-df3317f4762c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', 'd707223b-218b-5025-a5b0-4a90d98f882b',
  '68000015', 'ไกรวิชญ์', 'อรุณวัฒน์', 'Kraiwich', 'Arunwat',
  'มาร์ค', 'kraiwichh.30@gmail.com', '0800673617', 'male', '53/65 ถ.สวรรค์วิถี ตำบลปากน้ำโพ อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000',
  '1600101871395', '2001-05-30', '2025-01-22', '2025-05-22',
  'SCB', '408-3-44638-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'dffa9393-9791-5e33-825b-c5584a79b44d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', 'd707223b-218b-5025-a5b0-4a90d98f882b',
  '68000077', 'สรยุทธิ์', 'นิลเกษม', 'Sorayut', 'Nilkasem',
  'ปาย', 'naypay1150@gmail.com', '0633122815', 'male', '310/2 ถ.ฝั่งสถานีรถไฟปากน้ำโพ ตำบลปากน้ำโพ อำเภอเมืองนครสวรรค์ จังหวัดนครสวรรค์ 60000',
  '1609900493934', '2000-02-26', '2025-04-29', '2025-08-27',
  'SCB', '431-2-02777-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e1bb913d-be36-5415-a8a6-03ee4ee3ada0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', 'd707223b-218b-5025-a5b0-4a90d98f882b',
  '68000102', 'พัชรากร', 'แก้ววิเศษ', 'Patcharakorn', 'Kaewwiset',
  'พัช', 'thapthai5@gmail.com', '0955419755', 'male', '10/240 ถนนศาลธนบุรี แขวงบางหว้า เขตภาษีเจริญ กรุงเทพมหานคร 10160',
  '1101801076810', '2000-02-03', '2025-06-23', '2025-10-21',
  'SCB', '170-4-24421-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '23ffc8a9-4fec-58a0-b289-f3a4846c61eb', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '68000119', 'สุภิญญา', 'ลาลี', 'Supinya', 'Lalee',
  'น้อง', 'nong0611427093@gmail.com', '0621597366', 'female', '96 หมู่ที่ 7 ตำบลโนนรัง อำเภอเขื่องใน จังหวัดอุบลราชธานี 34320',
  '1349300006911', '2002-06-22', '2025-07-22', '2025-11-19',
  'SCB', '077-2-80387-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2be66e56-c051-5bc4-96b1-2e10c91d5588', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', 'bd670d39-fb54-543c-937a-4d9d415dab53',
  '68000145', 'เจษฎา', 'แซ่ฉั่ว', 'Jedsada', 'Saechua',
  'เจษ', 'jed.jedsada@shd-technology.co.th', '0954539832', 'male', '575/169 ซอยเพชรเกษม 55/2 แขวงหลักสอง เขตบางแค กรุงเทพมหานคร 10160',
  '1101800755900', '1995-12-06', '2025-09-01', '2025-12-30',
  'SCB', '162-4-33548-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '816e33ed-e784-582d-93b7-afe7b35abf3d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', 'bd670d39-fb54-543c-937a-4d9d415dab53',
  '68000177', 'จิดาภา', 'วรรณปานไพร', 'Jidapa', 'Wanapanpai',
  'มด', 'mod461552@gmail.com', '0637210812', 'female', '42ช หมู่ที่ 3 แขวงบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150',
  '1103100747787', '2002-07-21', '2025-10-22', '2026-02-19',
  'SCB', '072-2-91109-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3f9e762a-9573-5803-a799-f409aa7d781b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'b4f82564-eb15-5941-b2cf-bf527ab44673', '27705d90-5a6b-5c5b-9f0d-1fb4bb9dbadd', NULL,
  '68000232', 'กฤษตะวัน', 'กลั่นกลิ่น', 'Krittawan', 'Klanklin',
  'พลอย', 'phloiploy.krittawan@gmail.com', '0645685141', 'female', NULL,
  '1101500879557', '1996-05-07', '2025-12-18', '2026-04-17',
  'SCB', '830-2-38287-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'cbecb087-f26d-50e0-9226-c158353aed33', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '63000007', 'สุชาดา', 'เจ็นประโคน', 'SUCHADA', 'JENPRAKON',
  'ดา', 'damdazaza2525@gmail.om', '0634707963', 'female', '115หมู่ที่12 ต.สะเดา อ.พลับพลาชัย จ.บุรีรัมย์ ตำบลสะเดา อำเภอพลับพลาชัย จังหวัดบุรีรัมย์ 31250',
  '3310700735714', '1982-03-21', '2020-03-02', '2020-06-30',
  'SCB', '120-2-53716-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c62ae54d-1b75-5b9e-b578-de1d9b564671', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '63000030', 'สมใจ', 'ทองวงค์', 'SOMJAI', 'TONGWONG',
  'ส้ม', 'somjai.tongwong@gmail.com', '0805668849', 'female', '532 หมู่ที่ 8 ตำบลนาสัก อำเภอสวี จังหวัดชุมพร 86130',
  '1670600008978', '1984-09-30', '2020-10-19', '2021-02-16',
  'SCB', '197-2-26752-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1ffb0382-09aa-53d0-a817-29d984423507', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '64000037', 'ข้าวฟ่าง', 'เมฆประดับ', 'KHAOPHANG', 'MEKPHADUB',
  'ข้าวฟ่าง', 'fangjung32@gmail.com', '0807294481', 'female', '25 หมู่ที่ 8 ตำบลท่าตาล อำเภอบางกระทุ่ม จังหวัดพิษณุโลก 65110',
  '1650500064981', '1989-01-19', '2021-06-01', '2021-09-29',
  'SCB', '411-1-11146-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd0a056fc-fe69-5613-910a-de09ff7c4a88', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '65000004', 'อาทิตย์', 'ท้าวกอก', 'ATIT', 'TAOKOK',
  'เอก', 'arsenal.ake@gmail.com', '0852100637', 'male', '122/2 หมู่ที่ 14 ตำบลหนองฉิม อำเภอเนินสง่า จังหวัดชัยภูมิ 36130',
  '3360600149996', '1982-06-15', '2022-01-17', '2022-05-17',
  'SCB', '022-4-00618-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0eb5e253-d653-50a5-9352-8616c6dad676', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '66000017', 'ดวงแก้ว', 'เทียนน้ำเงิน', 'DOUNGKEAW', 'TEINNAMOEON',
  'พลอย', 'doungkeaw031@gmail.com', '0926247924', 'female', '98 ถ.เทอดไท แขวงบางแค เขตบางแค กรุงเทพมหานคร 10160',
  '1909802196959', '1997-08-08', '2023-02-21', '2023-06-21',
  'SCB', '232-2-36209-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f512ff81-3577-58b8-bc43-c165f2527d96', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '66000069', 'ชลธิชา', 'ศาลางาม', 'Chonthicha', 'Salangam',
  'พลอย', 'chonthicha.sa15@gmail.com', '0835270012', 'female', '173/2 ม.10 ตำบลท่าม่วง อำเภอสตึก จังหวัดบุรีรัมย์ 31150',
  '1103703226371', '2001-04-15', '2023-06-12', '2023-10-10',
  'SCB', '793-2-92191-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4fdf0298-8a50-569a-9ccc-47e027bad5bf', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '67000024', 'สายชล', 'บุนนาค', 'Saichon', 'Bunnak',
  'ผึ้ง', 'Saichonbunnak23@gmail.com', '0842796198', 'female', '152 ซ.เจริญนคร 34 ถ.เจริญนคร แขวงบางลำภูล่าง เขตคลองสาน กรุงเทพมหานคร 10600',
  '1101801063327', '1999-11-23', '2024-02-19', '2024-06-18',
  'SCB', '424-0-73785-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7d4edb9b-bdfd-5eb1-853b-97186b34397b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '67000077', 'นุชจรินทร์', 'ทวีศรี', 'Nujarin', 'Taveesri',
  'บี', 'nujarin279@gmail.com', '0855132999', 'female', '235 ม.5 ตำบลชัยเกษม อำเภอบางสะพาน จังหวัดประจวบคีรีขันธ์ 77190',
  '3770400379366', '1976-09-07', '2024-05-20', '2024-09-17',
  'SCB', '419-0-13988-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', '9e09330a-ef6e-5bb7-b2fb-cdedda3a56e0',
  '67000135', 'สุธินี', 'ภู่สิทธิอมรชัย', 'Suthinee', 'Phusitthiamonchai',
  'อิ้ง', 'aingsutinee@gmail.com', '0822324304', 'female', '198 ม.7 ตำบลนาไหม อำเภอบ้านดุง จังหวัดอุดรธานี 41190',
  '1419902044675', '2002-01-26', '2024-07-30', '2024-11-27',
  'SCB', '219-2-67965-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8560d71d-54bd-5475-8503-a591f9e86510', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '2140af71-7f97-57e5-aead-7451c341765f', 'ed055f95-3926-592f-a39e-e2dd9536b264', NULL,
  '68000237', 'ปัณฑารีย์', 'งามศิริโรจน์', NULL, NULL,
  'เอิร์น', 'puntaree.ngam@gmail.com', NULL, 'female', NULL,
  '1311200091928', '1996-06-05', '2026-01-19', '2026-05-18',
  'SCB', '422-1-19175-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '05adf243-cb3e-570b-bf50-2b72a7b1f739', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '65b53cdc-a37b-5dc4-965e-c1ce1e5bfca9',
  '61000002', 'สิเรียม', 'สีดาสาร', 'SIREAM', 'SRIDASAN',
  'ฉาย', 'siream99999@gmail.com', '0997802205', 'female', '25 ซอยร่มเกล้า 21/8 แขวงคลองสามประเวศ เขตลาดกระบัง กรุงเทพมหานคร 10520',
  '1100801138768', '1996-05-27', '2018-02-07', '2018-06-07',
  'SCB', '408-3-69804-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7ab44fce-fced-5f3f-8f25-1db966f9c14b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '9823e0d0-f9a6-5bfc-ac39-b1df496b204b',
  '61000004', 'กรานต์', 'โมฬีกุล', 'KRAN', 'MOLLGLUN',
  'กอล์ฟ', 'nupornlagolf@gmail.com', '0970601445', 'male', '47/159 ซ.สุภาร่วม แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพมหานคร 10800',
  '1103700102868', '1990-04-14', '2018-03-01', '2018-06-29',
  'SCB', '383-4-32342-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f41241e9-4510-5f92-9743-55982477ea03', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '939e472f-b95a-572e-aae2-248ef77a2ba9',
  '61000005', 'สิริพร', 'หุ่นฉายศรี', 'SIRIPORN', 'HOONGHISRI',
  'พอลล่า', 'siripolla@gmail.com', '0909625571', 'female', '38/4 หมู่ 6 ตำบลบางพูด อำเภอเมืองปทุมธานี จังหวัดปทุมธานี 12000',
  '3130100363273', '1981-10-02', '2018-03-01', '2018-06-29',
  'SCB', '120-2-53736-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7413f985-25f9-5031-b2df-bfaf59568792', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'd707223b-218b-5025-a5b0-4a90d98f882b',
  '64000046', 'ภัทรวรรธน์', 'ชัยอนุวัฒน์', 'PATARAWAT', 'CHAIANUWAT',
  'ภัทร', 'a0819371053@gmail.com', '0819371053', 'male', '27/29 ซ.เพชรเกษม 114 ม.เกษมทอง แขวงหนองค้างพลู เขตหนองแขม กรุงเทพมหานคร 10160',
  '3102002204377', '1968-11-21', '2021-06-14', '2021-10-12',
  'SCB', '115-2-75907-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '70235a7f-36c5-59d8-959b-9cd3d10c925c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '64000101', 'กนกพร', 'ศรีบุตร', 'KANOKPORN', 'SRIBUT',
  'มด', 'kanokporn162531@gmail.com', '0886859978', 'female', '16 หมู่ที่ 13 ตำบลแคน อำเภอสนม จังหวัดสุรินทร์ 32160',
  '1460100123435', '1988-04-16', '2021-11-08', '2022-03-08',
  'SCB', '432-1-04585-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bd56b283-9b42-568d-a514-2397a909aaee', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '04fb514f-9556-533d-8627-c672df09b7be',
  '64000104', 'กิตติภณ', 'ตื่อสร้อย', 'KITTIPON', 'TAESOI',
  'กอล์ฟ', 'gpkittipon@gmail.com', '0933986864', 'male', '13 หมู่ที่ 6 ตำบลบัวใหญ่ อำเภอน้ำพอง จังหวัดขอนแก่น 40140',
  '1400700216621', '1998-05-01', '2021-11-22', '2022-03-22',
  'SCB', '929-2-30185-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5df9bf71-89a8-546a-8456-897c58407d36', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '64000107', 'สุนิตา', 'ทองภู', 'SUNISA', 'THONGPOO',
  'ปลาย', 'sunisathongpoo@gmail.com', '0981978746', 'female', '95 หมู่ที่ 3 ตำบลบัวใหญ่ อำเภอน้ำพอง จังหวัดขอนแก่น 40140',
  '1400700212471', '1997-12-12', '2021-12-01', '2022-03-31',
  'SCB', '436-1-10605-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0e1ccb9a-35e1-5441-b5b7-211ea13f6033', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'd707223b-218b-5025-a5b0-4a90d98f882b',
  '65000002', 'จรัญ', 'คงมี', 'JARAN', 'KONGMEE',
  'ติ๊ก', 'tikkong@gmail.com', '0879114153', 'male', '42/1 หมู่ที่ 7 ตำบลวังโมกข์ อำเภอวชิรบารมี จังหวัดพิจิตร 66140',
  '1660700008589', '1984-10-01', '2022-01-03', '2022-05-03',
  'SCB', '147-2-50066-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '04fb514f-9556-533d-8627-c672df09b7be',
  '65000010', 'วัชรกรณ์', 'เหลือสิงห์กุล', 'WATCHARAKORN', 'LUEASINGKUN',
  'หนุ่ม', 'num.watcharakorn@gmail.com', '0631841799', 'male', '40/3 หมู่ที่ 11 ตำบลท่างาม อำเภออินทร์บุรี จังหวัดสิงห์บุรี 16110',
  '1160100173109', '1987-01-08', '2022-02-18', '2022-06-18',
  'SCB', '312-2-89600-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e4d5e196-ae83-5461-ac69-7591ed03d182', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '04fb514f-9556-533d-8627-c672df09b7be',
  '65000063', 'ธราทร', 'เคียงสันเทียะ', 'TARATHORN', 'KHIANGSUNTHIA',
  'เจ', 'jjthrhr101@gmail.com', '0934401278', 'male', '188 ม.2 ตำบลหนองหอย อำเภอพระทองคำ จังหวัดนครราชสีมา 30220',
  '1300901206518', '1999-09-11', '2022-11-01', '2023-03-01',
  'SCB', '439-0-88462-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4168d710-be67-5e11-a2b9-30b130980b5f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '65000067', 'อรัญญา', 'ขุนอาราชอบช้าง', 'Aranya', 'Khun-ar-rachobchang',
  'เฟื้องฟ้า', 'Aranya.15594@gmail.com', '0971208248', 'female', '46 หมู่ที่ 3 ตำบลขามป้อม อำเภอเขมราฐ จังหวัดอุบลราชธานี 34170',
  '1340500308336', '1999-10-03', '2022-12-12', '2023-04-11',
  'SCB', '929-2-31467-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '80220d20-0283-5d6a-ad56-279ea30c8331',
  '66000055', 'HONGXIN', 'CHEN', 'HONGXIN', 'CHEN',
  'จีดี้', NULL, '0990909124', 'male', NULL,
  '0991024018051', '1997-04-06', '2023-05-25', '2023-09-22',
  'SCB', '156-4-39858-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'affaf1cd-7b35-522b-8cb4-9b2da375e2a1', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '66000113', 'มินตรา', 'วิทยากาญจน์', 'Mintra', 'Vitayagan',
  'มิน', '06mintra@gmail.com', '0610431108', 'female', '120 หมู่ที่ 11 ตำบลโนนชัยศรี อำเภอโพนทอง จังหวัดร้อยเอ็ด 45110',
  '1160101763937', '2002-01-06', '2023-09-26', '2024-01-24',
  'SCB', '412-1-70402-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1e22d175-b7ab-5634-846b-d06d493c291e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '6da73601-a4e2-5d1d-8491-4275067424ac',
  '66000115', 'อิทธิพร', 'ปะวาระ', 'Aithiporn', 'Pawara',
  'ปุ๊ริม', 'pupu25421999@gmail.com', '0822611964', 'male', '58 หมู่ที่ 5 ตำบลหนองโพธิ์ อำเภอนาเชือก จังหวัดมหาสารคาม 44170',
  '1104300174684', '1999-06-09', '2023-09-26', '2024-01-24',
  'SCB', '929-2-32918-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '35bbe2c8-93e5-5736-8ef8-a531fbfbe321', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '67000096', 'ยุวดี', 'พวงยอด', 'Yuwadee', 'Puangyot',
  'พุด', 'yuwadee.puangyot@gmail.com', '0946263707', 'female', '72 หมู่ที่ 4 ตำบลหนองเชียงทูน อำเภอปรางค์กู่ จังหวัดศรีสะเกษ 33170',
  '1330700170745', '1998-02-18', '2024-05-26', '2024-09-23',
  'SCB', '147-2-52626-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '67000128', 'เจนจิรา', 'ศาลางาม', 'Janjira', 'Salangam',
  'เจน', 'janjira060240@gmail.com', '0963323763', 'female', '120 หมู่ที่ 11 ตำบลเมืองแก อำเภอสตึก จังหวัดบุรีรัมย์ 31150',
  '1311100258278', '1997-02-06', '2024-02-06', '2024-06-05',
  'SCB', '505-2-91550-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '50876a37-ea0b-55a8-882d-a7778ef5fe34', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', NULL,
  '67000224', 'อดุลย์', 'บัวทอง', 'Adul', 'Buathong',
  'ดุล', 'adultai16@gmail.com', '0641166833', 'male', '110/130 หมูบ้าน ภิรมย์วิลล์ พระราม2 ซอย เทียนทะเล20 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '1301301259751', '1999-03-08', '2024-11-18', '2025-03-18',
  'SCB', '219-2-75116-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c281bc5d-8b81-5652-87e9-ed6a373c9521', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', NULL,
  '67000233', 'สุวิจักขญ์', 'ก๋าใน', NULL, NULL,
  'นัท', 'knassanan.ka@gmail.com', '0930529000', 'male', '9809 ม.1 ตำบลวังเหนือ อำเภอวังเหนือ จังหวัดลำปาง 52140',
  '1520700112531', '1998-06-22', '2024-12-02', '2025-04-01',
  'SCB', '408-4-58415-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7879198a-47eb-5287-868a-46184c4e20fc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '04fb514f-9556-533d-8627-c672df09b7be',
  '68000053', 'วิธิชัย', 'วงษา', 'Vitichai', 'Wongsa',
  NULL, 'iradaida2020@gmail.com', '0929653356', 'male', '84 หมู่ที่ 3 ตำบลโคกสะอาด อำเภอภูเขียว จังหวัดชัยภูมิ 36110',
  '1361000216859', '1993-10-28', '2025-07-22', '2025-11-19',
  'SCB', '147-2-53775-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd29a237f-3405-5fad-a674-111a79fdf72a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '2d0600f8-4532-5614-b9a3-8625deb125e2',
  '68000078', 'ยุวรัตน์', 'ศรีอุทธา', 'Yuwarat', 'Sriuttha',
  'จอย', 'krphone60@gmail.com', '0967379726', 'female', NULL,
  '1471100159597', '1996-11-05', '2025-08-22', '2025-12-20',
  'SCB', '147-2-53381-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '517f9a6a-d0db-51d9-a416-0158489f3161', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '2d0600f8-4532-5614-b9a3-8625deb125e2',
  '68000084', 'อัญชลี', 'ชาตะวงค์', 'Anchalee', 'Chatawong',
  'เจนนี่', 'janmint0623@gomail.com', '0987983045', 'female', NULL,
  '1410600331266', '1997-05-06', '2025-09-22', '2026-01-20',
  'SCB', '510-4-64463-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68000096', 'มลฤดี', 'ภิญโญ', 'Monruedee', 'Phinyo',
  'อัน', 'monrudeeaun025@gmail.com', '0642478035', 'female', NULL,
  '1609900586754', '2002-12-25', '2025-10-22', '2026-02-19',
  'SCB', '156-4-44301-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4c8ac637-78b3-5d13-b3ec-f7e002e6b629', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68000099', 'สมชาย', 'เมฆจินดา', 'Somchai', 'Mekjinda',
  'ชาย', 'chai2518sam@gmail.com', '0963048487', 'male', NULL,
  '5401700048713', '1975-03-17', '2025-10-22', '2026-02-19',
  'SCB', '147-2-53957-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68000103', 'สุภาภรณ์', 'แตไธสง', NULL, NULL,
  'แนน', 'hotnan2734@gmail.com', '0639846050', 'female', NULL,
  '1103100038182', '1990-10-29', '2025-10-22', '2026-02-19',
  'SCB', '239-2-96797-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '39e57597-eb36-5a13-81b1-6405012c8f50', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '80220d20-0283-5d6a-ad56-279ea30c8331',
  '68000105', 'JUNXIN', 'CHEN', 'JUNXIN', 'CHEN',
  'JUNXIN', NULL, NULL, 'male', NULL,
  '0991029330397', '2003-09-02', '2025-04-01', '2025-07-30',
  'SCB', '120-2-64690-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '567a43db-535d-5c8d-a0f0-c5b587b72f32', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68000112', 'ราชัย', 'แสงดี', NULL, NULL,
  'เบียร์', 'beerbonfour@gmail.com', NULL, 'male', NULL,
  '1101800864709', '1997-01-30', '2025-07-03', '2025-12-22',
  'SCB', '147-2-51075-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'aceb5a8d-378a-5055-8980-0af1fe42ff72', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100004', 'รังสิมา', 'พาพันธ์', NULL, NULL,
  'เมย์', 'ma.papan9393@gmail.com', '0610637559', 'female', NULL,
  '1100702178605', '1995-12-24', '2025-11-22', '2026-03-22',
  'SCB', '132-2-53222-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '557e7170-28be-5496-aaf6-a6f8ef015d73', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100005', 'ศิลาวรรณ', 'ผ่องใส', NULL, NULL,
  'อะตอม', 'silawan3231@gmail.com', '0800524138', 'female', NULL,
  '1100400943961', '1998-04-15', '2025-11-22', '2026-03-22',
  'SCB', '132-2-53223-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '801c4439-a99d-5930-b3c6-04330b6d3aeb', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100006', 'สาวนภัสสร', 'ใจน้ำ', NULL, NULL,
  'ป่าน', 'parn2401napassorn@gmail.com', NULL, 'female', NULL,
  '1103100527591', '1998-01-24', '2025-07-16', '2025-11-12',
  'SCB', '132-2-53224-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '985acd7c-d2f5-5477-8f99-58aaceec2453', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100008', 'สาวศุภิสรา', 'อัศวภูมิ', NULL, NULL,
  'ใหม่', 'noomai.goo@gmail.com', NULL, 'female', NULL,
  '2329900021073', '1986-03-08', '2025-08-06', '2025-12-03',
  'SCB', '147-2-36124-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '9de24856-3251-5daa-90d2-c50418b50f1c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100010', 'นิรุทธ์', 'ยะไวทย์', NULL, NULL,
  'วุท', 'wutkoitc1234@gmail.com', NULL, 'male', NULL,
  '1470500153439', '1999-10-24', '2025-09-02', '2025-12-30',
  'SCB', '156-4-47119-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '96579141-0036-5180-afb0-34c949c4eb47', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100011', 'ยุทธภูมิ', 'สีประหลาด', NULL, NULL,
  'คิม', 'komrci24@gmail.com', NULL, 'male', NULL,
  '1101801473886', '2006-07-24', '2025-09-04', '2026-01-01',
  'SCB', '072-2-96058-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'db803dde-0a25-5c9c-820e-9e88125640e9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100013', 'รณชัย', 'หิรัญ', NULL, NULL,
  'บอล', 'boll.ronnachai40@gmail.com', NULL, 'male', NULL,
  '1119900743013', '1997-12-18', '2025-09-23', '2026-01-20',
  'SCB', '156-4-47976-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b18bf0ca-b052-51a9-9e12-2609feebf78d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100014', 'รณกร', 'หิรัญ', NULL, NULL,
  'บาส', 'basronnakron@gmail.com', NULL, 'male', NULL,
  '1119900743021', '1997-12-18', '2025-09-23', '2026-01-20',
  'SCB', '156-4-47973-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd3ee833a-707a-5f09-acf0-104def5a0b76', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100015', 'สาวมณีรัตน์', 'วงษ์ภักดี', NULL, NULL,
  'นิ่ม', 'wngsphakdimnirat23@gmail.com', NULL, 'female', NULL,
  '1331200085774', '1995-11-26', '2025-09-25', '2026-01-22',
  'SCB', '399-4-43647-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3a2274aa-1922-5659-ab28-ff332c027911', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100019', 'ฉัตรชัย', 'ปานเพ็ชร', NULL, NULL,
  NULL, 'chat_fah0202@hotmail.com', NULL, 'male', NULL,
  '1102001722408', '1992-05-05', '2025-11-01', '2026-02-28',
  'SCB', '147-2-54373-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5c735131-aa5c-5b05-9463-4bb622a0ffbc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100022', 'สงคราม', 'จันทะรังษี', NULL, NULL,
  'แม็ก', 'maxnum53421@gmail.com', NULL, 'male', NULL,
  '1410501134870', '1999-02-20', '2025-11-07', '2026-03-06',
  'SCB', '260-2-39630-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'fb1135d8-3185-585f-8a07-88dd63c6f813', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100026', 'สาวอรสา', 'แป้นสันเทียะ', NULL, NULL,
  'กล้า', 'boworrasa52@gmail.com', NULL, 'female', NULL,
  '1103700436766', '1991-04-18', '2025-11-17', '2026-03-16',
  'SCB', '147-2-54360-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '52d1ae36-9dfa-56e1-bb7a-69389679d153', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100031', 'สาวปานชนก', 'ศรีพรม', NULL, NULL,
  'โบว์', 'Panchnksriphrm040143@gmail.com', NULL, 'female', NULL,
  '1100201512413', '2000-01-04', '2025-11-26', '2026-03-25',
  'SCB', '162-4-34849-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd3ce9c48-2e47-57f2-a086-0767601421d0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100033', 'อัมรินทร์', 'แก้วม่วง', NULL, NULL,
  NULL, 'iceamarinza@gmail.com', NULL, 'male', NULL,
  '1101801290340', '2003-05-03', '2025-11-28', '2026-03-27',
  'SCB', '440-2-96127-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'da37a2bc-4e5a-5939-8c31-41152e00e266', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100034', 'สาวอารียา', 'บุญประกอบ', NULL, NULL,
  'ฝน', 'areeyaboonprakob49@gmail.com', NULL, 'female', NULL,
  '1349901433873', '2006-07-18', '2025-11-26', '2026-03-25',
  'SCB', '219-2-84059-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bb5b9b81-8128-5443-89d1-80e892dc3ea0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '68100037', 'วรชาติ', 'ไผ่งาม', NULL, NULL,
  NULL, 'plaplinplon@gmail.com', NULL, 'male', NULL,
  '1339200004399', '2001-08-30', '2025-12-02', '2026-03-31',
  'SCB', '219-2-84042-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '2d0600f8-4532-5614-b9a3-8625deb125e2',
  '69000002', 'มุกรินทร์', 'โพนทอง', NULL, NULL,
  NULL, 'mookkarin.mook@icloud.com', NULL, 'female', NULL,
  '5410601170561', '1998-01-15', '2026-01-21', '2026-01-21',
  'SCB', '829-2-65801-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1626dd3b-35d6-5975-8947-e2ad80b3e357', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '69000007', 'พงษ์ณภัทร', 'โคตรักษา', NULL, NULL,
  NULL, 'pongnapay1147@gmail.com', NULL, 'male', NULL,
  '1459901076271', '2004-11-29', '2026-01-08', '2026-05-07',
  'SCB', '147-2-52295-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0229c72f-ae2b-5abe-ba68-4e12f4ed387e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '69000008', 'สุกัญญา', 'เลขาพุทธิกุล', NULL, NULL,
  NULL, 'sukanya18032546@gmail.com', NULL, 'male', NULL,
  '1110217003029', '2003-03-18', '2026-01-15', '2026-05-14',
  'SCB', '219-2-76040-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '93713aeb-34a6-5c25-8207-6292fcf7caa9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '69000024', 'พิธิวัฒน์', 'ไชยโย', NULL, NULL,
  NULL, 'nuninakhab@gmail.com', NULL, 'male', NULL,
  '1340800090204', '1992-09-23', '2026-02-05', '2026-02-05',
  'SCB', '156-4-49708-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '2d0600f8-4532-5614-b9a3-8625deb125e2',
  '69000025', 'ปิยะกมล', 'ผลไม้', NULL, NULL,
  NULL, 'vitichaiw@gmail.com', NULL, 'female', NULL,
  '1471500074955', '1998-12-22', '2026-02-10', '2026-06-09',
  'SCB', '147-2-54555-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '328ce717-e6f9-51fe-80d9-841cf4b763ce', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', '8267c998-3b18-5311-981b-2ed9102c8399',
  '69000032', 'ปุณณดา', 'ครสิงห์', NULL, NULL,
  NULL, 'punnadanew1998@gmail.com', NULL, 'female', NULL,
  '1102003005762', '1999-02-20', '2026-02-23', '2026-06-22',
  'SCB', '258-2-41368-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '857a03fd-dd5b-503f-aa62-61a21027089a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41', '7b5b3908-ddae-50d1-b7ac-e44433a67b5a', 'c910955a-eb0d-5f18-a444-34cd45c8ba00',
  '69000033', 'มงคล', 'เฟื่องฟู', NULL, NULL,
  NULL, 'mngkhlfeuxngfu644@gmail.com', NULL, 'male', NULL,
  '1101801469706', '2006-06-16', '2026-02-23', '2026-06-22',
  'SCB', '410-2-60095-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '63000004', 'ปณิธิ', 'หวังเพื่อสุข', 'PANITI', 'WANGPHUEASUK',
  'โบ๊ท', 'boatmumu123@gmail.com', '0809000304', 'male', '75/99 หมู่ที่ 1 แขวงจอมทอง เขตจอมทอง กรุงเทพมหานคร 10150',
  '1102002743611', '1997-04-15', '2020-02-11', '2020-06-10',
  'SCB', '120-2-53725-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8782c4a8-1e20-576e-84bc-c26f8a7ba212', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '63000013', 'วิทุพร', 'สระแก้ว', 'WITRUPORN', 'SAKAEW',
  'แพท', 'sakaew_pat1998@gmail.com', '0929457294', 'female', '44/8 หมู่ที่ 6 ตำบลยางซ้าย อำเภอโพธิ์ทอง จังหวัดอ่างทอง 14120',
  '1101500984865', '1998-08-07', '2020-04-20', '2020-08-18',
  'SCB', '120-2-54172-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '66000103', 'วีรดา', 'ภูมินำ', 'Veerada', 'Poomnam',
  'ชมพู่', 'weeradaphumnum@gmail.com', '0629702382', 'female', '11/91 ม.2 แขวงบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150',
  '1749900848600', '2002-07-21', '2023-09-04', '2024-01-02',
  'SCB', '058-2-52549-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000016', 'พิตตินัทธ์', 'รุ่งขจรทรัพย์', 'Phittinat', 'Roongkajornsab',
  'หนุ่ย', 'guyroongkajorn19@gmail.com', '0618123059', 'male', '18 ซ,เพชรเกษม 48 แยก 21 แขวงบางด้วน เขตภาษีเจริญ กรุงเทพมหานคร 10160',
  '1102003094595', '1999-10-19', '2024-02-05', '2024-06-04',
  'SCB', '232-2-28200-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '761e2d60-c9a2-5980-8291-33d7e6003b77', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000047', 'กัญญา', 'เขียวหวาน', 'Kanya', 'Kaewwan',
  'นุ่น', 'aanawin.02077@gmail.com', '0647769737', 'female', '57/1 ซ.เฉลิมพระเกียรติ ร.9 ซ.28แยก6 แขวงดอกไม้ เขตประเวศ กรุงเทพมหานคร 10250',
  '1103300205457', '2002-08-07', '2024-04-01', '2024-07-30',
  'SCB', '434-0-20410-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '01de89c3-e9b9-5e00-9ad0-f84120e68f32', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000048', 'สุภาภรณ์', 'วงษ์เขียน', 'Supaporn', 'Wongkean',
  'อีฟ', 'minlalalalalin@gmail.com', '0825211572', 'female', '1/185 ซ.ชุมชนโค้ง1 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110',
  '1100703252370', '2001-09-29', '2024-04-01', '2024-07-30',
  'SCB', '424-0-22054-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '92434f86-a3f3-59fb-a171-2737f7e4eeb3', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000079', 'อารียา', 'เพ่งพินิจธรรม', 'Areeya', 'Pengpinijdham',
  'ยีน', 'asryean@gmail.com', '0917810182', 'female', '47 ซอยจันทน์ 43 แยก 31 แขวงทุ่งวัดดอน เขตสาทร กรุงเทพมหานคร 10120',
  '1103100535003', '1998-03-11', '2024-05-20', '2024-09-17',
  'SCB', '430-1-55513-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ac785da4-dad6-5d02-a244-5cfbcab2d652', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000122', 'ณัฐมน', 'งอยผาลา', 'Nattamon', 'Ngio-pala',
  'ป๊อบ', 'nattamonx2@gmail.com', '0988046278', 'male', '2/483ซอย, พระรามที่ 2 ซอย 54 แยก 4 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '1749900656883', '2026-01-27', '2024-07-08', '2024-11-04',
  'SCB', '239-2-89543-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '01cba86c-0fec-53e0-ae47-3d0c9b89114d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000131', 'กชกร', 'ปิ่นกุมภีร์', 'Kochkorn', 'Pinkumpee',
  'แบม', 'kochakornpinkumpee@gmail.com', '0988906298', 'female', '328 ม.5 ตำบลจรเข้สามพัน อำเภออู่ทอง จังหวัดสุพรรณบุรี 72160',
  '1730201355070', '2000-04-17', '2024-07-16', '2024-11-13',
  'SCB', '424-1-87847-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '27a88639-284e-56a1-8411-e220b1ff791c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000141', 'ณัฐมล', 'เพชไพทูรย์', 'Natthamon', 'Phetphaithun',
  'บี', 'nutthamon2502@gmail.com', '0823964928', 'female', '647 ซ.พระรามที่ 2 ซอย42 แขวงบางมด เขตจอมทอง กรุงเทพมหานคร 10150',
  '1103100729819', '2002-02-25', '2024-07-30', '2024-11-26',
  'SCB', '170-4-17202-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '14212460-9e81-582a-bb96-29396c6a6042', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '67000142', 'พลอยประกาย', 'ธรรมขันธ์', 'Ploiprakai', 'Thammakhan',
  'พลอย', 'mynameis.ploi1@gmail.com', '0649621947', 'female', '68 ถ.ศิริเกษม แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160',
  '1738700004270', '2001-09-01', '2024-07-30', '2024-11-27',
  'SCB', '437-1-15554-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '211dbd0d-5a0e-5292-a304-47b7d7558ee4', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '68000083', 'พรไพลิน', 'ปัททรัพย์', 'Pornpilin', 'Pansap',
  'นุ่น', 'pornpilin7431@gmail.com', '0614060998', 'female', '109 หมู่ที่ 5 ตำบลแหลมฟ้าผ่า อำเภอพระสมุทรเจดีย์ จังหวัดสมุทรปราการ 10290',
  '1100201674391', '2002-10-01', '2025-05-05', '2025-09-02',
  'SCB', '421-0-54371-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a8df724a-6971-57a6-9179-d322345a337a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '68000092', 'กรวรรณ', 'หล้าบ้านโพน', 'Kornwan', 'labanpon',
  'ไอซ์', 'kornwanice@gmail.com', '0944282280', 'female', '89/38 หมู่ที่ 7 ตำบลบางครุ อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1428700004621', '2002-05-27', '2025-05-22', '2025-09-19',
  'SCB', '173-2-54956-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '9802ed5a-ab9e-55c1-965c-f39d4fcac334', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '68000181', 'นิธิโชติ', 'จำพรต', 'Nitichot', 'Jumprot',
  'ปาล์ม', 'palm030344@gmail.com', '0611694810', 'male', NULL,
  '1102003258253', '2001-03-03', '2025-10-29', '2026-02-26',
  'SCB', '435-2-23184-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3335315b-d3a9-5b61-a1d7-e1c790b7379e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', '6cba8814-5f13-5eff-ae2d-b9a876484dd5', '4c30bd58-c02a-5841-bc57-3fc598f3a7b3', '8267c998-3b18-5311-981b-2ed9102c8399',
  '68000191', 'ณัชชา', 'เอื้ออุดมวโรดม', 'Natcga', 'Eurudomvarodom',
  'นิ่ม', 'nim.natcha@shd-technology.co.th', NULL, 'female', NULL,
  '1102170025470', '2002-05-19', '2025-11-03', '2026-03-03',
  'SCB', '232-2-81648-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '86febf74-ea70-54bd-a977-5fef41535de6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', '628922fd-c84a-50e9-b99e-b174bc50e9ff', '724cac40-c102-588d-aa51-23052f207e4c',
  '68000137', 'Xueyan', 'Chen', 'Xueyan', 'Chen',
  'ไอริน', 'airin.chen11@gmail.com', '0967835718', 'female', NULL,
  '0991023062366', '1992-01-25', '2025-08-25', '2025-12-22',
  'SCB', '278-2-37739-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '796a0b4c-79c4-5520-a5e6-1ca795541916', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', '628922fd-c84a-50e9-b99e-b174bc50e9ff', 'c9787d19-d00d-56bc-a62e-4db80986b59d',
  '68000265', 'ธนารีย์พร', 'สุนทรประสิทธิ์', NULL, NULL,
  NULL, 's.thanariporn@gmail.com', '0818464627', 'female', '17 ซ.เจริญนคร 9  ถ.เจริญนคร แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร 10600',
  '1102002513560', '1996-02-27', '2026-02-02', '2026-06-01',
  'SCB', '424-0-20814-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8a488bb8-0545-5437-92d3-6a291cb433f3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000174', 'จิรนันท์', 'กุลสุวรรณ', 'Chiranan', 'Kulsuwan',
  'เหมี่ยว', 'jirananklasuwan@gmil.com', '0930064915', 'female', '119 หมู่ที่ 12 ตำบลแวง อำเภอโพนทอง จังหวัดร้อยเอ็ด 45110',
  '1450701357422', '2000-04-11', '2025-01-22', '2025-05-21',
  'SCB', '417-0-86570-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '153ddbde-3392-5515-ba7b-c70713398f98', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000183', 'ธีรยาภรณ์', 'สายสนิท', 'Teerayaporn', 'Saysanit',
  'เน', 'teraya1996@gmail.com', '0930495925', 'female', '24/4 หมู่ที่ 4 ตำบลจอมปลวก อำเภอบางคนที จังหวัดสมุทรสงคราม 75120',
  '1700400247625', '1996-10-29', '2025-02-22', '2025-06-21',
  'SCB', '366-4-42254-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000202', 'วีรภัทร', 'ใจกล้า', 'Weerapat', 'Jaikla',
  'บาส', 'basza.wee@gmail.com', '0925173650', 'male', '164 หมู่ที่ 6 ตำบลทุ่งคอก อำเภอสองพี่น้อง จังหวัดสุพรรณบุรี 72190',
  '1101801034335', '1999-06-26', '2025-03-22', '2025-07-19',
  'SCB', '162-4-25643-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '186afdf0-dd25-5244-a5aa-901ef2c116f6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000203', 'วิภาวี', 'สุขปาน', 'Wiphawee', 'Sukpan',
  'ฟิว', 'wiphawdisukhpan@gmail.com', '0962169203', 'female', '110/1 หมู่ที่ 6 ตำบลท่านั่ง อำเภอโพทะเล จังหวัดพิจิตร 66130',
  '1749900675781', '1999-07-25', '2025-03-22', '2025-07-19',
  'SCB', '409-4-45278-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd9d3518f-d84f-5f04-a5e8-b1495a91462b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000213', 'อภิสิทธิ์', 'ใจกล้า', 'Apisit', 'Jaikla',
  NULL, 'kawayami3pare@gmail.com', '0809578677', 'male', NULL,
  '1101801168391', '2001-06-03', '2025-03-22', '2025-07-19',
  'SCB', '409-6-76404-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '16e2ad45-d2bc-59ca-b661-973cc8ef9642', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000238', 'วายุ', 'เลขาพุทธิกุล', 'Vayu', 'Lekhaphutthikul',
  NULL, '0645600852w@gmail.com', '0645600852', 'male', NULL,
  '1102170051217', '2005-05-12', '2024-05-22', '2024-09-18',
  'SCB', '156-4-41603-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a4e58a74-865e-511e-abad-777a9289935f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '67000242', 'ฤทัยรัตน์', 'ทองรัก', 'Ruethairat', 'Thogruk',
  NULL, 'fish756489@gmail.com', '0941862901', 'female', NULL,
  '1102001567101', '1991-07-23', '2024-05-22', '2024-09-18',
  'SCB', '407-8-60612-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a177bfbe-6129-5224-ba4e-33c497244c62', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '68000001', 'ณัฐรุจา', 'ปากวิเศษ', 'Natruja', 'Pagwiset',
  'อั้ม', 'aumyok2931@gmail.com', '0655089917', 'female', '9 หมู่ที่ 4 ตำบลวังสามัคคี อำเภอโพนทอง จังหวัดร้อยเอ็ด 45110',
  '1103100612351', '1999-09-29', '2025-05-22', '2025-09-18',
  'SCB', '413-0-07334-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b8e73cc0-3e5f-563a-8706-290ac4b62a16', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '68000022', 'อาทิตย์', 'ภาสการ', 'Arthit', 'Phasakarn',
  NULL, 'Tidheemu1699@gmail.com', '0928378162', 'male', NULL,
  '1361000319461', '1999-11-07', '2025-06-22', '2025-10-19',
  'SCB', '399-4-43494-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '76cfa76e-3fad-5ac9-84d3-efa06995ec78', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '598e95c5-e0fe-50ec-a73c-b6a400618456',
  '68000026', 'ชนิศา', 'อกอุ่น', 'Chanisa', 'Okaun',
  'นิชา', 'narin13052564@gmail.com', '0643369739', 'female', '31/1 หมู่ที่ 6 ตำบลพุทไธสง อำเภอพุทไธสง จังหวัดบุรีรัมย์ 31120',
  '1310900169970', '1998-08-22', '2025-01-22', '2025-05-21',
  'SCB', '413-0-18944-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c', 'e3f50c8d-04a4-5342-873c-935d623a00c8', '336bb825-35ca-5cc8-a74b-aad30ffd48d7',
  '68000027', 'สายธาร', 'จารุหา', 'Saithan', 'Charuha',
  NULL, 'tee0887665876@gmail.com', '0992748458', 'female', NULL,
  '1379900228907', '2003-09-08', '2025-06-22', '2025-10-19',
  'SCB', '162-4-30060-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd30e684c-33b9-563f-842a-c91c917f42b9', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '64000007', 'มานิตา', 'มูลทองสงค์', 'MANITA', 'MOONTHONGSONG',
  'ฝ้าย', 'faii.manita.m@shd-technology.co.th', '0851097645', 'female', '54/3 หมู่ที่ 7 ตำบลคลองหนึ่ง อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
  '1130200181251', '1996-04-17', '2021-02-01', '2021-05-31',
  'SCB', '383-4-40552-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '802e77f9-2e16-54cb-8074-cff31dc1ad4d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '66000060', 'รินรดา', 'ชัยวงศ์นาถ', 'Rinrada', 'Chaiwongnat',
  'เอมิ', 'amiapassaree@gmail.com', '0901380789', 'female', '38/10 ถ.22 กรกฏาคม 4 แขวงป้อมปราบ เขตป้อมปราบศัตรูพ่าย กรุงเทพมหานคร 10100',
  '1101402202277', '1999-12-11', '2023-06-01', '2023-09-28',
  'SCB', '406-7-50336-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f6e156c7-10aa-50b9-8b47-38954627ba02', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '66000062', 'ฉัตรสุรีย์', 'เมธีโรจน์', 'Chatsuree', 'Meteeroj',
  'เกล', 'prink.proundd@gmail.com', '0958296396', 'female', '111 ซ.มาเจริญ3 ม.พุทธชาด แขวงหนองแขม เขตหนองแขม กรุงเทพมหานคร 10160',
  '1100800780636', '1991-09-23', '2023-06-01', '2023-09-28',
  'SCB', '402-4-71514-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '793a1798-aebf-5b6e-b824-9c0096102698', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000006', 'สัณห์สินี', 'แซ่ตัง', 'Sansinee', 'Saetang',
  'เฟิร์น', 'Sansineesaetang@gmail.com', '0800609948', 'female', '2/16 ม.7 ตำบลหนองปลาหมอ อำเภอหนองแค จังหวัดสระบุรี 18140',
  '1329900667382', '1996-07-13', '2024-01-18', '2024-05-16',
  'SCB', '424-1-23624-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a658837b-4b2e-5ea4-873f-75abbf1882e4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000007', 'กษมาพร', 'แก้วลำพูน', 'Kasamaporn', 'Kaewlampoon',
  'นิว', 'Kasamaporn.jr@gmail.com', '0901752523', 'female', '28 ถ.มนตรี ตำบลท้ายช้าง อำเภอเมืองพังงา จังหวัดพังงา 82000',
  '1829900164378', '1997-05-31', '2024-01-17', '2024-05-15',
  'SCB', '170-4-02373-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '07011d28-ec15-5afe-8bc7-0a24f4127b26', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '2001275e-1df4-578e-b8d0-f13c7823fb9f',
  '67000017', 'วิลาสินี', 'กิจคณะ', 'Wilasinee', 'Gitkana',
  'ป่าน', 'wilasinee.g@gmail.com', '0956299979', 'female', '205 ซอยบางแวก 3 แขวงบางแวก เขตภาษีเจริญ กรุงเทพมหานคร 10160',
  '1102001620842', '1991-10-30', '2024-02-05', '2024-06-03',
  'SCB', '438-0-15975-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '13cd8ec0-e612-5049-91af-0e9f93e8e380', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000106', 'ปารณีย์', 'อัศวนนทาวงศ์', 'Paranee', 'Assawanonthawong',
  'ลูกบัว', 'wedowedo.bua@gmail.com', '0988977428', 'female', '216 ซอยเพชรเกษม 55 แขวงหลักสอง เขตบางแค กรุงเทพมหานคร 10160',
  '1102200168907', '2000-04-28', '2024-06-17', '2024-10-14',
  'SCB', '162-4-03572-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000145', 'กนกพร', 'เต็มวรทรัพย์', 'Kanokporn', 'Temvorasup',
  'น้ำตาล', 'ktemvorasup@gmail.com', '0954861462', 'female', '133 ซ.เทศา แขวงวัดราชบพิธ เขตพระนคร กรุงเทพมหานคร 10200',
  '1100801315864', '1999-08-16', '2024-08-01', '2024-11-28',
  'SCB', '170-4-19054-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'fc128aab-1f04-526d-b26d-5731d4290adf',
  '67000166', 'นวินดา', 'บุญชู', 'Nawinda', 'Boonchoo',
  'นีฟ', 'nawinda2001@gmail.com', '0922828151', 'female', '435/4 ถนนเพชรบุรี แขวงทุ่งพญาไท เขตราชเทวี กรุงเทพมหานคร 10400',
  '1100703266516', '2001-11-01', '2024-08-26', '2024-12-23',
  'SCB', '218-2-99675-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5a8848e9-1cb3-5147-b7b2-db12ec254d20', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000170', 'อรกานต์', 'วิรุฬห์ศิริ', 'Orlakarn', 'Wirunsiri',
  'จ๊ะจ๋า', 'orlakarnjaja@gmail.com', '0629565447', 'female', '209 ตรอกหลังวัดหัวลำโพง แขวงสี่พระยา เขตบางรัก กรุงเทพมหานคร 10500',
  '1100703031926', '2000-05-17', '2024-09-09', '2025-01-06',
  'SCB', '413-1-61002-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '64137af9-0eea-547a-bae4-73ddc8138906', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000172', 'กัลยกร', 'เลี่ยมไพฑูรย์', 'Kanyakorn', 'Liampaitoon',
  'เจนนี่', 'kanyakorn.liampaitoon@gmail.com', '0950617755', 'female', '2100/85 ถนนจันทร์ แขวงช่องนนทรี เขตยานนาวา กรุงเทพมหานคร 10120',
  '1100703285693', '2001-12-17', '2024-09-02', '2024-12-30',
  'SCB', '165-2-91313-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1369abad-794f-5ff7-9f9b-be437b1808ba', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000194', 'ศศิวรรณ', 'วงษ์นิล', 'Sasiwan', 'Wongnin',
  'เฟิร์น', 'sasiwan.wongnin@gmail.com', '0642299592', 'female', '241/52 หมู่ที่ 11 ตำบลหนองขาม อำเภอศรีราชา จังหวัดชลบุรี 20230',
  '1330500337930', '1996-11-28', '2024-10-15', '2025-02-11',
  'SCB', '408-8-78123-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3b01d99f-0cc2-53ec-96ca-e0f09339f37f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000212', 'พรรณวดี', 'เพ็ชรเครือ', 'Pannawadee', 'Petkrue',
  'ลูกน้ำ', 'ppetkrue.p@gmail.com', '0981450353', 'female', '13 หมู่ที่ 5 ตำบลคลองขนาน อำเภอเหนือคลอง จังหวัดกระบี่ 81130',
  '1819900284195', '1999-01-17', '2024-11-04', '2025-03-03',
  'SCB', '425-2-06098-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7290e5f6-41c8-5c86-90d1-2fab07f56bac', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000221', 'เบญจมาศ', 'เลิศพรตสมบัติ', 'Benjamat', 'Lertpotsombat',
  'หงส์', 'bjmhong43@gmail.com', '0962937015', 'female', '50 ถนนอนุวรรตน์ ตำบลในเมือง อำเภอเมืองบุรีรัมย์ จังหวัดบุรีรัมย์ 31000',
  '1319900751111', '2000-09-21', '2024-11-18', '2025-03-17',
  'SCB', '038-4-68136-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '77795aab-26bf-50e9-b8f3-064ac641b836', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '451e1dc1-89c2-5ba1-9d3d-f3c977ddb719',
  '67000222', 'ชลธิชา', 'รุวานนท์', 'Chonticha', 'Ruwanon',
  'จ๋า', 'Chonticharuwanon030988@gmail.co', '0956096566', 'female', '31/2 หมู่ที่ 1 ตำบลคลองสาม อำเภอคลองหลวง จังหวัดปทุมธานี 12120',
  '1139900308112', '1999-09-03', '2024-11-19', '2025-03-18',
  'SCB', '360-4-17160-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ebd63099-b4ee-5f5b-ae09-33845b383555', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '95ca746b-f7b7-5ba7-9c82-30f383bd431e',
  '67000234', 'โชติกานต์', 'สุขสว่างโรจน์', 'Chotikan', 'Suksawangroj',
  'เจน', 'chothikarn.suk@gmail.com', '0961564491', 'female', '1679/34-35 ถนนเทอดไทย แขวงตลาดพลู เขตธนบุรี กรุงเทพมหานคร 10600',
  '1120300083405', '1997-07-11', '2024-12-09', '2025-04-07',
  'SCB', '232-2-59740-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '625309a9-adc8-5402-a4f6-ea34aaae2b1b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '67000239', 'ลิลลี่', 'หว่อง', 'Lily', 'Wong',
  'ลิลลี่', 'lyryder.2001@gmail.com', '0614616642', 'female', '157/6 ตรอกวัดบางสะแกนอก แขวงตลาดพลู เขตธนบุรี กรุงเทพมหานคร 10600',
  '1509966143584', '2001-07-11', '2024-12-23', '2025-04-21',
  'SCB', '170-4-21875-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '84f74b39-53f4-537e-b586-22d343f2ce03', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '68000016', 'พรนัชชา', 'เกียรติมณีศรี', 'Ponnatcha', 'Kiatmaneesri',
  'มิลล์', 'Mill.pornnatcha@gmail.com', '0986965163', 'female', '144 ถ.สุขุมวิท ตำบลแสนสุข อำเภอเมืองชลบุรี จังหวัดชลบุรี 20130',
  '1101700288773', '2000-10-03', '2025-01-27', '2025-05-26',
  'SCB', '218-4-01351-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '48d6ef71-defa-58b7-b39b-7368acce71cc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '68000023', 'รุจิรดา', 'ทีปภาศน์', 'Rujirada', 'Teepapasn',
  'ต้า', 'rujirada.tee@gmail.com', '0819018853', 'female', '110/2 ซ.ทวีวัฒนา-กาญจนาภิเษก 2/1 แขวงทวีวัฒนา เขตทวีวัฒนา กรุงเทพมหานคร 10170',
  '1104800004044', '2000-06-01', '2025-02-10', '2025-06-09',
  'SCB', '408-4-81249-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '83657e81-303f-5055-ad23-ec79bc4073fd', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '68000091', 'ณฐพรรณ', 'ทองใบ', 'Nataphan', 'Tongbai',
  'เดียร์', 'nataphan.tongbai99@gmail.com', '0918319969', 'female', '37/7 ถ.เพชรพัฒนา ตำบลในเมือง อำเภอเมืองเพชรบูรณ์ จังหวัดเพชรบูรณ์ 67000',
  '1679900340232', '1995-07-17', '2025-06-23', '2025-10-20',
  'SCB', '206-2-98908-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '707b476a-8c5a-5430-89fe-021cbda2fc38', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '68000107', 'ไอยวริญ', 'บุญเจริญ', 'Iwarin', 'Booncharoen',
  'ไอเฟล', 'eiffel.kei@gmail.com', '0656251665', 'female', '546/1 ตรอกสวนหลวง 1 แขวงบางคอแหลม เขตบางคอแหลม กรุงเทพมหานคร 10120',
  '1209701912604', '1999-12-02', '2025-07-01', '2025-10-28',
  'SCB', '101-2-52277-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1826a0d5-5354-541e-abf9-df791e02c5dd', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c0fd518b-80d8-5f78-b931-5dfa77653b38',
  '68000236', 'ธนพร', 'ทรงอยู่', 'Thanapon', 'Shongyu',
  'เบล', 'thanapon.sy2311@gmail.com', '0634620318', 'female', '23/2 หมู่ที่ 5 แขวงบางสีทอง เขตบางกรวย นนทบุรี 11130',
  '1100201499841', '1999-11-23', '2026-01-05', '2026-05-04',
  'SCB', '165-4-02018-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '6006e3e6-fd6d-53c9-a31b-985b21607ba6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c9787d19-d00d-56bc-a62e-4db80986b59d',
  '68000259', 'ธีราพร', 'สุทนต์', 'Teeraporn', 'Suton',
  'จอย', 'teeraporn.suton@gmail.com', '0929340604', 'female', '88/193  หมู่ที่ 3 แขวงบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150',
  '1150400078683', '1998-12-28', '2026-01-19', '2026-05-19',
  'SCB', '156-4-19328-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1bb51058-8477-5429-b58f-cea1c9b42f89', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c4a44e60-7d78-5e1b-9aad-9b280e8d68a7',
  '66000110', 'ปริบุญญา', 'นามบุตร', 'Paribunya', 'Nambut',
  'มุกมิก', 'paribunya@gmail.com', '0876677508', 'female', '14/161 ม.4 แขวงบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150',
  '1101801136987', '2000-12-07', '2023-10-09', '2024-02-05',
  'SCB', '058-2-56611-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '92f4096b-2a1b-5143-a99a-cd7ec01d9362', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '5728df09-8350-5b1b-a56b-83bbfbad44bc', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '95b9c9f3-a3fe-51e2-84bd-0e6dd2799567',
  '67000138', 'ขวัญชัย', 'ขุมทอง', 'Khwanchai', 'Khumtong',
  'เบิร์ด', 'khwanchai.kh014@gmail.com', '0968185523', 'male', '1029/38 ซ.เพชรเกษม106 แขวงหนองค้างพลู เขตหนองแขม กรุงเทพมหานคร 10160',
  '1101800916130', '1997-10-14', '2024-07-30', '2024-11-26',
  'SCB', '432-1-91097-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f6382597-6a8c-579d-8d94-0a1193902f0f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'e730c179-a4ed-5349-9132-afa3a225d214',
  '66000086', 'สุพัฒน์พงศ์', 'สิทธิชัย', 'Supatpong', 'Sittichai',
  'โจ', 'joesongmin@gmail.com', '0647269061', 'male', '221/17 ม.2 ตำบลคลองปราบ อำเภอบ้านนาสาร จังหวัดสุราษฎร์ธานี 84120',
  '1849900178875', '1995-11-27', '2023-07-27', '2023-11-23',
  'SCB', '245-2-12088-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ee734673-cef9-596f-b7fe-5de609bc4f7c', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'f17c1393-858a-57d4-ae71-8573242c79fb',
  '67000136', 'ภูริช', 'พินิจนิยม', 'Poohrij', 'Pinitniyom',
  'ภู', 'Poohrij@gmail.com', '0927481452', 'male', '166/10 ถ.บางขุนนนท์ แขวงบางขุนนนท์ เขตบางกอกน้อย กรุงเทพมหานคร 10700',
  '1102003089613', '1999-10-05', '2024-07-30', '2024-11-26',
  'SCB', '264-4-43205-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2235859b-73c7-5c77-bdd4-0c159adb7624', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'f17c1393-858a-57d4-ae71-8573242c79fb',
  '67000137', 'โสภณ', 'สุวรรณกุลโชติ', 'Sophon', 'Suwankunlachot',
  'พล', 'sophonsuwankunlachot@gmail.com', '0863302155', 'male', '74 ซ.กำนันแม้น13 ถ.คลองบางพราน แขวงบางบอน เขตบางบอน กรุงเทพมหานคร 10150',
  '1100801218877', '1997-08-22', '2024-07-30', '2024-11-26',
  'SCB', '428-1-32574-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b54351d3-da2f-5d26-8f92-92889a1ca8ab', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'f17c1393-858a-57d4-ae71-8573242c79fb',
  '67000230', 'อาริยา', 'โช', 'Ariya', 'Cho',
  'ริชชี่', 'ariyacho.work@gmail.com', '0837545987', 'female', '157/6 ตรอกวัดบางสะแกนอก แขวงตลาดพลู เขตธนบุรี กรุงเทพมหานคร 10600',
  '1100401020247', '2000-01-06', '2024-12-02', '2025-03-31',
  'SCB', '170-4-21262-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '09359ced-93b1-5e0b-9ee9-fabb567d48b0', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'f17c1393-858a-57d4-ae71-8573242c79fb',
  '68000215', 'ศุภัชฌา', 'สุขสมัย', 'Suphatcha', 'Suksamai',
  'เปียโน', 'suphatcha.suk43@gmail.com', '0829720925', 'female', '69/104 ศาลาธรรมสพน์ 36 แขวงศาลาธรรสพน์ เขตทวีวัฒนา กรุงเทพมหานคร 10170',
  '1101801100745', '2000-06-16', '2025-11-24', '2026-03-23',
  'SCB', '162-2-97371-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '68718dc3-bd6a-5360-a508-bf786665cf8b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '126cd19d-d518-5529-8388-6ba2f1bbed5e',
  '65000026', 'ชนิตา', 'กัลยาณภาคย์', 'CHANITA', 'KANLAYANAPAK',
  'โบ๊ท', 'boat.chanita@shd-technology.co.th', '0661544558', 'female', '164 หมู่ที่ 6 ตำบลบางครุ อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1102002511257', '1996-02-24', '2022-05-10', '2022-09-06',
  'SCB', '417-1-29340-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c082977a-0bc1-5dde-b47f-0ed372760372', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '66000043', 'ศิริศักดิ์', 'รักพร้า', 'Sirisak', 'Rakpra',
  'อาหลู', 'arm0981329348@gmail.com', '0619592486', 'male', '14 ม.9 ตำบลบ้านยาง อำเภอลำทะเมนชัย จังหวัดนครราชสีมา 30270',
  '1301701375457', '2002-03-15', '2023-05-08', '2023-09-04',
  'SCB', '412-1-69932-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'dec74611-986e-5d89-b59e-1b7934707223', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '126cd19d-d518-5529-8388-6ba2f1bbed5e',
  '66000057', 'วิรัญญา', 'วันสืบ', 'Wiranya', 'Wansueb',
  'มิ้น', 'Wiranya5674@gmail.com', '0863755734', 'female', '298/372 ม.4 ตำบลในคลองบางปลากด อำเภอพระสมุทรเจดีย์ จังหวัดสมุทรปราการ 10290',
  '1119700054044', '1999-11-07', '2023-05-25', '2023-09-21',
  'SCB', '439-0-21066-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5c65c996-3864-5ef9-8a32-43096cabc679', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'eff4fb8e-7f24-585c-bd6d-ecb4b350e806',
  '66000065', 'ชณิตา', 'พึ่งสุรภาพ', 'Chanita', 'Phuengsuraphap',
  'แบม', 'chanitabam9@gmail.com', '0612858859', 'female', '286/7 ถ.พระรามที่ 3 แขวงบางโคล่ เขตบางคอแหลม กรุงเทพมหานคร 10120',
  '1319900700347', '1999-11-15', '2023-06-01', '2023-09-28',
  'SCB', '019-4-01879-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '126cd19d-d518-5529-8388-6ba2f1bbed5e',
  '66000081', 'วชิราภรณ์', 'นีละมัย', 'Wachiraporn', 'Neelamai',
  'น้ำเพชร', 'Petch031142@gmail.com', '0811491934', 'female', '235 ถ.นครราชสีมา แขวงดุสิต เขตดุสิต กรุงเทพมหานคร 10300',
  '1103702915301', '1999-11-03', '2023-07-18', '2023-11-14',
  'SCB', '428-1-45391-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'da050d9a-49bb-5707-90e3-df3936e06ee2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '66000090', 'ณัฐชา', 'อัศวเสนา', 'Nattacha', 'Asvasena',
  'จ๋อมแจ๋ม', 'nattachaasvasena@gmail.com', '0634128028', 'female', '22 ซ.ลาดพร้าว 80 แยก 22 แขวงวังทองหลาง เขตวังทองหลาง กรุงเทพมหานคร 10310',
  '1103703139631', '2000-11-10', '2023-08-15', '2023-12-12',
  'SCB', '440-3-15825-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '081bda8b-41a9-5b6d-8438-d9956686312d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '126cd19d-d518-5529-8388-6ba2f1bbed5e',
  '67000025', 'เพชรน้ำหนึ่ง', 'ลิมปจิตคุตาภรณ์', 'Phetnamnueng', 'Limpajitkutapo',
  'เพชร', 'classfor6623@gmail.com', '0895050206', 'male', '38/17 ซอยพระยามนธาตุฯ แยก 12 แขวงคลองบางบอน เขตบางบอน กรุงเทพมหานคร 10150',
  '1100401130905', '2002-06-17', '2024-02-19', '2024-06-17',
  'SCB', '156-2-95246-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd598a557-45d1-573f-91b1-596205ba1d6d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '67000030', 'นัฐธินี', 'เสาสูง', 'Nuttinee', 'Saosoong',
  'ฟาง', 'Nuttinee.saosoong04@gmail.com', '0649358352', 'female', '103/2 ม.2 ตำบลสำโรงใต้ อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1100702932610', '1999-10-04', '2024-02-27', '2024-06-25',
  'SCB', '411-1-31416-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ac2495ca-9f04-573b-b948-762cb2d9181e', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '67000121', 'สิทธิพงษ์', 'คงสิน', 'Sitthiphong', 'Khongsin',
  'สตางค์', 'sitthiphong_44@icloud.com', '0918256019', 'male', '174 หมู่ที่ 2 ตำบลสมอทอง อำเภอท่าชนะ จังหวัดสุราษฎร์ธานี 84170',
  '1840701093740', '2001-10-11', '2024-07-08', '2024-11-04',
  'SCB', '436-1-90378-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '51cd8c49-fbde-5867-972d-3d0652dd2fd2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '67000155', 'ศรีนภา', 'ตันงาม', 'Sinapha', 'Tanngam',
  'พิม', 'sinaphatanngam@gmail.com', '0839812319', 'female', '38/6 ซ.พระยามนธาตุฯ แยก12 แขวงคลองบางบอน เขตบางบอน กรุงเทพมหานคร 10150',
  '1103100774903', '2003-02-28', '2024-08-14', '2024-12-11',
  'SCB', '440-2-96061-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '05ff0a88-7333-5168-85d3-7e41b4132f9d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '67000206', 'วิมลสิริ', 'มณีเจริญ', 'Wimonsiri', 'Manecharoen',
  'ฟิวส์', 'wimonsirifiw@gmail.com', '0812728906', 'female', '57 หมู่ที่ 21 ตำบลประสงค์ อำเภอท่าชนะ จังหวัดสุราษฎร์ธานี 84170',
  '1860401224351', '2001-11-27', '2024-10-29', '2025-02-25',
  'SCB', '055-2-57912-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '67000216', 'ไอรินลดา', 'อารยะเรืองปัญญา', 'Airinlada', 'Arayaruengpanya',
  'กัสต์', 'helenxgust1998@gmail.com', '0954806364', 'female', '128/45 หมู่ที่ 5 ตำบลในคลองบางปลากด อำเภอพระสมุทรเจดีย์ จังหวัดสมุทรปราการ 10290',
  '1102002880520', '1998-02-19', '2024-11-11', '2025-03-10',
  'SCB', '416-2-06670-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '68000031', 'ทัชชาพิชญ์', 'ชยรัฐสิริมงคล', 'Thatchaphit', 'Chayaratsirimon',
  'มิว', 'thatchaphit.chaya@gmail.com', '0946507640', 'male', '135 หมู่ที่ 9 ตำบลออย อำเภอปง จังหวัดพะเยา 56140',
  '1539900729416', '2000-08-22', '2025-02-18', '2025-06-17',
  'SCB', '707-2-87694-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '86ec31d6-74a7-515f-b8cb-ef8aea291ff2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '68000184', 'วิภาณี', 'หลูโป', 'Wipanee', 'Lupo',
  'นุ้ย', 'wiphanihlupo1@gmail.com', '0997578166', 'female', '177/55 หมู่ที่ 2 แขวงบางขุนเทียน เขตจอมทอง กรุงเทพมหานคร 10150',
  '1101501085431', '2001-01-10', '2025-11-03', '2026-03-02',
  'SCB', '062-2-32451-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '85a24d25-201f-54d6-9d29-c4131a11c151', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '68000185', 'นวกชมณ', 'ผลจันทร์', 'Nawakotchamon', 'Phonchan',
  'มุกดา', 'chamook.cs25@gmail.com', '0650989218', 'female', '142 หมู่ที่ 1 ตำบลท่าเกษม อำเภอเมืองสระแก้ว จังหวัดสระแก้ว 27000',
  '2471201051161', '2000-12-25', '2025-11-03', '2026-03-02',
  'SCB', '147-2-51027-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '457a6c56-7848-5815-a0ab-048a6f040c42', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '68000238', 'ชลิดา', 'เพิ่มชาติ', 'Charida', 'Pirmchat',
  'ฟ้าใส', 'fhasaicharida@gmail.com', '0624359342', 'female', '39 ซอย ราษฎร์บูรณะ 10 แขวงบางปะกอก เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140',
  '1101801289503', '2003-04-26', '2026-01-07', '2026-05-07',
  'SCB', '416-2-12606-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '164af1a8-f546-5c2f-ac90-c75cbb27dcb2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '68000247', 'ภูมิปรมภัทร์', 'บุญภูงา', 'Poomparamapat', 'Boonpoonga',
  'ไช้', 'poomparamapat.chai@gmail.com', '0942968159', 'male', '99/64 หมู่ที่ 3 แขวงบึงสนั่น เขตธัญบุรี ปทุมธานี 12110',
  '1103703422006', '2000-04-30', '2026-01-06', '2026-05-06',
  'SCB', '588-2-60553-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '01e70aa5-7aa3-5dfd-94de-8449453da0c0', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'c33c01be-8ca2-597c-857f-5559107270b5',
  '68000257', 'ณัฐนันท์', 'ด่านแก้ว', NULL, NULL,
  'แบมแบม', 'bbamiiz.chatt@gmail.com', '0825298228', 'female', '81/521 ซอย ประชาอุทิศ 79 แขวงทุ่งครุ เขตทุ่งครุ กรุงเทพมหานคร 10140',
  '1103100665063', '2000-10-28', '2026-02-01', '2026-05-07',
  'SCB', '413-1-29532-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7dd15c7c-248f-5d8b-8d66-8ee53e9680b5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'eff4fb8e-7f24-585c-bd6d-ecb4b350e806',
  '69000041', 'อนุชา', 'ร้อยแก้ว', NULL, NULL,
  'เอก', 'Roykaewww@gmail.com', '0659960962', 'male', 'เลขที่ 270  ซ.ประชาอุทิศ แขวงบางมด เขตทุ่งครุ กรุงเทพมหานคร 10140',
  '1101800906541', '1997-09-09', '2026-03-02', '2026-06-30',
  'SCB', NULL, NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c88c6626-a374-539d-930b-306136977997', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000018', 'ฐิติรัตน์', 'พานทอง', 'Thitirat', 'Panthong',
  'ไอซ์', 'thitirat.panth@gamil.com', '0969203934', 'female', '119/82 ถนนนครลุง แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160',
  '1102002991453', '1998-12-20', '2024-02-05', '2024-06-03',
  'SCB', '162-2-94488-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'f17c1393-858a-57d4-ae71-8573242c79fb',
  '67000039', 'สุกัญญา', 'คำสวาสดิ์', 'Sukanya', 'Kamsawat',
  'เป๊ก', 'sky.sukanya203@gmail.com', '0902138124', 'female', '26/203 ม.11 ตำบลอ้อมน้อย อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74130',
  '1102002384972', '1995-08-02', '2024-03-18', '2024-07-15',
  'SCB', '366-4-54761-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '41081ae7-048a-58ce-a65a-04f3b3ea03c6',
  '67000040', 'ธัญพร', 'แถวเเถื่อน', 'Tanyaporn', 'Theaothuen',
  'นต', 'thanodtheao@gmail.com', '0900930651', 'female', '174/8 ม.2 ตำบลสวนหลวง อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74110',
  '1102200126961', '1994-12-05', '2024-03-18', '2024-07-15',
  'SCB', '232-2-72098-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '41081ae7-048a-58ce-a65a-04f3b3ea03c6',
  '67000041', 'กมลชนก', 'บัวประทุม', 'Kamonchanok', 'Buaprathum',
  'ตอง', 'kamonchanok.txong@gmail.com', '0957101151', 'female', '167 ถนนจอมทองบูรณะ แขวงบางปะกอก เขตราษฎร์บูรณะ กรุงเทพมหานคร 10140',
  '1100703051951', '2000-06-30', '2024-03-18', '2024-07-15',
  'SCB', '408-3-46700-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '1b793501-8afc-5531-88c1-205bf90a30e8', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000078', 'ธัญชนก', 'คำมี', 'Thanchanok', 'Kammee',
  'นุ่น', 'palmsirinthip@gmail.com', '0649952545', 'female', '18 ซอยบางแวก 26 แยก 1 แขวงบางแวก เขตภาษีเจริญ กรุงเทพมหานคร 10160',
  '1100201554213', '2000-09-24', '2024-05-20', '2024-09-16',
  'SCB', '119-2-48595-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a1532a3c-f9d0-53dc-9399-2b253ba98fa1', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000113', 'มณฑล', 'เจนนภาภัณฑ์กิจ', 'Monthon', 'Jennapapankit',
  'ว่าน', 'monthon0511@gmail.com', '0954377617', 'male', '79/3 หมู่ที่ 9 ตำบลบางยอ อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1103100716474', '2001-11-05', '2024-06-26', '2024-10-23',
  'SCB', '428-0-55140-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '42712cac-bd84-5f56-a186-61f3a30739fc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000114', 'ภาวิณี', 'นามนนท์', 'Pawinee', 'Namnon',
  'มายด์', 'Pawinee.namnon44@gmail.com', '0984215809', 'female', '16/8 หมู่ที่ 4 ตำบลปากแรต อำเภอบ้านโป่ง จังหวัดราชบุรี 70110',
  '1709800354559', '2001-01-24', '2024-06-26', '2024-10-23',
  'SCB', '240-2-60918-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '664708b3-13aa-5759-b160-9f79d6aa25c3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '4eabedf2-7783-5815-a588-a31baa939ca4',
  '67000139', 'กันตพงศ์', 'เกิดสุริยวงษ์', 'Kuntapong', 'Koedsuriyawong',
  'มิลล์', 'meiwmew2544@gmail.com', '0926975691', 'male', '139/10 ถ.เจษฎาวิธี ตำบลมหาชัย อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
  '1749900770775', '2001-02-27', '2024-07-30', '2024-11-26',
  'SCB', '409-6-48632-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '485a1650-6a25-56e8-afcc-d4b4d55a46fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '4eabedf2-7783-5815-a588-a31baa939ca4',
  '67000192', 'พสิษฐ์', 'ธีระเลิศวงศ์', 'Phasit', 'Teeralertvong',
  'ทิม', 'phasit.pb@gmail.com', '0655109632', 'male', '270 หมู่ที่ 4 ตำบลท่าไม้ อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74110',
  '1419901851887', '1999-06-10', '2024-10-07', '2025-02-03',
  'SCB', '022-4-02803-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'a005ef46-0d18-59af-831a-8ee184c1e553', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000199', 'วิชชา', 'ดาเพ็ง', 'Witcha', 'Dapeng',
  'ยีน', 'witchank3.2@gmail.com', '0954691222', 'male', '1026/83 ซ.เพชรเกษม 106 แขวงหนองค้างพลู เขตหนองแขม กรุงเทพมหานคร 10160',
  '1340701736980', '2000-10-02', '2024-10-22', '2025-02-18',
  'SCB', '414-2-04696-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '41081ae7-048a-58ce-a65a-04f3b3ea03c6',
  '67000217', 'ภูวนารถ', 'ลัดดาวัลย์', 'Puwanart', 'Laddawan',
  'อาร์ต', 'Puwanart.ap@gmail.com', '0992700391', 'male', '230/1 หมู่ที่ 1 ตำบลห้างฉัตร อำเภอห้างฉัตร จังหวัดลำปาง 52190',
  '1520100123981', '1997-10-14', '2024-11-11', '2025-03-10',
  'SCB', '435-0-85683-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '664a11a2-c908-5141-b6cf-25338e5ebed5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000228', 'ธนัตดา', 'หุ่นท่าไม้', 'Tanatda', 'Huntamai',
  'ปังปอนด์', 'pond_tanatda.01@hotmail.com', '0959103068', 'female', '108 หมู่ที่ 3 ตำบลปากคลองบางปลากด อำเภอพระสมุทรเจดีย์ จังหวัดสมุทรปราการ 10290',
  '1101501053237', '2000-05-01', '2024-11-27', '2025-03-26',
  'SCB', '315-2-77551-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'df6340d1-f9e4-5cea-96a5-27648403aab4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '67000231', 'มธุรส', 'เอี้ยงทอง', 'Maturot', 'Aengtong',
  'สับปะรด', 'maturot0902@gmail.com', '0826063696', 'female', '5/17 หมู่ที่ 19 ตำบลบางหญ้าแพรก อำเภอพระประแดง จังหวัดสมุทรปราการ 10130',
  '1119501065160', '2002-02-09', '2024-12-02', '2025-03-31',
  'SCB', '439-1-11961-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b2c6b689-9bdb-5a09-978c-92a6eb85e111', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'acde04cb-da1f-555a-a566-765a5ae784c3',
  '68000098', 'ภัทรดา', 'ยินดี', 'Pattarada', 'Yindee',
  'บ๊วย', 'ypattarada02@gmail.com', '0838266992', 'female', '123/15 ถ.วังขวา ตำบลสบตุ๋ย อำเภอเมืองลำปาง จังหวัดลำปาง 52100',
  '1529902128151', '2005-06-13', '2025-06-16', '2025-10-13',
  'SCB', '170-4-24133-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '01d9af3d-0e55-556a-aee4-1a9f49d61c4a', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', '42836a20-2a11-598b-b2f9-e7e243de4c09', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', '7b8deaf1-e9aa-5585-abb4-2cd1ee5c1bae',
  '68000253', 'สุชญา', 'สุภัทรวณิช', 'Sutchaya', 'Supataravanich',
  'พิงกี้', 'sutchaya.work@gmail.com', '0945629291', 'female', '59-61 ซอย เจริญรัถ 20 ถนน เจริญรัถ แขวงคลองต้นไทร เขตคลองสาน กรุงเทพมหานคร 10600',
  '1100800740898', '1991-11-07', '2026-01-19', '2026-05-19',
  'SCB', '333-2-35970-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5042062a-fafb-5613-bd98-6c5df5e2446e', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c1c77169-12d7-550b-9b59-52bb59664700', '6130efbf-f715-5e59-8572-f6de5c39203f', NULL,
  '68000010', 'มันฑนา', 'แซ่เล้า', 'Mantana', 'Saelao',
  'ส้มเช้ง', 'sommantana2535@gmail.com', '0886403515', 'female', '67/378 หมู่ที่ 6 ตำบลคูคต อำเภอลำลูกกา จังหวัดปทุมธานี 12130',
  '1100701604881', '1992-10-16', '2025-01-15', '2025-01-15',
  'SCB', '169-4-10200-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f48a1ebc-9a36-520b-989c-27f98a568367', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c1c77169-12d7-550b-9b59-52bb59664700', '6130efbf-f715-5e59-8572-f6de5c39203f', NULL,
  '68000109', 'อำพล', 'แก้วมณี', 'Ampol', 'Kaewmanee',
  'ไอซ์', '333momotaro777@gmail.com', '0931595424', 'male', '11/133 ถนนตากสิน-เพชรเกษม แขวงตลาดพลู เขตธนบุรี กรุงเทพมหานคร 10600',
  '3102001891249', '1976-08-11', '2025-07-01', '2025-10-29',
  'SCB', '170-4-24304-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '6a338509-e525-53ec-940c-21bd7329edf3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c1c77169-12d7-550b-9b59-52bb59664700', '6130efbf-f715-5e59-8572-f6de5c39203f', NULL,
  '69000017', 'สุริยา', 'มโนชาติ', NULL, NULL,
  NULL, 'Suriyamanochat 27@gmail.com', NULL, 'male', NULL,
  '1331700109494', '2004-09-27', '2026-02-04', '2026-06-04',
  'SCB', '424-1-83974-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '66522e0c-15d1-5f8e-9908-725c0dff39df', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c1c77169-12d7-550b-9b59-52bb59664700', '6130efbf-f715-5e59-8572-f6de5c39203f', NULL,
  '69000018', 'โกศล', 'ประสาทพรชัย', NULL, NULL,
  NULL, 'bankjoga1234@gmail.com', NULL, 'male', NULL,
  '1100400251041', '1987-01-28', '2026-02-03', '2026-02-03',
  'SCB', '304-4-08378-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '82517c4d-c0b9-54a2-ac6c-36b1799e2ed2', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c1c77169-12d7-550b-9b59-52bb59664700', '6130efbf-f715-5e59-8572-f6de5c39203f', NULL,
  '69000023', 'ญาณิศา', 'พากเพียร', NULL, NULL,
  NULL, 'Atomatom30@gmail.com', NULL, 'female', NULL,
  '1110500048883', '1996-08-30', '2026-02-07', '2026-06-07',
  'SCB', '332-2-85946-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '25a33616-f1df-53c2-ab39-7f72e7be05e4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'a8b5cc03-208b-5a4a-9e14-90b2fd3831f1', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000039', 'ศิราม', 'ทับทองคำ', NULL, NULL,
  NULL, NULL, NULL, 'male', NULL,
  '3349900795212', '1980-01-14', '2026-03-02', '2026-06-29',
  'SCB', NULL, NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0780080e-5529-5a0f-ba33-ebf948042c22', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'e172cdbf-1a69-59b8-8687-b3e6921762ff', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000160', 'เบญจพร', 'ไชยวงค์', 'Benjaporn', 'Chaiwong',
  'เบญ', 'benbenbrowny@gmail.com', '0826918864', 'female', '104 ม.9 ตำบลเชียงดาว อำเภอเชียงดาว จังหวัดเชียงใหม่ 50170',
  '1500700138564', '1992-07-18', '2024-08-22', '2024-12-20',
  'SCB', '660-2-31371-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'cf23521a-f49a-5f16-bc8e-6868ae9d2b61', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'e2cc542b-7d58-55ea-a53f-2ba65ca74217', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000240', 'ปิยะมน', 'สนมะเริง', NULL, NULL,
  NULL, 'PIYAMON1601@gmail.com', NULL, 'female', NULL,
  '1319900823864', '2001-11-27', '2026-02-02', '2026-06-02',
  'SCB', '411-2-49470-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'afe52e0b-fbee-58f4-b3e9-8256047867e0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'ded35774-6894-5b81-b083-391f61992abe', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000255', 'กัญญารัตน์', 'ป้อมเปรม', NULL, NULL,
  NULL, 'Kanyaratpomprem17@gmail.com', NULL, 'female', NULL,
  '1104300098058', '1998-10-17', '2026-01-13', '2026-05-13',
  'SCB', '405-2-30116-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'dd3ac8f8-85f9-5893-8d8d-00c705615d95', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'ded35774-6894-5b81-b083-391f61992abe', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000160', 'อามีน', 'สาเเละ', 'Ameen', 'Salaeh',
  'อามีน', 'afahjulliana@gmail.com', '0923733597', 'male', '19/2 หมู่ที่ 2 ตำบลสะเอะ อำเภอกรงปีนัง จังหวัดยะลา 95000',
  '1959901033683', '2007-04-13', '2025-09-30', '2026-01-27',
  'SCB', '508-4-55248-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b71285ba-208d-5ad4-a2bf-5c5210ab1c37', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'a023fcb8-6cac-5812-8c1a-9ab0b117c36c', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000071', 'บุญยอด', 'ดีเกิด', 'Boonyod', 'Deekerd',
  'ยอด', 'yod22.toshiba@gmail.com', '0827966074', 'male', '30 หมู่ที่2 ตำบลเที่ยงแท้ อำเภอสรรคบุรี จังหวัดชัยนาท 17140',
  '3180500159771', '1997-05-21', '2025-04-22', '2025-08-20',
  'SCB', '037-2-54867-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'bf2af5ec-b907-532c-b526-a7c25e64b444', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '25a95fb7-a785-50fa-b5b1-2c54591aa6ac', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000156', 'สราทิพย์', 'ชิณจักร์', 'Saratip', 'Chinnajak',
  'ลูกน้ำ', 'abc2322386@gmail.com', '0646566616', 'female', '25/195 ซอยนวมินทร์ 42 แยก 27 แขวงคลองกุ่ม เขตบึงกุ่ม กรุงเทพมหานคร 10240',
  '1103700892419', '1992-09-18', '2025-10-01', '2026-01-28',
  'SCB', '437-2-11591-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '525c17d6-fa6b-5b0e-936e-95a0621ea2cc', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '13d33704-4528-5238-b624-763f6d740bfe', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000187', 'สุภัทรพร', 'สุนธะวงษ์', 'Supatporn', 'Sunthawong',
  'เอิร์น', 'irene08082001@gmail.com', '0643976714', 'female', '141 หมู่ที่ 1 ตำบลหัวเรือ อำเภอเมืองอุบลราชธานี จังหวัดอุบลราชธานี 34000',
  '1349901109359', '2001-08-08', '2025-11-03', '2026-03-02',
  'SCB', '416-1-85370-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'cb15f429-7960-5737-955c-e8665139179a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'ee06b0cf-ee54-5c46-9226-111eb6cbc0be', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000200', 'พิมพร', 'สุทธิบุตร', 'Pimporn', 'Suddhibutra',
  'ไอซ์', 'icepimporn22@gmail.com', '0615364409', 'female', '104 ซอยจรัญสนิทวงศ์ 62 แขวงบางยี่ขัน เขตบางพลัด กรุงเทพมหานคร 10700',
  '1419901972994', '2025-01-31', '2025-11-13', '2026-03-12',
  'SCB', '409-5-10173-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8eb394aa-d000-50c7-8961-5e6e93d5d2fe', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '07a8742e-40f8-5929-b0d7-26327383f0bb', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000192', 'ณัฐิดา', 'สุขคณิต', 'Natthida', 'Sukkhanit',
  'ปู', 'natthidasukkhanit@gmail.com', '0933715526', 'female', '7 หมู่ที่ 4 ตำบลนาบอน อำเภอคำม่วง จังหวัดกาฬสินธุ์ 46180',
  '1468300000741', '2025-01-31', '2025-11-06', '2026-03-06',
  'SCB', '578-2-94666-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '07a8742e-40f8-5929-b0d7-26327383f0bb', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000217', 'สุดารัตน์', 'เขื่องถุ่ง', 'Sudarat', 'Khueangthung',
  'เนย', '3001sudarat@gmail.com', '0837959774', 'female', '276 หมู่ที่ 8 ตำบลดงบัง อำเภอบึงโขงหลง จังหวัดบึงกาฬ 38220',
  '1438400021040', '2025-01-31', '2025-12-05', '2026-04-04',
  'SCB', '264-4-54325-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '69f26489-1d61-535f-89a6-3a704b365993', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '484cf2f2-255e-5c04-8b16-56a40e9aad74', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '66000142', 'ลักษมี', 'แสงแก้ว', 'Luksamee', 'Saengkaew',
  'อุ้ม', 'rugtung@gmail.com', '0617569035', 'female', '38 ม.8 ตำบลบางกระสอ อำเภอเมืองนนทบุรี จังหวัดนนทบุรี 11000',
  '1100702813874', '2000-12-20', '2024-01-08', '2024-05-07',
  'SCB', '156-4-33585-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '22fc8531-282a-5628-96e2-c1ffb582f4dc', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '24db28a7-6c95-578e-a9c7-666186fa1648', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000074', 'พัสตราภรณ์', 'งามวิจิตร', 'Pastraporn', 'Ngamvijit',
  'เมย์', 'pastrapornngamvijit@gmail.com', '0991347446', 'female', '141/3 ม.1 ตำบลหนองปรือ อำเภอหนองปรือ จังหวัดกาญจนบุรี 71220',
  '1749800374410', '2004-12-16', '2024-05-13', '2024-09-10',
  'SCB', '162-4-15130-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4df3bef4-a420-51d3-9b39-6775a01e81f3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '24db28a7-6c95-578e-a9c7-666186fa1648', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000158', 'ธิติมา', 'จงจำเนียร', 'Thitima', 'Jongjumnuean',
  'มายด์', 'mindmindka10@gmail.com', '0614676061', 'female', '105/34 ม.3 ตำบลนาดี อำเภอเมืองสมุทรสาคร จังหวัดสมุทรสาคร 74000',
  '1100800871305', '1992-07-10', '2024-08-17', '2024-12-15',
  'SCB', '156-4-38953-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f7023f53-4a76-51b1-86cd-cf9f1f41ec04', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'cec69ecb-ce16-544f-b981-25f91e193deb', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000147', 'เกศราภรณ์', 'เทพธีรเทียนชัย', 'Keatsaraporn', 'Teapteerathianchai',
  'ใจ', 'kesraporntheap509@gmail.com', '0614598699', 'female', '42/9 ซอย แสมดำ 17 แขวงแสมดำ เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '3102100286599', '1981-03-19', '2025-09-05', '2026-01-02',
  'SCB', '401-6-01644-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '61391e19-c7ab-5cb2-bac6-091bc676bf1f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'cec69ecb-ce16-544f-b981-25f91e193deb', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000148', 'สมชาย', 'ม่วงประเสริฐ', 'Somchay', 'Muangprasert',
  'เซมไป', 'zembeizeroone@gmail.com', '0616069845', 'male', '18 หมู่ที่ 3 ถ.ประยูรพัฒนา ตำบลบ้านนา อำเภอจะนะ จังหวัดสงขลา 90130',
  '1103702030759', '2025-01-31', '2025-09-08', '2026-01-06',
  'SCB', '232-2-80784-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0e9d1639-6683-5898-bdc1-cd45a564f12b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '16e46b82-97e7-5fa1-97b4-40c862dd8f45', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000064', 'กฤษณะ', 'ปะระกัง', 'Kritsana', 'Parakang',
  'นัท', 'coconut__palm@hotmail.com', '0858072187', 'male', '47/143 หมู่ที่1 ตำบลบึงยี่โถ อำเภอธัญบุรี จังหวัดปทุมธานี 12130',
  '1101500436337', '1990-07-23', '2025-04-17', '2025-08-15',
  'SCB', '360-2-79439-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '2eca9aaf-ac6a-5828-980a-31e366bc7e71', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000208', 'กัลยกร', 'อุสาย', 'Kanyakorn', 'Usay',
  'เอิร์น', 'Mr.kanyakorn1@gmail.com', '0840601780', 'female', '47/3 หมู่ที่ 11 ตำบลโคกภู อำเภอภูพาน จังหวัดสกลนคร 47180',
  '1409800363224', '1998-07-29', '2025-11-21', '2026-03-20',
  'SCB', '160-4-68949-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '0112bd55-30fe-5356-b803-780b8324b198', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '2eca9aaf-ac6a-5828-980a-31e366bc7e71', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000216', 'ศรัณพร​', 'สมาน', 'Saranporn', 'Saman',
  'ซอ', 'saransrp2701@gmail.com', '0983211097', 'female', '108 ซอย เสรีไทย 71 แขวงคันนายาว เขตคันนายาว กรุงเทพมหานคร 10230',
  '1104300247037', '2000-01-27', '2025-11-28', '2026-03-27',
  'SCB', '417-2-13274-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '48c82575-eae0-57e3-98aa-b83d421e73fd', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '8e6f2476-2710-5a83-8746-6fce8f34e603', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000021', 'อนัญญ์นพ', 'เหลี่ยมมกราเจริญ', NULL, NULL,
  NULL, 'huangkub4994@gmail.com', NULL, 'male', NULL,
  '1100700008061', '1984-01-14', '2026-02-03', '2026-06-03',
  'SCB', '305-4-50317-1', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8beafe18-b109-544d-ac59-07c7810e1a92', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '8e6f2476-2710-5a83-8746-6fce8f34e603', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000028', 'สุวาภา', 'อาบสุวรรณ์', NULL, NULL,
  NULL, 'Suwaphaa@gmail.com', NULL, 'male', NULL,
  '1600800126273', '1989-10-06', '2026-02-12', '2026-02-12',
  'SCB', '313-2-85061-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'eb1ead33-8b1a-5574-9c62-487464194b46', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '8b808126-2615-5f9f-ac30-957b738bcc31', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000057', 'ลลินี', 'ประเสริฐสุข', 'Lalinee', 'Prasertsuk',
  'หญิง', 'lalineetnt@gmail.com', '0892422083', 'female', '35 ม.3 ตำบลกุดกุง อำเภอคำเขื่อนแก้ว จังหวัดยโสธร 35110',
  '3350400333548', '1980-05-01', '2024-04-19', '2024-08-17',
  'SCB', '380-2-93877-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '29031ab6-5d1c-5c39-9250-9caf4abdbc9c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '817065a2-78c9-58d0-bb23-358ca20b0b36', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000005', 'ณัฐวุฒิ', 'เซี่ยงหว่อง', NULL, NULL,
  NULL, 'somya.som2564@gmail.com', NULL, 'male', NULL,
  '1709800510631', '2007-03-14', '2026-01-23', '2026-01-23',
  'SCB', '302-4-62752-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '370635ca-4642-50d4-8f7b-a28c9fad804b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '8e6f2476-2710-5a83-8746-6fce8f34e603', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000233', 'สุกานดา', 'โสพันธ์', 'Sukanda', 'Sopan',
  'นุ้ย', 'n.sukanda12@gmail.com', '0968843240', 'female', NULL,
  '1479900315833', '1996-09-26', '2025-12-18', '2026-04-16',
  'SCB', '357-2-88522-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e4f2e946-8f12-5c41-b917-806f22fdaa71', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'b59d8328-bc9e-5290-8402-9232b7180726', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000150', 'สิรินดา', 'ปันตา', 'Sirinda', 'Panta',
  'หมิว', 'mumoo2729@gmail.com', '0930959811', 'female', '141/30 หมู่ที่ 5 ตำบลสันผีเสื้อ อำเภอเมืองเชียงใหม่ จังหวัดเชียงใหม่ 50300',
  '1501100072831', '1988-08-10', '2025-09-06', '2026-01-04',
  'SCB', '433-2-16689-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8c14d1af-9309-55ef-a6ae-12e5d4af92a9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'b59d8328-bc9e-5290-8402-9232b7180726', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000043', 'เสาวนิต', 'วงเเหวน', NULL, NULL,
  NULL, 'saovanee676@gmail.com', NULL, 'female', NULL,
  '5320100042218', '1982-03-06', '2026-03-20', '2026-07-17',
  'SCB', '816-2-39190-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '99e7fbda-e804-556f-aa77-f6d31396196d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'b42e111d-909c-5093-9b99-570aa7af0df9', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000186', 'อภิญญา', 'เมืองโคตร', 'Apinya', 'Muangkot',
  'กิ๊ก', 'Apinya0803801732@gmail.com', '0803801732', 'female', '131 หมู่ที่ 5 ตำบลหว้านใหญ่ อำเภอหว้านใหญ่ จังหวัดมุกดาหาร 49150',
  '1490600061153', '1998-11-24', '2025-11-03', '2026-03-02',
  'SCB', '164-4-36945-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'f8d4c553-8292-5f4a-a623-61a2801f54bf', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'b42e111d-909c-5093-9b99-570aa7af0df9', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000193', 'รุจิภาส', 'ปิติสานต์', 'Rujipras', 'Pitisan',
  'หมอ', 'rujipas2499@gmail.com', '0834366808', 'male', '242/35 หมู่ที่ 7 ตำบลบางโฉลง อำเภอบางพลี จังหวัดสมุทรปราการ 10540',
  '1129901856962', '2025-01-31', '2025-11-13', '2026-03-13',
  'SCB', '421-0-53652-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0033f8d2-2f7b-5ed5-acb5-6716d660c070', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000004', 'พิชิตชล', 'ยาดี', NULL, NULL,
  NULL, 'phichi2141@gmail.com', NULL, 'male', NULL,
  '1100201391438', '1998-01-21', '2026-01-25', '2026-05-25',
  'SCB', '269-2-52069-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0033f8d2-2f7b-5ed5-acb5-6716d660c070', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000103', 'จิรวดี', 'พันธ์พฤกษ์', 'Jirawadee', 'Phanperk',
  'ดา', 'jirawadee600@gmail.com', '0834449057', 'female', '41/7 ม.5 ตำบลละหาร อำเภอบางบัวทอง จังหวัดนนทบุรี 11110',
  '1129800077763', '1992-04-27', '2024-06-14', '2024-10-12',
  'SCB', '417-1-12553-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2f8de48d-9ede-562f-b143-648c0982930a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0033f8d2-2f7b-5ed5-acb5-6716d660c070', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000029', 'นรีรัตน์', 'จันทร์เปรียง', 'Nareerat', 'Ghanpreng',
  'ยุ้ย', 'yuiaui25@gmail.com', '0943837843', 'female', '1 หมู่ที่ 4 ตำบลฆะมัง อำเภอเมืองพิจิตร จังหวัดพิจิตร 66000',
  '1669900334381', '1997-07-13', '2025-02-17', '2025-06-17',
  'SCB', '422-1-61776-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd6506cfc-dc32-5135-a977-9e6ba219135a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '15d9bfd5-935a-531b-baa2-3dc2935eb881', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000034', 'อภิสิทธิ์', 'นามเสาร์', NULL, NULL,
  NULL, 'apisit0955170911@gmail.com', NULL, 'male', NULL,
  '1749900817445', '2001-12-21', '2026-02-23', '2026-06-22',
  'SCB', '432-1-83557-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b9aa155a-ae77-5480-9afa-541840cfc63f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'a8b5cc03-208b-5a4a-9e14-90b2fd3831f1', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000204', 'ชานนท์', 'แทวกระโทก', 'Chanon', 'Thaeokrathok',
  'ต้อม', 'tomchanon.2540@gmail.com', '0632165574', 'male', '476 หมู่ที่ 7 ตำบลท่ากระดาน อำเภอสนามชัยเขต จังหวัดฉะเชิงเทรา 24160',
  '1240800173496', '1997-08-13', '2025-12-01', '2026-03-23',
  'SCB', '417-1-98971-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '221f4ce3-8559-5a20-b8da-45a4bc9d9808', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '2b2a91b7-0ab9-5c88-9668-0dba64ea8f40', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000167', 'สุธีร์', 'เนยสูงเนิน', 'Suthee', 'Noesungnern',
  'บอส', 'Suthee.nae@gmail.com', '0971871682', 'male', '208 หมู่ที่ 3 ตำบลกลางเวียง อำเภอเวียงสา จังหวัดน่าน 55110',
  '1559900429862', '2003-01-31', '2025-10-03', '2026-01-30',
  'SCB', '732-2-66367-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '09650291-b21c-5341-9ac2-4cae6e1d15f4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '2b2a91b7-0ab9-5c88-9668-0dba64ea8f40', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000195', 'ธนากร', 'สุวรักษ์', 'Tanakorn', 'Suwarun',
  'กล้วย', 'klwyhlxmak@gmail.com', '0661094641', 'male', '64/6 ซอยลาดพร้าว111(ทิพย์มณี) แขวงคลองจั่น เขตบางกะปิ กรุงเทพมหานคร 10240',
  '1100703275621', '2001-11-22', '2025-11-10', '2026-03-09',
  'SCB', '206-4-56881-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '10902689-7bcc-5f16-949a-4cceb705ba47', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '3bd4e308-bf3a-5ee4-87d6-29700259b87c', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000230', 'เมธิญานี', 'รักประทุม', NULL, NULL,
  NULL, 'mathiyane3@gmail.com', '0618926144', 'female', NULL,
  '1801300266148', '1999-07-20', '2025-12-22', '2026-04-20',
  'SCB', '433-1-20107-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '6c576a7b-089a-59f0-b6b2-a9f4c04629ee', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000130', 'นันทิยา', 'โพธิสาร', 'Nanthiya', 'Phothisan',
  'อั้ม', 'nanthiyaphothisar@gmail.com', '0942864404', 'female', '133 หมู่ที่ 6 ตำบลกันทรอม อำเภอขุนหาญ จังหวัดศรีสะเกษ 33150',
  '1339200030705', '2025-01-31', '2025-08-08', '2025-12-05',
  'SCB', '409-4-98433-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c607ca11-6d7f-5ddb-bffb-2520f2c652ba', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c13eca0a-abc5-5c2a-8295-41b1a1144fdb', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000124', 'พันธิตรา', 'อ.วิจิตรอนันท์', NULL, NULL,
  NULL, 'pvijianan@gmail.com', '0982229253', 'female', '306/123 ซอยร่มเกล้า 12 แขวงมีนบุรี เขตมีนบุรี กรุงเทพมหานคร 10510',
  '1529900082862', '1985-04-16', '2025-08-01', '2025-11-27',
  'SCB', '439-1-27211-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd6781c94-8acb-5bca-8f1a-87b91b21b2a1', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'c1a947ce-18c5-5afa-b3ce-52c10e916cb2', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000016', 'มนทกานต์', 'พรมนิกร', NULL, NULL,
  NULL, 'Ootsppa@gmail.com', NULL, 'female', NULL,
  '1350101717887', '2004-06-17', '2026-02-03', '2026-02-03',
  'SCB', '430-1-60104-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '08c9ebe2-cb8b-561c-86b2-e6e2395b8491', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '66000117', 'พีระยุทธ', 'เบียดนอก', 'Peerayut', 'Baidnok',
  'ปาล์ม', 'peerayutbaidnok2532@gmail.com', '0959428931', 'male', '126 หมู่3 บ้านจระเขิหิน ตำบลจระเข้หิน อำเภอครบุรี จังหวัดนครราชสีมา 30250',
  '1309900498351', '1989-06-23', '2023-10-09', '2024-02-06',
  'SCB', '251-2-12109-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '91c83bdd-f1d8-5664-8241-a2014277fbf7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '66000122', 'ณัฐศักดิ์', 'อำนวย', 'NATTASAK', 'AMMNUAY',
  'ปาย', 'spaicooler2555@gmail.com', '0800010816', 'male', '4/209 ซ.รามคำแหง147/2 แขวงสะพานสูง เขตสะพานสูง กรุงเทพมหานคร 10240',
  '1103700653244', '1991-11-29', '2023-10-11', '2024-02-12',
  'SCB', '430-1-68443-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd75c0d8c-6cf5-5463-9f06-972464d768a9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000067', 'ธนากร', 'ธัญญาธนสุข', 'Thanakorn', 'Thanyathanasuk',
  'อัสรี', 'asreetanakorn@gmail.com', '0809017624', 'male', '1166/47 ถ.เคหะร่มเกล้า แขวงคลองสองต้นนุ่น เขตลาดกระบัง กรุงเทพมหานคร 10520',
  '1140600181101', '1998-12-22', '2024-04-26', '2024-08-24',
  'SCB', '413-1-24626-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4540c941-274c-5a7a-9b65-950a5bdbbe39', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '67000148', 'อนุวัฒน์', 'มงคล', 'Anuwat', 'Mongkol',
  'เจ๋ง', '0623391880yd@gmail.com', '0623391880', 'male', '26/3 หมู่ที่ 4 แขวงกระทุ่มราย เขตหนองจอก กรุงเทพมหานคร 10530',
  '1619900424070', '2003-07-04', '2024-08-06', '2024-12-04',
  'SCB', '413-1-30304-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'aa8e9fe9-91f0-55c0-b923-f304d75617c4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', '292dc9ea-3ba4-589d-bb52-ad96a92d6414',
  '68000207', 'ยุทธนา', 'ศรีภูมิเดิม', 'Yutthana', 'Seepoomderm',
  NULL, 'yuttana.s1919@gmail.com', NULL, 'male', NULL,
  '1459900409293', '1994-04-19', '2025-12-08', '2026-04-06',
  'SCB', '439-1-02627-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4c072784-039a-50aa-9360-5c0d655130d9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000243', 'อดิเทพ', 'กลิ่นโภคา', 'Adithep', 'Klinphokha',
  'เดียว', 'deiwziczack59@gmail.com', '0855708964', 'male', NULL,
  '1102900117400', '2025-01-31', '2025-12-29', '2026-04-28',
  'SCB', '654-2-75509-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '29a83ba9-9add-5c5b-a3b9-cf4df985e2a7', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000027', 'น้ำฝน', 'อินทร์โสม', NULL, NULL,
  NULL, 'Nafnlisom@gmail.com', NULL, 'female', NULL,
  '1480700193248', '1998-06-01', '2026-02-10', '2026-02-10',
  'SCB', '415-0-60230-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c6c80162-b3d6-5cc5-8894-74c06f8e69ff', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '67000187', 'อาทิตย์', 'สำอางค์อินทร์', 'Athit', 'Samarngin',
  'เฟิร์ส', 'mok0953263916@gmail.com', '0953263916', 'male', '37/1 ซ.ศิริเกษม21 แขวงบางไผ่ เขตบางแค กรุงเทพมหานคร 10160',
  '1104000108121', '2004-09-26', '2024-10-01', '2025-01-29',
  'SCB', '423-1-56036-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '125b70c0-b68a-55be-b901-7ae49354419b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000050', 'เอกวุฒิ', 'โซวเกียรติรุ่ง', 'Eakkawut', 'Sowkiatrung',
  'สไปร์ท', 'spriteza2323@gmail.com', '0632357929', 'male', '792/12 ซ.ริมคลองบางกอกน้อย แขวงอรุณอมรินทร์ เขตบางกอกน้อย กรุงเทพมหานคร 10700',
  '1102003512966', '2003-09-04', '2025-03-18', '2025-07-16',
  'SCB', '302-4-46574-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '821507e5-bcb7-5d3b-b6af-1bb249c93e3d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000052', 'ควีนกนก', 'แก้วทอง', 'Queenkanok', 'Kaewthong',
  'ควีน', 'queenkanokkaewthong@gmail.com', '0830177260', 'female', '40/319 ซ.ม.สุชา ถ.ทวีวัฒนา แขวงหนองค้างพลู เขตหนองแขม กรุงเทพมหานคร 10160',
  '1800901306844', '2006-12-09', '2025-03-18', '2025-07-16',
  'SCB', '435-1-81087-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd9aa9fe5-ef23-5bf5-954c-87fb722752c0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000057', 'กิตติภูมิ', 'อนันต์', 'Kittipoom', 'Anunt',
  'ภูมิ', 'poompoompoom19@gmail.com', '0939585644', 'male', '146 หมู่ที่ 6 ตำบลบ้านดู่ อำเภออาจสามารถ จังหวัดร้อยเอ็ด 45160',
  '1100201547951', '2000-08-25', '2025-03-22', '2025-07-20',
  'SCB', '120-2-62347-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b871ae33-5778-5f96-9561-2c612960b46d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '69000010', 'จิรพัฒน์', 'เอี่ยมมัน', NULL, NULL,
  NULL, 'Carolina_2528@outlook.com', NULL, 'male', NULL,
  '1101500690021', '1993-06-26', '2026-01-26', '2026-05-25',
  'SCB', '409-6-11247-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '6174c2f6-3787-5818-b109-2d49857deaa0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000026', 'กีรติ', 'แก้วย้อย', NULL, NULL,
  NULL, 'filmtvgon@gmail.com', NULL, 'male', NULL,
  '1104000109003', '2004-10-10', '2026-02-10', '2026-02-10',
  'SCB', '424-1-11714-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '866cb109-d21e-5261-b633-305274462086', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '300103da-9a71-5c86-a3ec-3a811db3312d', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '69000035', 'ชยุตพงศ์', 'แดงเรือง', NULL, NULL,
  NULL, 'Chyut8511@hotmail.com', NULL, 'male', NULL,
  '1102003151343', '2000-04-09', '2026-02-25', '2026-06-24',
  'SCB', '264-4-55675-8', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '66000157', 'ศรัญญู', 'กล่อมแก้ว', 'Saranyu', 'Klomkaew',
  'เก่ง', 'saranyuklomkaew@gmail.com', '0950034447', 'male', '52/2 ม.10 ตำบลหัวถนน อำเภอท่าตะโก จังหวัดนครสวรรค์ 60160',
  '1600800130041', '1990-04-27', '2024-01-04', '2024-05-03',
  'SCB', '121-2-40146-2', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'e9c17fc7-1f0a-5581-b47c-2650deefb509', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '67000005', 'ธีรนันท์', 'เหลือสูงเนิน', 'Theeranan', 'Lueasungnoen',
  'ตัส', 'z41astheeranan@gmail.com', '0653893221', 'male', '162/85 ม.9 ตำบลสวนหลวง อำเภอกระทุ่มแบน จังหวัดสมุทรสาคร 74110',
  '1749800380240', '2005-03-10', '2024-01-16', '2024-05-14',
  'SCB', '366-4-78275-9', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'b2aa721c-be83-502e-981b-6d5b7af9ff64', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000063', 'ชนันธร', 'ปราณี', 'Chananthorn', 'Pranee',
  'โอ๋', 'iamaoaocnt@gmail.com', '0928248855', 'female', '61/543 ม.5 หมู่บ้านพฤกษา8 ซอย 26 ตำบลลานตากฟ้า อำเภอนครชัยศรี จังหวัดนครปฐม 73120',
  '1309700076356', '1988-06-20', '2024-06-01', '2024-09-29',
  'SCB', '422-1-71345-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '8e9ac011-bd26-57e5-ad81-851a487bff74', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '67000179', 'ธาดา', 'ตันศิริสกุล', 'Thada', 'Tansirisakul',
  'อ้น', 'Tadaaonnn@gmail.com', '0889678098', 'male', '1015/1 ซอยเพชรเกษม63 แขวงหลักสอง เขตบางแค กรุงเทพมหานคร 10160',
  '1101500747651', '1994-06-29', '2024-09-17', '2025-01-15',
  'SCB', '156-2-94607-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'de5c24c4-40c0-5be8-94cd-76475d77f735', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000009', 'นิชกานต์', 'สัจจะมติ', 'Nichakan', 'Satchamati',
  'เบนซ์', 'benzmoo10@gmail.com', '0637750200', 'female', '52/24 ซอยอนามัยงามเจริญ 31 แขวงท่าข้าม เขตบางขุนเทียน กรุงเทพมหานคร 10150',
  '1101801168561', '2001-06-03', '2025-01-16', '2025-05-16',
  'SCB', '264-4-08229-6', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '7d0da298-493e-5195-80db-dcc1bf14a586', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000248', 'ศุภชัย', 'โชติชื่น', 'Suphachai', 'Chotchuen',
  'เจมส์', 'jimmy.suphachai.01@gmail.com', '0962129767', 'male', NULL,
  '1102002220431', '1994-10-13', '2026-01-05', '2026-05-04',
  'SCB', '156-4-30428-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0e83183c-58f4-50ae-a0e1-543fac413c00', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000090', 'อนุชิต', 'สังออน', 'Anuchit', 'Sungon',
  'เกลี้ยง', 'anuchic4208@gmail.com', '0985204208', 'male', '69 หมู่ที่ 15 ตำบลหนองแสง อำเภอวาปีปทุม จังหวัดมหาสารคาม 44120',
  '1440900180638', '1992-02-27', '2025-06-01', '2025-09-29',
  'SCB', '282-2-31605-3', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0e83183c-58f4-50ae-a0e1-543fac413c00', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '68000101', 'พัชรา', 'เปสุยะ', 'Patchara', 'Pasuya',
  'เจี๊ยบ', 'jeab.patchara36@gmail.com', '0935544692', 'female', '29/1 หมู่ที่ 15 ตำบลหนองแสง อำเภอวาปีปทุม จังหวัดมหาสารคาม 44120',
  '1440900180824', '1993-03-03', '2025-06-24', '2025-10-22',
  'SCB', '292-2-54711-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'd9374f1c-a86e-59dd-8bf5-907fb2e0222f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0e83183c-58f4-50ae-a0e1-543fac413c00', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000125', 'ธนินภัทร', 'รตนอนันต์', 'Thaninpat', 'Ratanaanan',
  'น้ำ', 'Thaninphat.1741@gmail.com', '0971782684', 'male', '9/14 หมู่ที่ 1 ตำบลสุรศักดิ์ อำเภอศรีราชา จังหวัดชลบุรี 20110',
  '1300501096022', '1998-01-17', '2025-08-01', '2025-11-27',
  'SCB', '778-2-41136-7', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0e83183c-58f4-50ae-a0e1-543fac413c00', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '68000146', 'วชิระ', 'ศรีดี', 'Wachira', 'Sridi',
  'น็อต', 'wachirasridee3@gmail.com ครับ', '0807427609', 'male', '132 หมู่ที่ 11 ตำบลชุมพร อำเภอเมยวดี จังหวัดร้อยเอ็ด 45250',
  '1100201838394', '2005-10-17', '2025-09-02', '2025-12-31',
  'SCB', '505-4-43032-0', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'c94818ae-36bc-5fa9-84e6-98bd394f6b6b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0e83183c-58f4-50ae-a0e1-543fac413c00', '6130efbf-f715-5e59-8572-f6de5c39203f', 'e347cad3-32cc-5d85-8595-268d594001e9',
  '69000030', 'ปิฏิพงษ์', 'บุตรสาร', NULL, NULL,
  NULL, '0985211265zxc@gmail.com', NULL, 'male', NULL,
  '1459100021380', '2004-04-07', '2026-02-19', '2026-06-18',
  'SCB', '562-4-03561-5', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;

INSERT INTO employees (
  id, company_id, branch_id, department_id, position_id,
  employee_code, first_name_th, last_name_th, first_name_en, last_name_en,
  nickname, email, phone, gender, address,
  national_id, birth_date, hire_date, probation_end_date,
  bank_name, bank_account, brand,
  employment_status, employment_type, is_active
) VALUES (
  'ec9f0a7b-07f6-5dab-8844-0002bb315e4f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '0e83183c-58f4-50ae-a0e1-543fac413c00', '6130efbf-f715-5e59-8572-f6de5c39203f', 'd1bd9606-ec95-5d03-87fd-494237be2c6e',
  '69000031', 'โอบนิธิ', 'เท่งเจียว', NULL, NULL,
  NULL, 'popsuperv02@gmail.com', NULL, 'male', NULL,
  '1209401032617', '1998-03-22', '2026-02-22', '2026-06-21',
  'SCB', '407-4-74324-4', NULL,
  'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET
  company_id=EXCLUDED.company_id, branch_id=EXCLUDED.branch_id,
  department_id=EXCLUDED.department_id, position_id=EXCLUDED.position_id,
  employee_code=EXCLUDED.employee_code, first_name_th=EXCLUDED.first_name_th,
  last_name_th=EXCLUDED.last_name_th, nickname=EXCLUDED.nickname,
  email=EXCLUDED.email, phone=EXCLUDED.phone, is_active=true;


-- ══════════════════════════════════════════════════════════════
-- STEP 8: Extra Employees (Supervisors from Extra sheet)
-- ══════════════════════════════════════════════════════════════

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-1',
  'Doris', '', 'Doris',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  'f688b0ff-487d-5053-981e-0766b0a34e09', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-2',
  'Ethan', '', 'Ethan',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  'cfabddfc-6a94-5223-95bb-042cac0be510', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-3',
  'Henry', '', 'Henry',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  'ca2dc357-bb54-58ec-bc6b-1dd46116adff', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-6',
  'Lina', '', 'Lina',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  'd9e8cf5d-16cc-5afa-9a7d-a162255ac0b7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-7',
  'Sunnie', '', 'Sunnie',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  'ed70970a-d2a0-579b-9625-28108f8bd5a1', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-8',
  'Veaw', '', 'Veaw',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  'f68ead27-976a-589b-bd3d-ab2175336a99', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-11',
  'คุณLina', '', 'คุณLina',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  '86bd7346-a362-539d-a056-f36d8b97c5f9', 'a684555a-e44d-4441-9af8-521115cd000a', '845a5fdf-7ead-52c8-8c96-25ae0c9065e8', 'EX-12',
  '宋豪玉 (Charlotte Song)', '', '宋豪玉 (Charlotte Song)',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;

INSERT INTO employees (
  id, company_id, department_id, employee_code,
  first_name_th, last_name_th, nickname,
  gender, employment_status, employment_type, is_active
) VALUES (
  '7eacee82-5283-5ec2-bfac-8c84fd854c13', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ecb1cd2c-53f0-52ca-81f6-bf6a83337231', 'EX-13',
  '廖文静 (Coco) (Coco)', '', '廖文静 (Coco) (Coco)',
  'male', 'active', 'full_time', true
) ON CONFLICT (id) DO UPDATE SET nickname=EXCLUDED.nickname, is_active=true;


-- ══════════════════════════════════════════════════════════════
-- STEP 9: Update supervisor_id for each employee
-- ══════════════════════════════════════════════════════════════
-- Add supervisor_id column if not exists
DO $$ BEGIN
  ALTER TABLE employees ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES employees(id);
EXCEPTION WHEN others THEN NULL;
END $$;

UPDATE employees SET supervisor_id = 'bd592ab4-f6a5-56da-8c9f-e16855727c08' WHERE id = 'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b';
UPDATE employees SET supervisor_id = 'e189e7d0-c010-55e8-ba56-99dfb8dbb106' WHERE id = 'bd592ab4-f6a5-56da-8c9f-e16855727c08';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = 'e33a24bf-f250-54bc-8b3e-0eaf4fe62547';
UPDATE employees SET supervisor_id = '86bd7346-a362-539d-a056-f36d8b97c5f9' WHERE id = '547d54e5-3b9c-5074-b8ff-7a70c029da58';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '87f33a2c-4186-5d58-824d-71754a1981fc';
UPDATE employees SET supervisor_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f' WHERE id = '505100f5-e973-5189-9fdd-ade03c5a9d65';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = 'e098f35b-7b09-5c1d-9542-1b158aed1702';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = 'd219c41b-264d-5125-a1a1-84e81e7cb20f';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '87b3c2cf-1067-5a7e-b717-7b5ea4000c53';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '5dc95722-7b21-5c28-b14d-406a6de0bb26';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '798d04af-f201-544d-b3d6-d77ae68ec6b2';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = 'b68624a5-e13f-52d4-99cc-2d577b9835e2';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '3ff757f7-d102-5b85-9c7b-716f3d5d256f';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = 'f9fab60d-d405-5691-9251-2651a4459ff9';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '37165ccc-a53f-50bf-af12-f069ce27e138';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '54eeadd4-2edb-5c16-935c-584e2da41515';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'a2981567-26e5-5f8c-a3ce-9853f660b533';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = '8429e766-c22a-5c55-b79d-9628732e3879';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = 'd5379adf-9d35-535a-9099-98eda97ab38f';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '58fdab55-3165-5db1-a465-d26991330ec5';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '2b405200-f740-57ad-a488-756ce95fb5d5';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '5d01aff0-34a5-5039-be00-90fd212a84c8';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '0baae162-2014-529f-880f-2624bc8a7fa5';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '5eded7cf-84e9-57fd-b8b0-c3923d7edd34';
UPDATE employees SET supervisor_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57' WHERE id = 'b41547ed-4e66-5789-ac51-1dfb787e3876';
UPDATE employees SET supervisor_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57' WHERE id = 'ea90425f-ca79-50fc-b7ac-9a29f649f225';
UPDATE employees SET supervisor_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57' WHERE id = '8c7ae749-bd6a-5e65-9601-8b6ae73381ea';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'da89221c-cacf-58c8-b46c-1292f3a8956e';
UPDATE employees SET supervisor_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57' WHERE id = 'e9631ebd-681e-5305-b1d4-101405f39833';
UPDATE employees SET supervisor_id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57' WHERE id = '7318811e-5e85-56f7-abe0-707e832578bb';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '00aac6c6-27fd-51ca-93f1-9f40deb0787c';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '2e0fa686-82fc-54f3-9381-ecca30db2c15';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '31f98fd2-9493-5f30-9a8b-683d5647c722';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '47edf2aa-8c3b-5d53-87e6-647e4d8ac594';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = '7a30a6ae-81be-5d24-aa71-3b2dfab8f149';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = '182b4acf-db08-5d7e-8f6f-c8ea178d2252';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '325a4de8-6270-53f1-8d62-ca99f1dfdd8d';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'd9ca3057-049c-5046-8390-95ec35d707b0';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'ead7fea4-52b0-5044-95d8-a70927211a86';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'bac13023-3360-5441-8c32-a81ef94010ba';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = '02463fc8-e6c5-5405-ba03-75fb92666043';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '1ecc722f-0dd1-5dca-9110-a02849e56a6c';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '4800ca0d-4d6b-5756-8751-ed4f6d53d984';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '780e64f2-2e21-55cc-ab4d-17132e63c8e6';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'd8a906e6-41d6-592d-bb22-dd02219a8d57';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = 'd7d0369a-101c-502f-a5cf-7669c0dcca45';
UPDATE employees SET supervisor_id = '8429e766-c22a-5c55-b79d-9628732e3879' WHERE id = 'c7bbe76c-0220-5ea4-b416-4acd6fca94a4';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '79209d32-cf9e-5ee5-bffa-920d45dfd7db';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = 'd5c61796-bc14-5185-8795-517eef98433f';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = 'f80a403e-f671-534e-925c-998c3bcbcb3e';
UPDATE employees SET supervisor_id = '86febf74-ea70-54bd-a977-5fef41535de6' WHERE id = '9a1cdbf7-a679-5a4c-8414-ec629c8dba28';
UPDATE employees SET supervisor_id = '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182' WHERE id = '63a37220-6950-5b93-8af6-60ec35886d6a';
UPDATE employees SET supervisor_id = '1fc1c300-7a04-55f6-af90-7a85bdb89621' WHERE id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83';
UPDATE employees SET supervisor_id = '1fc1c300-7a04-55f6-af90-7a85bdb89621' WHERE id = '45243a33-d4c9-5e54-85f4-fbb91180eca2';
UPDATE employees SET supervisor_id = '1fc1c300-7a04-55f6-af90-7a85bdb89621' WHERE id = '189ba125-bf10-5648-aaa9-442e8791c4ed';
UPDATE employees SET supervisor_id = 'e189e7d0-c010-55e8-ba56-99dfb8dbb106' WHERE id = '065f663e-401f-5593-983a-149cbbad6924';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '37da4d12-64a1-5007-846d-36f1c49d3b23';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = 'd2424c33-a067-5999-8787-90624c6de80f';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '1de4da72-36df-5bce-a298-ec902801dc5a';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '6ccf9608-9200-5b8c-8227-28427fbb54fd';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '7dd94e90-8d7b-5c5a-a951-05417269bbe6';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = 'a0d5f05b-e948-567c-9fab-f55a4aee49af';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = 'ee627c60-8120-5a24-97a4-f50c12571d41';
UPDATE employees SET supervisor_id = '065f663e-401f-5593-983a-149cbbad6924' WHERE id = '85b72e61-26c7-5a99-bb0c-15cad1e983db';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = '03054231-d09f-593c-9614-e3539576a74e';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = '57772cb0-784f-5525-b7df-bddded652e7e';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = 'd62503b0-fcc2-53c0-9890-1c98aae5c3a7';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = 'fff2b4aa-c914-52dc-b869-af609eb7a949';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = '2a137c36-1cf5-5c33-8386-cc1db2ec244a';
UPDATE employees SET supervisor_id = '04cd3508-bd0c-50e3-a676-1c63a0db7bef' WHERE id = 'bdc5955f-e72d-51ac-9419-71a04cb0e914';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '385dda09-e293-5f2d-bde4-4f663bf8d399';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '3e1111f2-00b9-538d-82ad-08524935f918';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '6fb24cf5-7d6f-50bf-a45d-893f879b9bce';
UPDATE employees SET supervisor_id = '39e57597-eb36-5a13-81b1-6405012c8f50' WHERE id = '1ae6348f-2c52-56ac-86e3-e91579348600';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'e812f3c2-feea-5992-b1c7-4fea26c4680a';
UPDATE employees SET supervisor_id = '39e57597-eb36-5a13-81b1-6405012c8f50' WHERE id = '51394f04-92ac-5a69-8516-5f7bece30192';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'cc9304a2-77ab-5ae6-80ea-d1830cf2f143';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '73826abd-667f-50cf-a372-799e1c0c3f16';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '8dbd9f52-aa10-57d2-842d-fad2a5586455';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '94b5eb99-d5f8-5278-a0f1-df3317f4762c';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'dffa9393-9791-5e33-825b-c5584a79b44d';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'e1bb913d-be36-5415-a8a6-03ee4ee3ada0';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '23ffc8a9-4fec-58a0-b289-f3a4846c61eb';
UPDATE employees SET supervisor_id = '39e57597-eb36-5a13-81b1-6405012c8f50' WHERE id = '2be66e56-c051-5bc4-96b1-2e10c91d5588';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '816e33ed-e784-582d-93b7-afe7b35abf3d';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '3f9e762a-9573-5803-a799-f409aa7d781b';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = 'cbecb087-f26d-50e0-9226-c158353aed33';
UPDATE employees SET supervisor_id = '45243a33-d4c9-5e54-85f4-fbb91180eca2' WHERE id = 'c62ae54d-1b75-5b9e-b578-de1d9b564671';
UPDATE employees SET supervisor_id = '189ba125-bf10-5648-aaa9-442e8791c4ed' WHERE id = '1ffb0382-09aa-53d0-a817-29d984423507';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = 'd0a056fc-fe69-5613-910a-de09ff7c4a88';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = '0eb5e253-d653-50a5-9352-8616c6dad676';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = 'f512ff81-3577-58b8-bc43-c165f2527d96';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = '4fdf0298-8a50-569a-9ccc-47e027bad5bf';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = '7d4edb9b-bdfd-5eb1-853b-97186b34397b';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = 'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d';
UPDATE employees SET supervisor_id = '5724ca0e-00ed-5bf6-b350-19bb67a3ca83' WHERE id = '8560d71d-54bd-5475-8503-a591f9e86510';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '05adf243-cb3e-570b-bf50-2b72a7b1f739';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'f41241e9-4510-5f92-9743-55982477ea03';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '7413f985-25f9-5031-b2df-bfaf59568792';
UPDATE employees SET supervisor_id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b' WHERE id = '70235a7f-36c5-59d8-959b-9cd3d10c925c';
UPDATE employees SET supervisor_id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b' WHERE id = 'bd56b283-9b42-568d-a514-2397a909aaee';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '5df9bf71-89a8-546a-8456-897c58407d36';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '0e1ccb9a-35e1-5441-b5b7-211ea13f6033';
UPDATE employees SET supervisor_id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b' WHERE id = '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9';
UPDATE employees SET supervisor_id = '7ab44fce-fced-5f3f-8f25-1db966f9c14b' WHERE id = 'e4d5e196-ae83-5461-ac69-7591ed03d182';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '4168d710-be67-5e11-a2b9-30b130980b5f';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'affaf1cd-7b35-522b-8cb4-9b2da375e2a1';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '1e22d175-b7ab-5634-846b-d06d493c291e';
UPDATE employees SET supervisor_id = 'f41241e9-4510-5f92-9743-55982477ea03' WHERE id = '35bbe2c8-93e5-5736-8ef8-a531fbfbe321';
UPDATE employees SET supervisor_id = 'f41241e9-4510-5f92-9743-55982477ea03' WHERE id = 'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '50876a37-ea0b-55a8-882d-a7778ef5fe34';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'c281bc5d-8b81-5652-87e9-ed6a373c9521';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'd29a237f-3405-5fad-a674-111a79fdf72a';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '517f9a6a-d0db-51d9-a416-0158489f3161';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '4c8ac637-78b3-5d13-b3ec-f7e002e6b629';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '39e57597-eb36-5a13-81b1-6405012c8f50';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '567a43db-535d-5c8d-a0f0-c5b587b72f32';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'aceb5a8d-378a-5055-8980-0af1fe42ff72';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '557e7170-28be-5496-aaf6-a6f8ef015d73';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '801c4439-a99d-5930-b3c6-04330b6d3aeb';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '985acd7c-d2f5-5477-8f99-58aaceec2453';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '9de24856-3251-5daa-90d2-c50418b50f1c';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '96579141-0036-5180-afb0-34c949c4eb47';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'db803dde-0a25-5c9c-820e-9e88125640e9';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'b18bf0ca-b052-51a9-9e12-2609feebf78d';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'd3ee833a-707a-5f09-acf0-104def5a0b76';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '3a2274aa-1922-5659-ab28-ff332c027911';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '5c735131-aa5c-5b05-9463-4bb622a0ffbc';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'fb1135d8-3185-585f-8a07-88dd63c6f813';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '52d1ae36-9dfa-56e1-bb7a-69389679d153';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'd3ce9c48-2e47-57f2-a086-0767601421d0';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'da37a2bc-4e5a-5939-8c31-41152e00e266';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'bb5b9b81-8128-5443-89d1-80e892dc3ea0';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = 'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '1626dd3b-35d6-5975-8947-e2ad80b3e357';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '0229c72f-ae2b-5abe-ba68-4e12f4ed387e';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '93713aeb-34a6-5c25-8207-6292fcf7caa9';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '328ce717-e6f9-51fe-80d9-841cf4b763ce';
UPDATE employees SET supervisor_id = '05adf243-cb3e-570b-bf50-2b72a7b1f739' WHERE id = '857a03fd-dd5b-503f-aa62-61a21027089a';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '8782c4a8-1e20-576e-84bc-c26f8a7ba212';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '761e2d60-c9a2-5980-8291-33d7e6003b77';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '01de89c3-e9b9-5e00-9ad0-f84120e68f32';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '92434f86-a3f3-59fb-a171-2737f7e4eeb3';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'ac785da4-dad6-5d02-a244-5cfbcab2d652';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '01cba86c-0fec-53e0-ae47-3d0c9b89114d';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '27a88639-284e-56a1-8411-e220b1ff791c';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '14212460-9e81-582a-bb96-29396c6a6042';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '211dbd0d-5a0e-5292-a304-47b7d7558ee4';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = 'a8df724a-6971-57a6-9179-d322345a337a';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '9802ed5a-ab9e-55c1-965c-f39d4fcac334';
UPDATE employees SET supervisor_id = '4cd519ef-216a-5a5b-8a80-3fcd0e85d777' WHERE id = '3335315b-d3a9-5b61-a1d7-e1c790b7379e';
UPDATE employees SET supervisor_id = 'e189e7d0-c010-55e8-ba56-99dfb8dbb106' WHERE id = '86febf74-ea70-54bd-a977-5fef41535de6';
UPDATE employees SET supervisor_id = '86bd7346-a362-539d-a056-f36d8b97c5f9' WHERE id = '796a0b4c-79c4-5520-a5e6-1ca795541916';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '8a488bb8-0545-5437-92d3-6a291cb433f3';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '153ddbde-3392-5515-ba7b-c70713398f98';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '186afdf0-dd25-5244-a5aa-901ef2c116f6';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'd9d3518f-d84f-5f04-a5e8-b1495a91462b';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '16e2ad45-d2bc-59ca-b661-973cc8ef9642';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'a4e58a74-865e-511e-abad-777a9289935f';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'a177bfbe-6129-5224-ba4e-33c497244c62';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'b8e73cc0-3e5f-563a-8706-290ac4b62a16';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = '76cfa76e-3fad-5ac9-84d3-efa06995ec78';
UPDATE employees SET supervisor_id = '63a37220-6950-5b93-8af6-60ec35886d6a' WHERE id = 'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = 'd30e684c-33b9-563f-842a-c91c917f42b9';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '802e77f9-2e16-54cb-8074-cff31dc1ad4d';
UPDATE employees SET supervisor_id = 'f68ead27-976a-589b-bd3d-ab2175336a99' WHERE id = 'f6e156c7-10aa-50b9-8b47-38954627ba02';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '793a1798-aebf-5b6e-b824-9c0096102698';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = 'a658837b-4b2e-5ea4-873f-75abbf1882e4';
UPDATE employees SET supervisor_id = '7eacee82-5283-5ec2-bfac-8c84fd854c13' WHERE id = '07011d28-ec15-5afe-8bc7-0a24f4127b26';
UPDATE employees SET supervisor_id = 'ed70970a-d2a0-579b-9625-28108f8bd5a1' WHERE id = '13cd8ec0-e612-5049-91af-0e9f93e8e380';
UPDATE employees SET supervisor_id = 'd9e8cf5d-16cc-5afa-9a7d-a162255ac0b7' WHERE id = '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = 'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '5a8848e9-1cb3-5147-b7b2-db12ec254d20';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = '64137af9-0eea-547a-bae4-73ddc8138906';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '1369abad-794f-5ff7-9f9b-be437b1808ba';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = '3b01d99f-0cc2-53ec-96ca-e0f09339f37f';
UPDATE employees SET supervisor_id = '86bd7346-a362-539d-a056-f36d8b97c5f9' WHERE id = '7290e5f6-41c8-5c86-90d1-2fab07f56bac';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '77795aab-26bf-50e9-b8f3-064ac641b836';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = 'ebd63099-b4ee-5f5b-ae09-33845b383555';
UPDATE employees SET supervisor_id = '86bd7346-a362-539d-a056-f36d8b97c5f9' WHERE id = '625309a9-adc8-5402-a4f6-ea34aaae2b1b';
UPDATE employees SET supervisor_id = '86bd7346-a362-539d-a056-f36d8b97c5f9' WHERE id = '84f74b39-53f4-537e-b586-22d343f2ce03';
UPDATE employees SET supervisor_id = 'cfabddfc-6a94-5223-95bb-042cac0be510' WHERE id = '48d6ef71-defa-58b7-b39b-7368acce71cc';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '83657e81-303f-5055-ad23-ec79bc4073fd';
UPDATE employees SET supervisor_id = 'cfabddfc-6a94-5223-95bb-042cac0be510' WHERE id = '707b476a-8c5a-5430-89fe-021cbda2fc38';
UPDATE employees SET supervisor_id = '07011d28-ec15-5afe-8bc7-0a24f4127b26' WHERE id = '1826a0d5-5354-541e-abf9-df791e02c5dd';
UPDATE employees SET supervisor_id = '86bd7346-a362-539d-a056-f36d8b97c5f9' WHERE id = '6006e3e6-fd6d-53c9-a31b-985b21607ba6';
UPDATE employees SET supervisor_id = 'd5379adf-9d35-535a-9099-98eda97ab38f' WHERE id = '1bb51058-8477-5429-b58f-cea1c9b42f89';
UPDATE employees SET supervisor_id = 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e' WHERE id = '92f4096b-2a1b-5143-a99a-cd7ec01d9362';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = 'f6382597-6a8c-579d-8d94-0a1193902f0f';
UPDATE employees SET supervisor_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f' WHERE id = 'ee734673-cef9-596f-b7fe-5de609bc4f7c';
UPDATE employees SET supervisor_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f' WHERE id = '2235859b-73c7-5c77-bdd4-0c159adb7624';
UPDATE employees SET supervisor_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f' WHERE id = 'b54351d3-da2f-5d26-8f92-92889a1ca8ab';
UPDATE employees SET supervisor_id = 'f6382597-6a8c-579d-8d94-0a1193902f0f' WHERE id = '09359ced-93b1-5e0b-9ee9-fabb567d48b0';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = '68718dc3-bd6a-5360-a508-bf786665cf8b';
UPDATE employees SET supervisor_id = 'f688b0ff-487d-5053-981e-0766b0a34e09' WHERE id = 'c082977a-0bc1-5dde-b47f-0ed372760372';
UPDATE employees SET supervisor_id = 'f688b0ff-487d-5053-981e-0766b0a34e09' WHERE id = 'dec74611-986e-5d89-b59e-1b7934707223';
UPDATE employees SET supervisor_id = 'f688b0ff-487d-5053-981e-0766b0a34e09' WHERE id = '5c65c996-3864-5ef9-8a32-43096cabc679';
UPDATE employees SET supervisor_id = 'f688b0ff-487d-5053-981e-0766b0a34e09' WHERE id = '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602';
UPDATE employees SET supervisor_id = 'f688b0ff-487d-5053-981e-0766b0a34e09' WHERE id = 'da050d9a-49bb-5707-90e3-df3936e06ee2';
UPDATE employees SET supervisor_id = '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5' WHERE id = '081bda8b-41a9-5b6d-8438-d9956686312d';
UPDATE employees SET supervisor_id = '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5' WHERE id = 'd598a557-45d1-573f-91b1-596205ba1d6d';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = 'ac2495ca-9f04-573b-b948-762cb2d9181e';
UPDATE employees SET supervisor_id = '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5' WHERE id = '51cd8c49-fbde-5867-972d-3d0652dd2fd2';
UPDATE employees SET supervisor_id = '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5' WHERE id = '05ff0a88-7333-5168-85d3-7e41b4132f9d';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb';
UPDATE employees SET supervisor_id = '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5' WHERE id = '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '86ec31d6-74a7-515f-b8cb-ef8aea291ff2';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '85a24d25-201f-54d6-9d29-c4131a11c151';
UPDATE employees SET supervisor_id = '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5' WHERE id = '457a6c56-7848-5815-a0ab-048a6f040c42';
UPDATE employees SET supervisor_id = 'ca2dc357-bb54-58ec-bc6b-1dd46116adff' WHERE id = '164af1a8-f546-5c2f-ac90-c75cbb27dcb2';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '01e70aa5-7aa3-5dfd-94de-8449453da0c0';
UPDATE employees SET supervisor_id = '5dc95722-7b21-5c28-b14d-406a6de0bb26' WHERE id = '7dd15c7c-248f-5d8b-8d66-8ee53e9680b5';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = 'c88c6626-a374-539d-930b-306136977997';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '1b793501-8afc-5531-88c1-205bf90a30e8';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = 'a1532a3c-f9d0-53dc-9399-2b253ba98fa1';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '42712cac-bd84-5f56-a186-61f3a30739fc';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '664708b3-13aa-5759-b160-9f79d6aa25c3';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '485a1650-6a25-56e8-afcc-d4b4d55a46fb';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = 'a005ef46-0d18-59af-831a-8ee184c1e553';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '664a11a2-c908-5141-b6cf-25338e5ebed5';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = 'df6340d1-f9e4-5cea-96a5-27648403aab4';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = 'b2c6b689-9bdb-5a09-978c-92a6eb85e111';
UPDATE employees SET supervisor_id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a' WHERE id = '01d9af3d-0e55-556a-aee4-1a9f49d61c4a';
UPDATE employees SET supervisor_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' WHERE id = '5042062a-fafb-5613-bd98-6c5df5e2446e';
UPDATE employees SET supervisor_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' WHERE id = 'f48a1ebc-9a36-520b-989c-27f98a568367';
UPDATE employees SET supervisor_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' WHERE id = '6a338509-e525-53ec-940c-21bd7329edf3';
UPDATE employees SET supervisor_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' WHERE id = '66522e0c-15d1-5f8e-9908-725c0dff39df';
UPDATE employees SET supervisor_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' WHERE id = '82517c4d-c0b9-54a2-ac6c-36b1799e2ed2';
UPDATE employees SET supervisor_id = 'da89221c-cacf-58c8-b46c-1292f3a8956e' WHERE id = '25a33616-f1df-53c2-ab39-7f72e7be05e4';
UPDATE employees SET supervisor_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15' WHERE id = '0780080e-5529-5a0f-ba33-ebf948042c22';
UPDATE employees SET supervisor_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15' WHERE id = 'cf23521a-f49a-5f16-bc8e-6868ae9d2b61';
UPDATE employees SET supervisor_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15' WHERE id = 'afe52e0b-fbee-58f4-b3e9-8256047867e0';
UPDATE employees SET supervisor_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15' WHERE id = 'dd3ac8f8-85f9-5893-8d8d-00c705615d95';
UPDATE employees SET supervisor_id = '2e0fa686-82fc-54f3-9381-ecca30db2c15' WHERE id = 'b71285ba-208d-5ad4-a2bf-5c5210ab1c37';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'bf2af5ec-b907-532c-b526-a7c25e64b444';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '525c17d6-fa6b-5b0e-936e-95a0621ea2cc';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'cb15f429-7960-5737-955c-e8665139179a';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '8eb394aa-d000-50c7-8961-5e6e93d5d2fe';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '69f26489-1d61-535f-89a6-3a704b365993';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '22fc8531-282a-5628-96e2-c1ffb582f4dc';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '4df3bef4-a420-51d3-9b39-6775a01e81f3';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'f7023f53-4a76-51b1-86cd-cf9f1f41ec04';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '61391e19-c7ab-5cb2-bac6-091bc676bf1f';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '0e9d1639-6683-5898-bdc1-cd45a564f12b';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '0112bd55-30fe-5356-b803-780b8324b198';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '48c82575-eae0-57e3-98aa-b83d421e73fd';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '8beafe18-b109-544d-ac59-07c7810e1a92';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'eb1ead33-8b1a-5574-9c62-487464194b46';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '29031ab6-5d1c-5c39-9250-9caf4abdbc9c';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '370635ca-4642-50d4-8f7b-a28c9fad804b';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'e4f2e946-8f12-5c41-b917-806f22fdaa71';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '8c14d1af-9309-55ef-a6ae-12e5d4af92a9';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '99e7fbda-e804-556f-aa77-f6d31396196d';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'f8d4c553-8292-5f4a-a623-61a2801f54bf';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '2f8de48d-9ede-562f-b143-648c0982930a';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'd6506cfc-dc32-5135-a977-9e6ba219135a';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'b9aa155a-ae77-5480-9afa-541840cfc63f';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '221f4ce3-8559-5a20-b8da-45a4bc9d9808';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '09650291-b21c-5341-9ac2-4cae6e1d15f4';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = '10902689-7bcc-5f16-949a-4cceb705ba47';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'c607ca11-6d7f-5ddb-bffb-2520f2c652ba';
UPDATE employees SET supervisor_id = 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11' WHERE id = 'd6781c94-8acb-5bca-8f1a-87b91b21b2a1';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '08c9ebe2-cb8b-561c-86b2-e6e2395b8491';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '91c83bdd-f1d8-5664-8241-a2014277fbf7';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'd75c0d8c-6cf5-5463-9f06-972464d768a9';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '4540c941-274c-5a7a-9b65-950a5bdbbe39';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'aa8e9fe9-91f0-55c0-b923-f304d75617c4';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '4c072784-039a-50aa-9360-5c0d655130d9';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'c6c80162-b3d6-5cc5-8894-74c06f8e69ff';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '125b70c0-b68a-55be-b901-7ae49354419b';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '821507e5-bcb7-5d3b-b6af-1bb249c93e3d';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'd9aa9fe5-ef23-5bf5-954c-87fb722752c0';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'b871ae33-5778-5f96-9561-2c612960b46d';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '6174c2f6-3787-5818-b109-2d49857deaa0';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '866cb109-d21e-5261-b633-305274462086';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'e9c17fc7-1f0a-5581-b47c-2650deefb509';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'b2aa721c-be83-502e-981b-6d5b7af9ff64';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '8e9ac011-bd26-57e5-ad81-851a487bff74';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'de5c24c4-40c0-5be8-94cd-76475d77f735';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '7d0da298-493e-5195-80db-dcc1bf14a586';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'd9374f1c-a86e-59dd-8bf5-907fb2e0222f';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'c94818ae-36bc-5fa9-84e6-98bd394f6b6b';
UPDATE employees SET supervisor_id = '2bcc724a-136a-5e75-ae22-e2a3471e8a41' WHERE id = 'ec9f0a7b-07f6-5dab-8844-0002bb315e4f';

-- ══════════════════════════════════════════════════════════════
-- STEP 10: Set role=manager for supervisors (users table)
-- ══════════════════════════════════════════════════════════════

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '7918f1f4-3d57-536c-8a9f-f273e8b0a6f5', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'f68ead27-976a-589b-bd3d-ab2175336a99', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '86bd7346-a362-539d-a056-f36d8b97c5f9', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '7eacee82-5283-5ec2-bfac-8c84fd854c13', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'f688b0ff-487d-5053-981e-0766b0a34e09', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'cfabddfc-6a94-5223-95bb-042cac0be510', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'ca2dc357-bb54-58ec-bc6b-1dd46116adff', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '05adf243-cb3e-570b-bf50-2b72a7b1f739', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '7ab44fce-fced-5f3f-8f25-1db966f9c14b', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'f41241e9-4510-5f92-9743-55982477ea03', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '4cd519ef-216a-5a5b-8a80-3fcd0e85d777', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '04cd3508-bd0c-50e3-a676-1c63a0db7bef', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '5724ca0e-00ed-5bf6-b350-19bb67a3ca83', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'e189e7d0-c010-55e8-ba56-99dfb8dbb106', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '065f663e-401f-5593-983a-149cbbad6924', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'd5379adf-9d35-535a-9099-98eda97ab38f', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '5dc95722-7b21-5c28-b14d-406a6de0bb26', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'f6382597-6a8c-579d-8d94-0a1193902f0f', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '8429e766-c22a-5c55-b79d-9628732e3879', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '2bcc724a-136a-5e75-ae22-e2a3471e8a41', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '07011d28-ec15-5afe-8bc7-0a24f4127b26', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '1fc1c300-7a04-55f6-af90-7a85bdb89621', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '63a37220-6950-5b93-8af6-60ec35886d6a', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '39e57597-eb36-5a13-81b1-6405012c8f50', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '86febf74-ea70-54bd-a977-5fef41535de6', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'bd592ab4-f6a5-56da-8c9f-e16855727c08', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '45243a33-d4c9-5e54-85f4-fbb91180eca2', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'da89221c-cacf-58c8-b46c-1292f3a8956e', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '189ba125-bf10-5648-aaa9-442e8791c4ed', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '2e0fa686-82fc-54f3-9381-ecca30db2c15', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), '01d9af3d-0e55-556a-aee4-1a9f49d61c4a', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'd8a906e6-41d6-592d-bb22-dd02219a8d57', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'd9e8cf5d-16cc-5afa-9a7d-a162255ac0b7', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';

INSERT INTO users (id, employee_id, role, is_active)
VALUES (gen_random_uuid(), 'ed70970a-d2a0-579b-9625-28108f8bd5a1', 'manager', true)
ON CONFLICT (employee_id) DO UPDATE SET role = 'manager';


-- ══════════════════════════════════════════════════════════════
-- STEP 11: Employee Schedule Profiles (กะแน่นอน / กะไม่แน่นอน)
-- ══════════════════════════════════════════════════════════════

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8d706038-e073-5574-801a-cf8e55993bb8', '1fc1c300-7a04-55f6-af90-7a85bdb89621', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fdde5abd-ff9d-5c90-9854-c9384b9a8c41', 'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '03ef1dfe-fb66-597e-ac05-32d1222af3ac', '5bc1ff1c-0228-580e-b9ac-69f60d749f70', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '38d7ace1-720a-5d88-a30f-2184e8f4e918', 'e189e7d0-c010-55e8-ba56-99dfb8dbb106', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b7b1ceac-edc0-5680-847d-0b0fbf998313', 'bd592ab4-f6a5-56da-8c9f-e16855727c08', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ce33e0c0-1ba0-5195-9c06-514261bb8d15', 'e33a24bf-f250-54bc-8b3e-0eaf4fe62547', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fe73886b-3a0d-5d34-b0e3-fc8c063d1157', '547d54e5-3b9c-5074-b8ff-7a70c029da58', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0febade9-f4d4-5810-830e-5bdd7711553b', '4cd519ef-216a-5a5b-8a80-3fcd0e85d777', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5eb5926b-8cab-5e02-b787-fe09114c6270', '87f33a2c-4186-5d58-824d-71754a1981fc', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'bf792c67-6684-5a66-a7ca-6e617245e7f9', '505100f5-e973-5189-9fdd-ade03c5a9d65', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6621c8ea-813e-53b1-8df8-410642b259ba', 'e098f35b-7b09-5c1d-9542-1b158aed1702', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ff1f4d25-c1e5-54de-982a-14c7f55ceff3', 'd219c41b-264d-5125-a1a1-84e81e7cb20f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fcacd47c-fb51-5a2b-8499-3ae2f7d94ec8', '87b3c2cf-1067-5a7e-b717-7b5ea4000c53', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7be3ffc9-51a5-5e0a-97cb-2513d0e4cb7d', '5dc95722-7b21-5c28-b14d-406a6de0bb26', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '268ee31c-2e9f-5fed-87d5-cd6eb77f8ae2', '798d04af-f201-544d-b3d6-d77ae68ec6b2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '86c17a8c-8b43-509c-8706-daa64885f336', 'b68624a5-e13f-52d4-99cc-2d577b9835e2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '01624002-bd2d-5eea-b9cd-284030f2bd69', '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '74026337-5491-5733-9b7d-4f9bdf3c283f', '3ff757f7-d102-5b85-9c7b-716f3d5d256f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fb1120cc-fb5f-532d-ad93-6bea4feb5744', 'f9fab60d-d405-5691-9251-2651a4459ff9', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '68780123-5b3a-5771-8015-a6bd86481714', '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f6d08664-b090-5aad-b948-76b6ace7474a', '37165ccc-a53f-50bf-af12-f069ce27e138', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6ebf6d03-6349-5739-82ae-d12df5f219b2', '54eeadd4-2edb-5c16-935c-584e2da41515', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8287d0e3-9aad-5cc0-9e27-2b8f26603d03', 'a2981567-26e5-5f8c-a3ce-9853f660b533', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6b983545-45f8-5018-a42d-d11c3be00bbe', '8429e766-c22a-5c55-b79d-9628732e3879', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8ddfcfd6-7fba-53f6-81de-0792593820e7', '2bcc724a-136a-5e75-ae22-e2a3471e8a41', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a9d9a571-875f-5da7-ab20-0021c2f0f8bd', 'd5379adf-9d35-535a-9099-98eda97ab38f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '94872b8d-4c95-5958-b23a-e32bd92a51b7', '58fdab55-3165-5db1-a465-d26991330ec5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '83937336-9680-5f33-8e64-8939aca5f61c', '2b405200-f740-57ad-a488-756ce95fb5d5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '51c427e8-537a-5911-b565-c55b52f635ee', '5d01aff0-34a5-5039-be00-90fd212a84c8', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4cc6b743-6de2-5ad3-b846-731f2604b26e', '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd329e19e-f6ac-593b-8283-a7aa92236988', '0baae162-2014-529f-880f-2624bc8a7fa5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '199a62a3-b928-5c94-aa43-77e81925ef1d', '5eded7cf-84e9-57fd-b8b0-c3923d7edd34', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '94333b7d-23d5-5d1c-889d-d7df6ed5dc7e', 'b41547ed-4e66-5789-ac51-1dfb787e3876', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1a58efc6-7ba2-56c0-a883-58e2834a30b3', 'ea90425f-ca79-50fc-b7ac-9a29f649f225', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7e11e207-63b4-5f36-b732-7ba3db5e2734', '8c7ae749-bd6a-5e65-9601-8b6ae73381ea', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '81270efd-4c99-57bf-9a45-99456971c9df', '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '02e387e2-ed7b-5c0c-8d26-7ab41f41557d', 'da89221c-cacf-58c8-b46c-1292f3a8956e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '20875e89-1859-531b-bdfd-fbd6aa7899e5', 'e9631ebd-681e-5305-b1d4-101405f39833', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4a7e0830-fed2-50b4-9aca-5243958e508d', '7318811e-5e85-56f7-abe0-707e832578bb', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1c804840-116a-5dd5-bfe0-ca111a592be6', '00aac6c6-27fd-51ca-93f1-9f40deb0787c', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'cb1bbb6c-d195-5339-b3b3-52574ee6ff4f', 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{wed}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0b9184fd-32cc-548a-b38f-5922d06e4b2e', '2e0fa686-82fc-54f3-9381-ecca30db2c15', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{wed}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '983289ce-6464-58bd-b43e-ca17c02ab740', '31f98fd2-9493-5f30-9a8b-683d5647c722', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c15b9962-90c4-574e-86ac-611627e639cd', '47edf2aa-8c3b-5d53-87e6-647e4d8ac594', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5bd4dd70-8eaa-55fa-bfd5-b7a614613676', '7a30a6ae-81be-5d24-aa71-3b2dfab8f149', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3e30f6f2-b630-54eb-8ecf-b970a0a04de4', '182b4acf-db08-5d7e-8f6f-c8ea178d2252', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4a6c1a77-6b18-5a4a-bdc8-19a482d27012', '325a4de8-6270-53f1-8d62-ca99f1dfdd8d', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '49ac4b03-b1cc-5beb-abf4-ceea6f29199d', 'd9ca3057-049c-5046-8390-95ec35d707b0', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '290f3308-2874-5837-aac2-623608ce84b3', '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '13319cb4-4156-5302-ad1b-190c44cb4b71', 'ead7fea4-52b0-5044-95d8-a70927211a86', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a07f833b-8a88-51a0-82a9-2584129643ff', 'bac13023-3360-5441-8c32-a81ef94010ba', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b10afa4b-7a53-5d9e-93c3-70acebabd844', '02463fc8-e6c5-5405-ba03-75fb92666043', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e196b21d-99ca-56b0-89d1-6fe7b3eed7eb', '1ecc722f-0dd1-5dca-9110-a02849e56a6c', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8a74f340-c59e-5e9e-bc9b-6b3e2d398cb7', '4800ca0d-4d6b-5756-8751-ed4f6d53d984', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c4e056e0-f975-5dfc-b98f-c530cd3f7e0f', '780e64f2-2e21-55cc-ab4d-17132e63c8e6', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e11bcbef-4c10-5f4f-b061-a4cc737b4ca4', 'd8a906e6-41d6-592d-bb22-dd02219a8d57', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'cde2afa8-d1ee-51fe-a04c-c1c8d225193b', 'd7d0369a-101c-502f-a5cf-7669c0dcca45', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f02fe993-a12e-5203-9fe8-ee63a93785d6', 'c7bbe76c-0220-5ea4-b416-4acd6fca94a4', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ef70565b-9639-581c-b49f-6b00d0580352', '79209d32-cf9e-5ee5-bffa-920d45dfd7db', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'bcfdc601-5b81-5103-8a1d-b05b916ee875', 'd5c61796-bc14-5185-8795-517eef98433f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '724cfd75-0d5d-55ae-b14d-70d9d3f0b43a', 'f80a403e-f671-534e-925c-998c3bcbcb3e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e10580d5-d882-55ea-b306-890b01b02a2e', '9a1cdbf7-a679-5a4c-8414-ec629c8dba28', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ec4962f5-a092-591c-aa1f-1a5c7c98d3b4', '63a37220-6950-5b93-8af6-60ec35886d6a', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e410bb67-13fc-5a04-aed4-4cb632a8208c', '5724ca0e-00ed-5bf6-b350-19bb67a3ca83', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f4274453-8f2f-5f4e-8b67-6a860cc617e2', '45243a33-d4c9-5e54-85f4-fbb91180eca2', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0f4c3d86-78b3-5c54-8a18-3289d15f9d9c', '189ba125-bf10-5648-aaa9-442e8791c4ed', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2e35beb5-82b0-54ed-8251-e62717563267', '065f663e-401f-5593-983a-149cbbad6924', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8798e0c2-12c7-5e42-bc98-3e76e0ad4c32', '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '960089e6-fd30-54ac-af0e-7c8520df23ab', '37da4d12-64a1-5007-846d-36f1c49d3b23', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '84e88c26-99d7-5af1-a769-1a94858f6990', '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd1a0e2a3-87ff-57f6-b4e5-9cd2a04c63c9', '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a5fdad39-3b1d-59f2-a142-f666811fb6c1', 'd2424c33-a067-5999-8787-90624c6de80f', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '36ee6fb7-92e0-5e8a-9f04-79ec4204e42a', '1de4da72-36df-5bce-a298-ec902801dc5a', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'dbb12ac1-a88b-502b-9b32-29a73ccb1901', '6ccf9608-9200-5b8c-8227-28427fbb54fd', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '173a24f8-52a9-5318-a061-6d91a7030c20', '7dd94e90-8d7b-5c5a-a951-05417269bbe6', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e65b5f62-57c3-52ff-b703-b942a1ee13fb', 'a0d5f05b-e948-567c-9fab-f55a4aee49af', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3d0f32d2-8a1c-5e58-8625-239c24e3060d', 'ee627c60-8120-5a24-97a4-f50c12571d41', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ec53a258-42dc-5852-802b-677fcbe0cb62', '85b72e61-26c7-5a99-bb0c-15cad1e983db', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'febd84f8-4684-5663-b440-4263a927109f', '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '11baf012-0a7b-5d93-a620-e155165d476e', '03054231-d09f-593c-9614-e3539576a74e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f70cea0a-2f66-5052-bb09-138510cac738', '57772cb0-784f-5525-b7df-bddded652e7e', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0edbf704-5a43-5170-8180-81ce7a529082', '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '306ab303-9433-5788-b969-7e81215bf021', 'd62503b0-fcc2-53c0-9890-1c98aae5c3a7', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '52bf9301-4059-5906-bad6-056fe2d4cc3b', 'fff2b4aa-c914-52dc-b869-af609eb7a949', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'bd907469-07f2-5a15-8cb0-55050e456919', '2a137c36-1cf5-5c33-8386-cc1db2ec244a', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fdfd28bf-71b0-59b3-a39f-7d82fd7e53b0', 'bdc5955f-e72d-51ac-9419-71a04cb0e914', 'a684555a-e44d-4441-9af8-521115cd000a', 'fixed',
  '5186951d-4565-5028-8cd6-c7e7347c1109', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1fff4307-fd53-5dd0-8960-59417ce75cae', 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c58820f6-d3d2-58b3-96df-0629d1876d53', '04cd3508-bd0c-50e3-a676-1c63a0db7bef', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd9b78ec6-50c7-5394-99a8-bcb50f5f2174', '998d6f38-fcad-58dd-a19c-50c9d7a5a846', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8a1d2fd1-0702-54f2-a578-8e1bd586da3b', '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f951b586-3bf4-5381-81e7-d186098c5476', '385dda09-e293-5f2d-bde4-4f663bf8d399', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd9a97163-9599-5a62-ae80-9c670b88d330', '3e1111f2-00b9-538d-82ad-08524935f918', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '74dc1753-af05-5d4e-bb94-158cae2251e9', '6fb24cf5-7d6f-50bf-a45d-893f879b9bce', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b5b620e6-5dd1-5363-87b3-985c6f550ccb', '1ae6348f-2c52-56ac-86e3-e91579348600', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0d587757-421a-51c2-b6f2-337126ae6114', 'e812f3c2-feea-5992-b1c7-4fea26c4680a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e18ee063-7d5e-520a-80cb-e23e510e1de5', '51394f04-92ac-5a69-8516-5f7bece30192', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '745cb2e7-90f4-5984-b52b-122524258995', 'cc9304a2-77ab-5ae6-80ea-d1830cf2f143', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3d512ae2-2f45-5e2a-9c2f-e09c092b466a', '73826abd-667f-50cf-a372-799e1c0c3f16', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8352f868-e3d4-599d-951b-8272475da5b2', '8dbd9f52-aa10-57d2-842d-fad2a5586455', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '174f16d9-a11e-542d-9e72-fefa19f3a10b', '94b5eb99-d5f8-5278-a0f1-df3317f4762c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c5f515e7-7c1d-56c9-986f-ec8401ab0b58', 'dffa9393-9791-5e33-825b-c5584a79b44d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c3018c29-1f92-50c6-848a-475d3434c039', 'e1bb913d-be36-5415-a8a6-03ee4ee3ada0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a383d879-8378-55c6-b2fa-6a2d1361cabf', '23ffc8a9-4fec-58a0-b289-f3a4846c61eb', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '691737d0-ca40-59dd-b885-e614f97327e2', '2be66e56-c051-5bc4-96b1-2e10c91d5588', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4042e7b7-a9c3-5c6d-ac6c-c743a2712810', '816e33ed-e784-582d-93b7-afe7b35abf3d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '20349d13-fd4e-5357-be00-ab6ac27b8419', '3f9e762a-9573-5803-a799-f409aa7d781b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd07422e7-8dc4-5f15-9aea-01bbbd33811c', 'cbecb087-f26d-50e0-9226-c158353aed33', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'cbb90c27-9853-5730-81e1-c0f0a826188e', 'c62ae54d-1b75-5b9e-b578-de1d9b564671', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '905b46ab-ca8f-5be6-887a-9933524154b3', '1ffb0382-09aa-53d0-a817-29d984423507', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b35b5235-302d-52a8-804a-ea3a32e9fb14', 'd0a056fc-fe69-5613-910a-de09ff7c4a88', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e2fbd949-2472-553a-9212-f5c483c01316', '0eb5e253-d653-50a5-9352-8616c6dad676', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3e6698a0-cb95-5125-b358-87b2dd5097c2', 'f512ff81-3577-58b8-bc43-c165f2527d96', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd1b95d1d-0b68-51f4-b9d7-256e36120374', '4fdf0298-8a50-569a-9ccc-47e027bad5bf', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fe6b99dd-48ff-5ce4-8c6d-6c73dac875b2', '7d4edb9b-bdfd-5eb1-853b-97186b34397b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7d763ca9-3870-5f8e-9e59-14395320fbe8', 'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2946b45c-3930-52c3-b0bc-0e43599a09b4', '8560d71d-54bd-5475-8503-a591f9e86510', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '24dbb893-9eee-54a5-b266-03293e267956', '05adf243-cb3e-570b-bf50-2b72a7b1f739', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '57ede0c7-a2c1-5de1-8d27-592353e27d67', '7ab44fce-fced-5f3f-8f25-1db966f9c14b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd8f0d365-25a9-5ca2-b93d-07190eabee58', 'f41241e9-4510-5f92-9743-55982477ea03', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6d0b5241-6d37-5710-8c8e-d7c196067ba8', '7413f985-25f9-5031-b2df-bfaf59568792', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '27b8fc1b-300c-584f-8174-3297b30b3fb7', '70235a7f-36c5-59d8-959b-9cd3d10c925c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '099c4ab4-46b0-51d4-9a78-77c5c3491903', 'bd56b283-9b42-568d-a514-2397a909aaee', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '475c4fc6-273c-58af-9c14-0cc1fc72fa0a', '5df9bf71-89a8-546a-8456-897c58407d36', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fa090211-cad0-5b32-8b35-94e8964fe56b', '0e1ccb9a-35e1-5441-b5b7-211ea13f6033', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fa654455-4799-5333-a8b6-fc2f6fbd476d', '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e86fbafa-4203-52ff-8eb3-b97e9bc2307d', 'e4d5e196-ae83-5461-ac69-7591ed03d182', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e84292ad-7d66-52b7-a77e-a2feb2910578', '4168d710-be67-5e11-a2b9-30b130980b5f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '205aef48-6a5e-5ef9-b134-b90269e460d1', '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f1f31778-aaec-58ca-8156-082a2e11bb51', 'affaf1cd-7b35-522b-8cb4-9b2da375e2a1', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9df3589e-9cf5-5155-afe8-d560827d4316', '1e22d175-b7ab-5634-846b-d06d493c291e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b9ec639e-4abb-5f09-871f-2eb91f3e35f5', '35bbe2c8-93e5-5736-8ef8-a531fbfbe321', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '910fc533-be56-5768-abb9-22e69ae59477', 'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6e5666da-441d-58b4-b841-71b034c4f172', '50876a37-ea0b-55a8-882d-a7778ef5fe34', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c8a2a3fd-a154-53a1-b6cd-e62d4f3ecf55', 'c281bc5d-8b81-5652-87e9-ed6a373c9521', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4c580cb8-3f79-5c9e-8f04-f2d626fde104', '7879198a-47eb-5287-868a-46184c4e20fc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3b1cc7ac-841c-5b9f-b943-6cf4dda8141e', 'd29a237f-3405-5fad-a674-111a79fdf72a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b63adf2b-4189-5ca0-b924-7cba03f4d485', '517f9a6a-d0db-51d9-a416-0158489f3161', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1a29ce9f-ce33-5509-84bf-de0c87faa1f7', '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6ef39de1-052b-5927-91d9-45db77658953', '4c8ac637-78b3-5d13-b3ec-f7e002e6b629', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0a5141f3-8720-57b9-b4d7-baaa7795bee1', 'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5fa9013e-459f-540b-bd56-20e24a90ddea', '39e57597-eb36-5a13-81b1-6405012c8f50', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '381e537a-6907-5fa2-b41d-68e0af900693', '567a43db-535d-5c8d-a0f0-c5b587b72f32', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'dca4ed95-f723-5910-a7c1-c153f3edf140', 'aceb5a8d-378a-5055-8980-0af1fe42ff72', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '609726df-f2db-5ac4-b141-bcf09e4333a9', '557e7170-28be-5496-aaf6-a6f8ef015d73', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ec021779-5ef4-55ab-b426-6c5369f7252e', '801c4439-a99d-5930-b3c6-04330b6d3aeb', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '57204745-2545-5134-b7bf-89c45cc3072f', '985acd7c-d2f5-5477-8f99-58aaceec2453', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f2d46cb0-de42-5a0f-8a1f-93a7ed7fd667', '9de24856-3251-5daa-90d2-c50418b50f1c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '759f3ee1-a477-5829-8867-904682113257', '96579141-0036-5180-afb0-34c949c4eb47', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4897fd68-b39c-5f19-be5f-a66a0c29b3f9', 'db803dde-0a25-5c9c-820e-9e88125640e9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'efa64ea4-e3b1-5dde-83ec-88918e3f6c92', 'b18bf0ca-b052-51a9-9e12-2609feebf78d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0884ea44-7d1b-5ef1-be7b-f828c4240b01', 'd3ee833a-707a-5f09-acf0-104def5a0b76', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6c9fc965-83cb-53cb-9aa3-73dd6cea361b', '3a2274aa-1922-5659-ab28-ff332c027911', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2afab64d-ca3b-5692-b7be-152dabaf5fe9', '5c735131-aa5c-5b05-9463-4bb622a0ffbc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1f3e3b79-3148-5e38-822f-32ac3212cbff', 'fb1135d8-3185-585f-8a07-88dd63c6f813', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '478787de-1d0f-56a4-b640-6bf3e6b9d5cc', '52d1ae36-9dfa-56e1-bb7a-69389679d153', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '42c74776-0475-5136-888b-423ff631d264', 'd3ce9c48-2e47-57f2-a086-0767601421d0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '32293900-7721-5bb1-8c1b-342b59d80c7c', 'da37a2bc-4e5a-5939-8c31-41152e00e266', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '995a34b5-289f-5072-aac6-bf6df060c4fb', 'bb5b9b81-8128-5443-89d1-80e892dc3ea0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2c2a90ea-cdab-5614-818c-c030610d9c70', 'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2140bfea-3888-5c9a-90df-ad9b7ba121b2', '1626dd3b-35d6-5975-8947-e2ad80b3e357', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4506dcc6-80c7-5345-b6f0-2ac801783e96', '0229c72f-ae2b-5abe-ba68-4e12f4ed387e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c4789323-5402-5073-8aa9-2f2a7e4e0ec1', '93713aeb-34a6-5c25-8207-6292fcf7caa9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '84a46360-3885-59e8-a891-eee14a7ebaa4', '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'be9d0553-c104-5112-9674-1d7a43675a0f', '328ce717-e6f9-51fe-80d9-841cf4b763ce', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '098483ab-84c7-5462-b0fc-5db6547e82e7', '857a03fd-dd5b-503f-aa62-61a21027089a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'fixed',
  'de9a9746-9015-5051-adde-fb2a41d6461a', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '83925a6b-55c9-5750-be77-a80aa8731696', '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2646c741-d0b1-5446-9551-9b784a84dd2c', '8782c4a8-1e20-576e-84bc-c26f8a7ba212', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a0b8e699-934d-5de8-8be7-40f6c09dfba0', 'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2097cea4-94d2-5a1a-a61e-3491112c3a24', '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '12dbd461-22a8-5cd1-a1b2-0036f4b9a353', '761e2d60-c9a2-5980-8291-33d7e6003b77', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c0c3dc78-75b7-583d-bb21-a0ffe45b6a42', '01de89c3-e9b9-5e00-9ad0-f84120e68f32', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '111e95f8-4dce-53f2-86d8-e276b4da37e7', '92434f86-a3f3-59fb-a171-2737f7e4eeb3', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '75336a70-bf60-5da7-940d-2b30a81d3cd9', 'ac785da4-dad6-5d02-a244-5cfbcab2d652', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '24ce0ae4-05f6-5716-a7b6-536188fe5039', '01cba86c-0fec-53e0-ae47-3d0c9b89114d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7d104beb-ccd7-5a9b-a1c3-39aaeaf2a6b8', '27a88639-284e-56a1-8411-e220b1ff791c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5ee1ef6a-a5ed-5293-b52a-5b38003c95bc', '14212460-9e81-582a-bb96-29396c6a6042', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9171ba2f-bdc4-5ff3-9bae-b76ee8fac2ce', '211dbd0d-5a0e-5292-a304-47b7d7558ee4', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'aa2ed2bb-d26c-5912-9238-33eaa4b54e5e', 'a8df724a-6971-57a6-9179-d322345a337a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fa246e33-99b1-58cd-97b8-85841ed17f2e', '9802ed5a-ab9e-55c1-965c-f39d4fcac334', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fb078782-f264-5ba3-abf3-37c667ddd794', '3335315b-d3a9-5b61-a1d7-e1c790b7379e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'variable',
  'de9a9746-9015-5051-adde-fb2a41d6461a', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ed6f9e85-c1b0-508e-885f-c540c137d7fe', '86febf74-ea70-54bd-a977-5fef41535de6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4b974e9f-d425-5e3f-9df4-1492eb999688', '796a0b4c-79c4-5520-a5e6-1ca795541916', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '108ed7f3-3751-563f-bb30-467317bbfc9f', '8a488bb8-0545-5437-92d3-6a291cb433f3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a0a2c3ce-ca3f-5117-9411-a047a4e8ef97', '153ddbde-3392-5515-ba7b-c70713398f98', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd89899e4-e784-594e-a97a-03c2f79ef984', '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e2674f32-72fa-50cd-8e9b-e530accf90b9', '186afdf0-dd25-5244-a5aa-901ef2c116f6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'faa5b673-581b-57ac-b23c-ec81eacbf937', 'd9d3518f-d84f-5f04-a5e8-b1495a91462b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c19d0190-0816-5f80-92e5-bae75638032b', '16e2ad45-d2bc-59ca-b661-973cc8ef9642', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '158592bf-68b4-57ac-b73f-eb1e0d1ac8dc', 'a4e58a74-865e-511e-abad-777a9289935f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '12fa9cd9-74c4-5330-b9f4-5a07565a30a0', 'a177bfbe-6129-5224-ba4e-33c497244c62', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3432962c-f4e5-5b35-ae95-4dcc7b307028', 'b8e73cc0-3e5f-563a-8706-290ac4b62a16', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '45130763-61a6-55f5-bdf3-52118727cf85', '76cfa76e-3fad-5ac9-84d3-efa06995ec78', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f3c00811-6d9f-504f-9c22-b2c5fae0e68c', 'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1d4fd5ae-6adc-53ae-9a7b-eacad32da1aa', 'd30e684c-33b9-563f-842a-c91c917f42b9', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c0b640f4-a1d0-5498-bb59-7180aca7f946', '802e77f9-2e16-54cb-8074-cff31dc1ad4d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '00df7652-4688-517b-ac38-208c4d77d5b4', 'f6e156c7-10aa-50b9-8b47-38954627ba02', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5a9da94f-e8ac-5cbf-95a0-92e9306c7f8b', '793a1798-aebf-5b6e-b824-9c0096102698', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a0822c23-6805-549b-8c5f-dfee602e7358', 'a658837b-4b2e-5ea4-873f-75abbf1882e4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '58aa7276-d10f-53c5-92f2-2cc71b5a4f58', '07011d28-ec15-5afe-8bc7-0a24f4127b26', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6343deb2-7250-5ced-91d2-2019d3dc04f8', '13cd8ec0-e612-5049-91af-0e9f93e8e380', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '14dd670f-f65b-57a8-bc05-e3cc18b7798e', '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'de5aa135-86c0-57d9-9b9a-65373425e6ee', 'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '29178414-c700-557a-b923-b2b5d4d673c4', '5a8848e9-1cb3-5147-b7b2-db12ec254d20', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a8b818c3-40b5-580f-8696-c5b110bb8db8', '64137af9-0eea-547a-bae4-73ddc8138906', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0d1183ae-801c-5245-975a-dfd0d0e64a92', '1369abad-794f-5ff7-9f9b-be437b1808ba', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c8431784-640e-5c3c-b473-d79e9bd7e60b', '3b01d99f-0cc2-53ec-96ca-e0f09339f37f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '23e0b70f-0422-5473-9c9b-ce97596649cf', '7290e5f6-41c8-5c86-90d1-2fab07f56bac', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2546ce42-0afb-5766-86c5-da02d7bacbf8', '77795aab-26bf-50e9-b8f3-064ac641b836', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '068ab801-0127-569e-95be-64d6ed43f14c', 'ebd63099-b4ee-5f5b-ae09-33845b383555', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'eee7f589-b7e0-5d90-bdc6-421015cab90c', '625309a9-adc8-5402-a4f6-ea34aaae2b1b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9698ccc0-b028-5f6a-9805-904525d71591', '84f74b39-53f4-537e-b586-22d343f2ce03', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f6b641ad-8477-5962-8b73-928036caef35', '48d6ef71-defa-58b7-b39b-7368acce71cc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '889285e4-99da-5cd0-ba58-302864d3e2a1', '83657e81-303f-5055-ad23-ec79bc4073fd', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b020d506-e258-54e7-a708-565c0020383b', '707b476a-8c5a-5430-89fe-021cbda2fc38', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9e3e9189-ca5c-58c6-8f5f-dcfab2267a89', '1826a0d5-5354-541e-abf9-df791e02c5dd', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '67c5c6ec-8200-5e0b-89cb-6515d93e96e3', '6006e3e6-fd6d-53c9-a31b-985b21607ba6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '94a2accd-977a-5f6e-ac66-94d5b2c36379', '1bb51058-8477-5429-b58f-cea1c9b42f89', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '644b5ed0-a66f-5add-ab4a-0a3f5d500c04', '92f4096b-2a1b-5143-a99a-cd7ec01d9362', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fdefda06-b0ce-576d-af87-9d7f6081809b', 'f6382597-6a8c-579d-8d94-0a1193902f0f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e50ac50c-255c-5ca0-b501-01c4f632b23e', 'ee734673-cef9-596f-b7fe-5de609bc4f7c', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c6217738-1491-5036-b4fd-1dd4939082c7', '2235859b-73c7-5c77-bdd4-0c159adb7624', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ffaf4283-7077-5208-83c3-9f0c71a783eb', 'b54351d3-da2f-5d26-8f92-92889a1ca8ab', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7c070815-4bfe-5801-babc-769b0ed5dbfd', '09359ced-93b1-5e0b-9ee9-fabb567d48b0', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e89ef307-d0f5-58a1-ab28-787206089c83', '68718dc3-bd6a-5360-a508-bf786665cf8b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e3e16e59-f501-5e2b-9c58-2293bf75baff', 'c082977a-0bc1-5dde-b47f-0ed372760372', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6984b979-2849-5e11-9531-4fff6ed5ed44', 'dec74611-986e-5d89-b59e-1b7934707223', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'dbfb1846-38bd-5d11-adce-37e66c4433ae', '5c65c996-3864-5ef9-8a32-43096cabc679', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0c17029d-4ca7-5295-9056-6e04cc2fde23', '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e83d0bd4-63ea-54d6-a499-6691984dfb04', 'da050d9a-49bb-5707-90e3-df3936e06ee2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ecb26ff7-4e2a-5ce9-8a98-7c2263c5397f', '081bda8b-41a9-5b6d-8438-d9956686312d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b095d460-a733-564e-aeff-e6b05a563300', 'd598a557-45d1-573f-91b1-596205ba1d6d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '65152a2a-ab62-53ff-8ace-a9b7041e540c', 'ac2495ca-9f04-573b-b948-762cb2d9181e', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '98f1b9dd-98ff-55e9-adab-969561b12061', '51cd8c49-fbde-5867-972d-3d0652dd2fd2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '09aff88a-fe55-53d8-ad9f-610a5eaeb8e9', '05ff0a88-7333-5168-85d3-7e41b4132f9d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c48b92bb-99be-57f2-a9a6-89365944c9b6', '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'bc36c802-b6d6-5f7d-83ef-6baab382c7dd', '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ae69112b-6f9e-52f1-993a-f7319b01a0a5', '86ec31d6-74a7-515f-b8cb-ef8aea291ff2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7935efee-4a86-5f13-baf8-5269651b24e5', '85a24d25-201f-54d6-9d29-c4131a11c151', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '12cc55f7-7375-5d29-84d8-e8cb8a5ec0a6', '457a6c56-7848-5815-a0ab-048a6f040c42', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '78c3670a-d502-575f-b1bf-012c128c2762', '164af1a8-f546-5c2f-ac90-c75cbb27dcb2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '653640c8-06f0-522e-a1d3-fdd002d80e01', '01e70aa5-7aa3-5dfd-94de-8449453da0c0', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6a2e471d-a278-5818-9040-aa4c3b991f5a', '7dd15c7c-248f-5d8b-8d66-8ee53e9680b5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'variable',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '867e444d-3f29-5942-bc42-6d5ddab8b9a1', 'c88c6626-a374-539d-930b-306136977997', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'dcb56b76-e19f-5733-b3b9-013b59bec79e', '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c56e2f66-550d-5d1f-8ca0-86370c7c7931', '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '452e2e56-999d-503d-9b6e-5b60161ad7ac', '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd1216723-101c-5679-b743-2bcdf927811c', '1b793501-8afc-5531-88c1-205bf90a30e8', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1ffe8435-0eca-5949-bc6d-34f72b048f62', 'a1532a3c-f9d0-53dc-9399-2b253ba98fa1', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd33b7f4d-6058-550d-8a59-a962ea1394f3', '42712cac-bd84-5f56-a186-61f3a30739fc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ef9f8f90-97b4-54c5-af2b-d076fe063acd', '664708b3-13aa-5759-b160-9f79d6aa25c3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fff5462c-bcde-5b6a-8786-48619da560a2', '485a1650-6a25-56e8-afcc-d4b4d55a46fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e6da545e-f7ee-58fb-b5cf-46bdf0130f9d', 'a005ef46-0d18-59af-831a-8ee184c1e553', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f17d8257-3ba1-5f6c-b39e-9e416af428e3', '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '582f2bc1-2995-511e-9c99-5c70d5f41cf6', '664a11a2-c908-5141-b6cf-25338e5ebed5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '64ba0895-2856-5a4f-80a2-596a72ed0ed0', 'df6340d1-f9e4-5cea-96a5-27648403aab4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'df969723-3dc8-53dd-9e66-b27ec3d89cfb', 'b2c6b689-9bdb-5a09-978c-92a6eb85e111', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a6c4a2a3-e59c-5f39-af09-1395357fd69d', '01d9af3d-0e55-556a-aee4-1a9f49d61c4a', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'fixed',
  'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '{sat,sun}', '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6fa28074-ad0a-5016-8464-d339af4d7f6b', '5042062a-fafb-5613-bd98-6c5df5e2446e', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1df0cef4-41c1-5c93-ab49-ec9ab22d8e99', 'f48a1ebc-9a36-520b-989c-27f98a568367', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0e1f15ca-a672-5685-beae-2fec5d1e5834', '6a338509-e525-53ec-940c-21bd7329edf3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c74e0423-7f6d-593a-be8c-913b770b43f9', '66522e0c-15d1-5f8e-9908-725c0dff39df', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '721252a2-207b-58e5-a9da-b074c51942d6', '82517c4d-c0b9-54a2-ac6c-36b1799e2ed2', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '4802fa9a-50ad-51c2-856c-43eda15b4f74', '25a33616-f1df-53c2-ab39-7f72e7be05e4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2fa7b85b-a54d-57cc-84b3-0db7a8ce0c84', '0780080e-5529-5a0f-ba33-ebf948042c22', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f3bd9f87-bac1-5feb-af75-5792cee10643', 'cf23521a-f49a-5f16-bc8e-6868ae9d2b61', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '348d72d5-f0e2-5f7e-87b4-7fa7a41ed412', 'afe52e0b-fbee-58f4-b3e9-8256047867e0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '25cda2d0-2ae8-514d-8c7e-369661d817d4', 'dd3ac8f8-85f9-5893-8d8d-00c705615d95', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e7bfbc85-eed5-5433-9b42-7d88933fcd3f', 'b71285ba-208d-5ad4-a2bf-5c5210ab1c37', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd8e39b79-2098-5a70-a35b-01f14be094ee', 'bf2af5ec-b907-532c-b526-a7c25e64b444', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '259c05fc-923e-5c49-bb7d-4610add8de99', '525c17d6-fa6b-5b0e-936e-95a0621ea2cc', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'b25d441d-f772-5627-a36f-1de26341d55f', 'cb15f429-7960-5737-955c-e8665139179a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f7c877f5-879f-53e3-8458-9f12141c86c1', '8eb394aa-d000-50c7-8961-5e6e93d5d2fe', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a24f90b7-46c1-55de-828e-f31ee3017c51', 'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5740ae63-6420-5b42-b45d-29d78de57ff8', '69f26489-1d61-535f-89a6-3a704b365993', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '24c51f92-d2a0-5f38-aaed-ba54aba55b7c', '22fc8531-282a-5628-96e2-c1ffb582f4dc', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e12496d1-47f5-5651-a65b-cfdc0b97a615', '4df3bef4-a420-51d3-9b39-6775a01e81f3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8a18ce93-cde1-5fbf-8981-c33f1e928441', 'f7023f53-4a76-51b1-86cd-cf9f1f41ec04', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f6039af7-7af6-5403-b182-14a799bfa66e', '61391e19-c7ab-5cb2-bac6-091bc676bf1f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '69486b50-d094-5227-9fef-66382a639aac', '0e9d1639-6683-5898-bdc1-cd45a564f12b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c5cca4a0-0757-599b-9760-9a96e2e4a6e1', 'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'cafe7be7-3925-54e1-b2ab-1602c3ad4f5d', '0112bd55-30fe-5356-b803-780b8324b198', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9519ab33-4889-5cf9-8004-3c1255e3674d', '48c82575-eae0-57e3-98aa-b83d421e73fd', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7b905345-7383-5b82-b5e1-4286e44857c1', '8beafe18-b109-544d-ac59-07c7810e1a92', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0faf9827-ce4b-528b-a26d-0349a8cc2189', 'eb1ead33-8b1a-5574-9c62-487464194b46', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '73e66f08-7dbf-5014-ab1d-57d441e64de0', '29031ab6-5d1c-5c39-9250-9caf4abdbc9c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9fdcb183-6fe7-5de8-a841-93f7735a1637', '370635ca-4642-50d4-8f7b-a28c9fad804b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ea8454c8-8abc-5150-89fa-1cc2132560aa', 'e4f2e946-8f12-5c41-b917-806f22fdaa71', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '1af6c20a-5d65-567a-86df-0224b4f60f12', '8c14d1af-9309-55ef-a6ae-12e5d4af92a9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ba88a91f-7852-5878-b70b-b4f27eb6a556', '99e7fbda-e804-556f-aa77-f6d31396196d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2dfcd97a-e196-550a-b143-7d7c899dd114', 'f8d4c553-8292-5f4a-a623-61a2801f54bf', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2f603e80-0827-509b-a347-db058da5583f', '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'aeda4e33-0db3-5b02-b929-3e4c9803af30', 'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c74480bf-8577-5d4a-af58-c5241ee8864a', '2f8de48d-9ede-562f-b143-648c0982930a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0309c57a-2c65-5141-9d73-61a8848b110b', 'd6506cfc-dc32-5135-a977-9e6ba219135a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2e59cf1c-5c32-53ec-b3f8-c948eeb74202', 'b9aa155a-ae77-5480-9afa-541840cfc63f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '7ff57d0a-584e-5153-ba52-09fa7c485ba6', '221f4ce3-8559-5a20-b8da-45a4bc9d9808', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'bbb9dc53-7bc6-57b7-bc25-cb2ffe652d8e', '09650291-b21c-5341-9ac2-4cae6e1d15f4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'e3e3443a-73ea-54a5-bb5d-dd7d4eacc921', '10902689-7bcc-5f16-949a-4cceb705ba47', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd65e7279-5225-5658-a00e-b5ee300940c8', 'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'a949077f-7a18-5fde-8630-4c4ae38b2897', 'c607ca11-6d7f-5ddb-bffb-2520f2c652ba', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '25d18268-5f67-5e66-b7f0-f6efe61e2088', 'd6781c94-8acb-5bca-8f1a-87b91b21b2a1', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '5ee0a346-e6d1-5bb3-9dac-537ce0974065', NULL, '11.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '5244d9fa-df8f-517b-bc48-6c428e465ee2', '08c9ebe2-cb8b-561c-86b2-e6e2395b8491', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '8d1b1bcd-6aa4-5c03-a1a2-273fabfe6c0f', '91c83bdd-f1d8-5664-8241-a2014277fbf7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0c007d4a-f4c5-5491-81c2-5e6f1cb88d55', 'd75c0d8c-6cf5-5463-9f06-972464d768a9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '11c5095e-f84e-597c-a4ba-3d73f5b7f379', '4540c941-274c-5a7a-9b65-950a5bdbbe39', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '0424b006-ee9d-5ebb-a25c-7f942b1233ab', 'aa8e9fe9-91f0-55c0-b923-f304d75617c4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2d080a50-087b-53ca-aa2a-3140ab3668de', '4c072784-039a-50aa-9360-5c0d655130d9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'c09b9ae0-7c54-5dd6-abe6-5736fa8a751e', 'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '59a04615-5598-545b-a379-ebc57086ef72', 'c6c80162-b3d6-5cc5-8894-74c06f8e69ff', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '3e502fd9-87e1-5668-bd70-ae8c0d698885', '125b70c0-b68a-55be-b901-7ae49354419b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ebe3e781-44a8-5e64-84ac-5557118a7550', '821507e5-bcb7-5d3b-b6af-1bb249c93e3d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'd040c64a-5750-58ea-8f77-de0273ead129', 'd9aa9fe5-ef23-5bf5-954c-87fb722752c0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f48c576a-ebac-5d39-a17e-37f253b0c957', 'b871ae33-5778-5f96-9561-2c612960b46d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '32891a34-7eff-50e5-a6c0-8c58d4946205', '6174c2f6-3787-5818-b109-2d49857deaa0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'variable',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '95ac9b2b-0fb4-51c1-ba63-dd9b0c8aca58', '866cb109-d21e-5261-b633-305274462086', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '6ec4f655-a62d-5492-9f98-0e3ecd944a8e', '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '57b50cbe-7101-555a-94c9-93fd29f15d1e', 'e9c17fc7-1f0a-5581-b47c-2650deefb509', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '253d013c-b250-5abf-878e-1b462f00391a', 'b2aa721c-be83-502e-981b-6d5b7af9ff64', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '9c95851c-bd21-56d1-8d0c-d68b8f142d9f', '8e9ac011-bd26-57e5-ad81-851a487bff74', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'bf8802ca-6d47-59f3-ad4c-c662981a9ca5', 'de5c24c4-40c0-5be8-94cd-76475d77f735', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'ac61fbb5-841b-59db-922d-3e589e19d79a', '7d0da298-493e-5195-80db-dcc1bf14a586', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '35ffa79f-8db6-5f0c-9e92-73abf4370103', 'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '2f2462b3-c580-51fc-8f94-a4d1843e02db', '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '142899d7-38e5-577f-ae7c-3955f8cb7f67', 'd9374f1c-a86e-59dd-8bf5-907fb2e0222f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'f36b88f4-ae88-51a1-a30e-d34c8c875771', '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  '85c1a8ee-d512-5f97-8c45-8932a5312b84', 'c94818ae-36bc-5fa9-84e6-98bd394f6b6b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;

INSERT INTO employee_schedule_profiles (
  id, employee_id, company_id, schedule_type, default_shift_id, fixed_dayoffs, work_code
) VALUES (
  'fd382e2d-6cf4-5824-b816-c9a97cdfa21b', 'ec9f0a7b-07f6-5dab-8844-0002bb315e4f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', 'fixed',
  '870fc563-92a3-5578-9ef0-2ace334c66bd', NULL, '9.0'
) ON CONFLICT (employee_id) DO UPDATE SET
  schedule_type=EXCLUDED.schedule_type, default_shift_id=EXCLUDED.default_shift_id,
  fixed_dayoffs=EXCLUDED.fixed_dayoffs, work_code=EXCLUDED.work_code;


-- ══════════════════════════════════════════════════════════════
-- STEP 12: Work Schedules (legacy table)
-- ══════════════════════════════════════════════════════════════

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a33d5fcf-fcf3-5708-8851-9697f112fd24', '1fc1c300-7a04-55f6-af90-7a85bdb89621', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d4b3005e-8f54-51b2-8eae-1c1264cae5c7', 'bd80e811-e6a9-54bd-bdb4-05ac72f1a89b', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0a082f14-0c58-56c0-99aa-5861f4411995', '5bc1ff1c-0228-580e-b9ac-69f60d749f70', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('43fb09fe-7f57-5a00-a51c-b3dff26dea8b', 'e189e7d0-c010-55e8-ba56-99dfb8dbb106', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a83b573b-847b-507a-bcff-927168247519', 'bd592ab4-f6a5-56da-8c9f-e16855727c08', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b8994bea-b6f4-5427-acb2-34ee93ea498c', 'e33a24bf-f250-54bc-8b3e-0eaf4fe62547', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('049c7392-9b80-5e04-ba10-04665d64ee25', '547d54e5-3b9c-5074-b8ff-7a70c029da58', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c1f7ad0d-e65e-5990-9a53-78b82e09aed5', '4cd519ef-216a-5a5b-8a80-3fcd0e85d777', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0b5d4315-ad2f-53f0-9193-37166dd49736', '87f33a2c-4186-5d58-824d-71754a1981fc', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d9b9db55-7826-5b04-8fb8-957f36e89aa4', '505100f5-e973-5189-9fdd-ade03c5a9d65', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5d0be21a-9d90-513a-8b16-f25ff3d41e69', 'e098f35b-7b09-5c1d-9542-1b158aed1702', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6f947bfe-d234-5879-80f5-4ca0d7939243', 'd219c41b-264d-5125-a1a1-84e81e7cb20f', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f8c7c2c7-43f0-5d62-8548-8def6e261e00', '87b3c2cf-1067-5a7e-b717-7b5ea4000c53', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('59dfb0dc-a2a7-5976-9c7c-d3348bc1d1f4', '5dc95722-7b21-5c28-b14d-406a6de0bb26', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('da34bfd5-090c-5d8a-a836-71834830c930', '798d04af-f201-544d-b3d6-d77ae68ec6b2', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('72cbb5bc-4156-5050-aa63-08c1e9c09255', 'b68624a5-e13f-52d4-99cc-2d577b9835e2', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('68a3c71d-0dcb-5a11-880a-d08066417fb5', '2d7307b1-21c1-5a0f-9891-e1ffabf7fa62', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('53bf22d9-7535-5f38-9cb2-2019b148c8c0', '3ff757f7-d102-5b85-9c7b-716f3d5d256f', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f6d463c3-8d4c-5a39-b3b4-eded836b4955', 'f9fab60d-d405-5691-9251-2651a4459ff9', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b2973361-9475-5588-941d-5c16affbe4d3', '9f1c2d9c-a06d-592e-ac02-54bf2aabedb0', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c6fae3df-40fb-53f4-81a5-50362a249258', '37165ccc-a53f-50bf-af12-f069ce27e138', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('bf55a4d3-f8ca-580f-a296-a586fcbc37ff', '54eeadd4-2edb-5c16-935c-584e2da41515', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('61b03fb4-70b2-54ee-b21e-4616b49b4adc', 'a2981567-26e5-5f8c-a3ce-9853f660b533', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('2ecd1b0d-a8f0-5e85-93f6-88f884f782c5', '8429e766-c22a-5c55-b79d-9628732e3879', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('107dc4df-a1d7-5f42-aa6b-5b849e09b906', '2bcc724a-136a-5e75-ae22-e2a3471e8a41', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0149ee18-9226-5002-a514-7baa680f50ef', 'd5379adf-9d35-535a-9099-98eda97ab38f', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7f925db4-8f51-5896-af65-da141594b4e8', '58fdab55-3165-5db1-a465-d26991330ec5', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a0906fb9-cddd-57c3-a53f-4ce89c75a20d', '2b405200-f740-57ad-a488-756ce95fb5d5', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('68980ea0-eb79-509e-b6fe-d290a9f2d2c6', '5d01aff0-34a5-5039-be00-90fd212a84c8', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8df7bc4f-2de5-588c-a9fe-2847a973c636', '2224e3c8-4867-56b0-9ae8-ff0ee3e883b3', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4be7e191-affc-58f7-81f6-0e73b06f5702', '0baae162-2014-529f-880f-2624bc8a7fa5', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3324f318-1987-5228-bb96-89a5773f1d42', '5eded7cf-84e9-57fd-b8b0-c3923d7edd34', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('91bf8ddd-d8f2-5b7f-8c2f-930799486aa2', 'b41547ed-4e66-5789-ac51-1dfb787e3876', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6bf28860-5aa6-5fcc-a50b-421386f4cecb', 'ea90425f-ca79-50fc-b7ac-9a29f649f225', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('89042ecd-5657-5ce3-ab83-312d1b4eb83d', '8c7ae749-bd6a-5e65-9601-8b6ae73381ea', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('456388d8-9090-5a0c-b970-01c6e7e6ff3f', '947c773f-4ddc-51fa-ad5c-c11b6e4e3fe2', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('afb674a0-4924-5180-a49e-c56be94f1b54', 'da89221c-cacf-58c8-b46c-1292f3a8956e', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('32512bc8-5e39-5869-99c2-40b80aa7ec6b', 'e9631ebd-681e-5305-b1d4-101405f39833', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('cc0d778a-4567-5a3f-83bf-052cfa28a96b', '7318811e-5e85-56f7-abe0-707e832578bb', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('38662822-7255-5ea8-853f-efb7569ef770', '00aac6c6-27fd-51ca-93f1-9f40deb0787c', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e2e7b3fa-3ce9-5256-b05a-eb1c7215caa4', 'a231a9e2-f67c-5ccd-a6dd-d8d39bfa0d11', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0f0a7c57-76ec-522a-bb70-24e36a6fd765', '2e0fa686-82fc-54f3-9381-ecca30db2c15', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1f1aef8c-3f03-5022-941c-71abaa957d57', '31f98fd2-9493-5f30-9a8b-683d5647c722', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5d6c8797-5371-50ad-bfd2-6ea4be4b935a', '47edf2aa-8c3b-5d53-87e6-647e4d8ac594', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('24705666-f518-5ca7-bdb8-c3248295c585', '7a30a6ae-81be-5d24-aa71-3b2dfab8f149', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e289ac1e-1ddc-525b-bb97-d19731147b89', '182b4acf-db08-5d7e-8f6f-c8ea178d2252', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('10854258-d1e4-5d22-9546-997fea835c62', '325a4de8-6270-53f1-8d62-ca99f1dfdd8d', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('98149ba9-486a-53f6-8150-e01a13f6fcab', 'd9ca3057-049c-5046-8390-95ec35d707b0', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('eb36831a-5e7d-5936-8854-6c3b62639687', '39ce76fb-45a7-5e1f-bfc5-3c0dabfe8ec0', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ae66f3a9-0ca2-5577-a92a-1e23269c26c0', 'ead7fea4-52b0-5044-95d8-a70927211a86', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('45a5f6cb-b1f4-5161-9ee7-1ad987a174fd', 'bac13023-3360-5441-8c32-a81ef94010ba', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d1e4e317-4637-522d-8cc5-fc26095f810e', '02463fc8-e6c5-5405-ba03-75fb92666043', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4e393a4f-7e33-59ff-85fc-ac14295f1a52', '1ecc722f-0dd1-5dca-9110-a02849e56a6c', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('466f2e9d-4977-50e3-962c-b09002fd613d', '4800ca0d-4d6b-5756-8751-ed4f6d53d984', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b279239b-b40a-5446-a325-5307644731d2', '780e64f2-2e21-55cc-ab4d-17132e63c8e6', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f4432723-8796-50dc-a7bb-4a9d02e11eeb', 'd8a906e6-41d6-592d-bb22-dd02219a8d57', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('57614344-e9f3-5524-b8ce-75d2b3df8cd0', 'd7d0369a-101c-502f-a5cf-7669c0dcca45', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c4d81f44-968d-50b9-881b-cb852e2b43be', 'c7bbe76c-0220-5ea4-b416-4acd6fca94a4', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b1aa86a2-64ec-5a43-a633-5ef3d8b09b72', '79209d32-cf9e-5ee5-bffa-920d45dfd7db', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ed3ae30a-9fc1-5e3b-96db-5b86615ce69d', 'd5c61796-bc14-5185-8795-517eef98433f', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('2fc3da64-bfdf-54a9-b6c6-f4180ace00ff', 'f80a403e-f671-534e-925c-998c3bcbcb3e', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3c3466c7-a8c0-5c76-aa51-e8a975e2d45a', '9a1cdbf7-a679-5a4c-8414-ec629c8dba28', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f539ff50-ba4f-5a1d-bf72-46a66c24c6ab', '63a37220-6950-5b93-8af6-60ec35886d6a', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('02fe6230-e46a-5585-9741-6f392fe1c3d6', '5724ca0e-00ed-5bf6-b350-19bb67a3ca83', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9f52387c-0f24-5539-bb84-47ee96668f2a', '45243a33-d4c9-5e54-85f4-fbb91180eca2', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('bdd8c84b-ef29-5dde-abc0-7f747fdad4d2', '189ba125-bf10-5648-aaa9-442e8791c4ed', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b3226a0d-6fb1-5c75-a679-b411999a6eb2', '065f663e-401f-5593-983a-149cbbad6924', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1a528547-3657-5cdc-8a55-1e648edaa6db', '5bc0ca1e-7fb8-5ba2-8135-2fc750a0a451', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('92ef91a8-d2f6-5d64-87f6-5b99bfbc6e2d', '37da4d12-64a1-5007-846d-36f1c49d3b23', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('77a9e3e5-a1a3-5ae8-b585-1160d308ee07', '9c1a1b52-7e27-5f01-b0cc-65c5a17c8a68', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('fbf1e8af-38de-59b4-8fab-74645696a707', '3e4844e7-86c4-51dd-be7d-9ccf3c34b9e9', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e4cf42c3-0941-57f3-b93d-a5e4707da417', 'd2424c33-a067-5999-8787-90624c6de80f', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5c61137d-52a2-5986-a403-7c1a92381061', '1de4da72-36df-5bce-a298-ec902801dc5a', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('67e6beef-1604-56c3-8989-ec2c2e3ce421', '6ccf9608-9200-5b8c-8227-28427fbb54fd', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ce5faf20-eeb2-5a5c-93d7-74e165f793fd', '7dd94e90-8d7b-5c5a-a951-05417269bbe6', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9022241b-dc49-5095-af42-03dbb0ae51d8', 'a0d5f05b-e948-567c-9fab-f55a4aee49af', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('58e07fe4-a606-50ef-bed0-97d46d688e62', 'ee627c60-8120-5a24-97a4-f50c12571d41', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e8561c33-f0d9-52cf-bc9e-537996a07866', '85b72e61-26c7-5a99-bb0c-15cad1e983db', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('89732ffb-d15a-55bc-ad7f-7201ebf7c929', '0d6769b8-bdcd-5ed2-a7a6-0bfc92492eeb', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b68133a7-8178-5a75-9e71-277392fb4056', '03054231-d09f-593c-9614-e3539576a74e', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('2208552e-46c7-597a-9ea6-2175b1cce651', '57772cb0-784f-5525-b7df-bddded652e7e', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('54a82739-487c-5c06-8c91-c8ca4ba28f2f', '34153f1a-b5fe-5ef3-b7e7-f5078871c1c5', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ddf9931a-b033-5720-a9fe-86d8741e016e', 'd62503b0-fcc2-53c0-9890-1c98aae5c3a7', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a099b3bc-5c96-5e48-9e86-4a79de3fe3c7', 'fff2b4aa-c914-52dc-b869-af609eb7a949', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('88c52284-81aa-537b-9c94-4b83f40a852e', '2a137c36-1cf5-5c33-8386-cc1db2ec244a', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3263c7f6-494e-509a-8dc9-90b9796ab727', 'bdc5955f-e72d-51ac-9419-71a04cb0e914', 'a684555a-e44d-4441-9af8-521115cd000a', '5186951d-4565-5028-8cd6-c7e7347c1109', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9f4c858e-cad8-50d6-8beb-207e9eb75dbc', 'e939f7de-7ff7-5e57-b19e-e4625c3fa66e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('38bd90cf-7329-5748-9291-ec17f8f5f097', '04cd3508-bd0c-50e3-a676-1c63a0db7bef', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f2a0bfe5-1d5a-5e1d-9348-65f468729fb1', '998d6f38-fcad-58dd-a19c-50c9d7a5a846', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ea27fb54-ba07-5f9a-8f3a-2e384ce01e84', '4c8715e5-5bf9-5db4-a71c-2c073b89ce7f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('009d5b16-29ae-5516-bcf5-002dcdc24fe7', '385dda09-e293-5f2d-bde4-4f663bf8d399', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e20f891a-3893-5d7c-8ed2-5f988fd7bb29', '3e1111f2-00b9-538d-82ad-08524935f918', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c39f0d2f-4da2-51b9-8c09-4a686fb03de6', '6fb24cf5-7d6f-50bf-a45d-893f879b9bce', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e714f03d-a5f8-5123-a9cc-72480199dedd', '1ae6348f-2c52-56ac-86e3-e91579348600', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('abf81133-a6c1-5aa9-8195-d14eee32dd78', 'e812f3c2-feea-5992-b1c7-4fea26c4680a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f1d67743-0eeb-5d25-8455-615f692cafa7', '51394f04-92ac-5a69-8516-5f7bece30192', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('25fffe23-6d21-546e-8075-d1a0401c7c5f', 'cc9304a2-77ab-5ae6-80ea-d1830cf2f143', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4bab93e2-33bb-5cd6-8503-d0136d334b8a', '73826abd-667f-50cf-a372-799e1c0c3f16', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5c4ca496-224d-554a-9ccb-6bec6d4be1e9', '8dbd9f52-aa10-57d2-842d-fad2a5586455', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('25ea930e-f91a-5991-915a-91f1115a9c9a', '94b5eb99-d5f8-5278-a0f1-df3317f4762c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e8205d12-3408-5d34-9137-f3c6e4a7501e', 'dffa9393-9791-5e33-825b-c5584a79b44d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('504eff14-d680-542b-8b88-265c4b92e745', 'e1bb913d-be36-5415-a8a6-03ee4ee3ada0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d95a8b38-e2ba-5b89-b449-97b2c702c39a', '23ffc8a9-4fec-58a0-b289-f3a4846c61eb', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3a5a946a-c0bb-5587-ac2a-c7ec212c2f95', '2be66e56-c051-5bc4-96b1-2e10c91d5588', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b916e0a2-fbd4-54f3-8aaf-9650cbb339b2', '816e33ed-e784-582d-93b7-afe7b35abf3d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d43012f3-3e93-5aa1-8fc4-e3551efdb3d9', '3f9e762a-9573-5803-a799-f409aa7d781b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('35969aa7-31d9-5f95-b322-3daebd9df26b', 'cbecb087-f26d-50e0-9226-c158353aed33', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('77832b7c-7762-5829-86a6-67f2f449d407', 'c62ae54d-1b75-5b9e-b578-de1d9b564671', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('557c9171-d87a-5047-b8a2-8240e0eb4b1e', '1ffb0382-09aa-53d0-a817-29d984423507', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1248ce62-ba7c-5260-9126-1b1da30e23c9', 'd0a056fc-fe69-5613-910a-de09ff7c4a88', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1e6f1be5-75f2-5c8c-995d-e974ec44f467', '0eb5e253-d653-50a5-9352-8616c6dad676', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('185a5f59-e7b2-5fb5-8ea4-b9a9016c7ead', 'f512ff81-3577-58b8-bc43-c165f2527d96', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8681986b-ae56-57ab-88b4-c2fe54d3d61c', '4fdf0298-8a50-569a-9ccc-47e027bad5bf', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('dc0925f3-ad80-5317-9780-b87bf21c922e', '7d4edb9b-bdfd-5eb1-853b-97186b34397b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7169b676-ca75-5c31-938e-440abd57842e', 'c9f7674a-8d38-51b5-ac60-f6d60d7ab74d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8d528145-ecf4-5dbf-89aa-446bafde6d9e', '8560d71d-54bd-5475-8503-a591f9e86510', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f34ca0b4-d051-5692-b38c-96ffed56de3d', '05adf243-cb3e-570b-bf50-2b72a7b1f739', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('714a3104-8369-5eaf-abb3-8143ae3cac16', '7ab44fce-fced-5f3f-8f25-1db966f9c14b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1529887f-c41d-5f09-87b7-041c63d2a549', 'f41241e9-4510-5f92-9743-55982477ea03', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6b564741-e399-5ae0-9b5b-2d2093eba2de', '7413f985-25f9-5031-b2df-bfaf59568792', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('00e94f19-5482-5cce-9602-0418e029109e', '70235a7f-36c5-59d8-959b-9cd3d10c925c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1df9e0fc-6fd7-5d9f-83bc-c0ce73bcb32b', 'bd56b283-9b42-568d-a514-2397a909aaee', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7234068f-c8c0-59fe-899c-335c09d83910', '5df9bf71-89a8-546a-8456-897c58407d36', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ea8232c9-7b7c-5699-8e61-83ac34ef73e4', '0e1ccb9a-35e1-5441-b5b7-211ea13f6033', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('05810214-fff5-5805-b405-233d0af0b111', '70d21ac2-1583-5af4-9ff7-5e2a2cae80e9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('30d4ab13-4ea4-51fa-986f-4a04374a23f5', 'e4d5e196-ae83-5461-ac69-7591ed03d182', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('01a0f2a1-e856-5314-ad77-941b1fe41451', '4168d710-be67-5e11-a2b9-30b130980b5f', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9803bf81-e3c3-544a-8ffd-93fba53e541a', '35dfd225-34a5-5f7a-90c4-8dc8ff7c9182', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f2c686ad-1633-5cdb-9ea3-73a46dfbd561', 'affaf1cd-7b35-522b-8cb4-9b2da375e2a1', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('52f5da6e-54c4-5c07-8cfa-d51310f6dc8d', '1e22d175-b7ab-5634-846b-d06d493c291e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9e76022c-1582-55e8-944c-955d240785dc', '35bbe2c8-93e5-5736-8ef8-a531fbfbe321', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f05da488-e0c5-5988-bfe1-a6937f705c4a', 'b473ad44-dcd0-5c20-9ecc-7ebac4c7a34d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('dcc3e417-1282-5e4d-a916-75bac6d8cf14', '50876a37-ea0b-55a8-882d-a7778ef5fe34', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('02d1f412-d7a2-525c-9a90-eb259e4ccb8b', 'c281bc5d-8b81-5652-87e9-ed6a373c9521', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('88a35a33-a039-5a21-8fb0-9fd409afba58', '7879198a-47eb-5287-868a-46184c4e20fc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e6166df8-820d-5499-a09d-19dd4dfd29c7', 'd29a237f-3405-5fad-a674-111a79fdf72a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('646ec0d3-9b9c-561b-85ae-cf833d387814', '517f9a6a-d0db-51d9-a416-0158489f3161', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f3946fc3-7b9c-555e-a938-be4356a2d628', '28c7fbc0-df5e-552c-810e-3c5b4fa6dbc8', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7227797c-b379-5d04-b145-b301dfc4da76', '4c8ac637-78b3-5d13-b3ec-f7e002e6b629', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('afd8440b-79d7-5138-bf28-97f8f852aec3', 'ac73a8b8-e934-5ea0-be97-0b5a0ca1f830', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f09cd1ad-2d42-5201-ba64-131f4db60cad', '39e57597-eb36-5a13-81b1-6405012c8f50', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c5f79df1-cead-5b2d-b87b-a7862a0e2940', '567a43db-535d-5c8d-a0f0-c5b587b72f32', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('980fca8c-0cf3-57a1-84c0-0f2c5776d5b4', 'aceb5a8d-378a-5055-8980-0af1fe42ff72', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('bbbce8d0-77f5-5768-bb4c-e4e588df1631', '557e7170-28be-5496-aaf6-a6f8ef015d73', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d1da8b89-cd9f-53ef-9051-fb34c60199f3', '801c4439-a99d-5930-b3c6-04330b6d3aeb', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9995b732-9f85-5def-b7cd-a2235be34b79', '985acd7c-d2f5-5477-8f99-58aaceec2453', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9c597fd1-fba4-5304-b098-6582ce827581', '9de24856-3251-5daa-90d2-c50418b50f1c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1f2bc43f-6e86-5a48-b1af-2ec2fcfd15ed', '96579141-0036-5180-afb0-34c949c4eb47', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('43161438-a18b-5de1-a781-3e2d76d869e2', 'db803dde-0a25-5c9c-820e-9e88125640e9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('677e7f94-6f1b-50cc-a85f-9531558b6ba3', 'b18bf0ca-b052-51a9-9e12-2609feebf78d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('51ad12df-5337-526b-8b63-169350b2cc05', 'd3ee833a-707a-5f09-acf0-104def5a0b76', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5bcaf741-73e0-509a-a451-7994c7e07898', '3a2274aa-1922-5659-ab28-ff332c027911', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3093586c-819a-5791-b935-2e8535800ebb', '5c735131-aa5c-5b05-9463-4bb622a0ffbc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7abf662c-7efe-5687-a0db-36da65a3c10e', 'fb1135d8-3185-585f-8a07-88dd63c6f813', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('df2346e8-6995-5f6c-9de0-916236c5698b', '52d1ae36-9dfa-56e1-bb7a-69389679d153', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('895cbd2f-e472-5a39-8b67-fe15f27bf972', 'd3ce9c48-2e47-57f2-a086-0767601421d0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('38905a3e-ec2f-5148-abd8-3a28fc91a727', 'da37a2bc-4e5a-5939-8c31-41152e00e266', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3b3480e4-9f28-5230-80e0-3541ee204694', 'bb5b9b81-8128-5443-89d1-80e892dc3ea0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1d62bf74-ac23-5249-b742-25d6aaffe0c5', 'cc1d91bd-4b5d-5dd2-98ab-0016b76637c8', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c88550d4-a1b9-5dd0-875c-ea077a1fea70', '1626dd3b-35d6-5975-8947-e2ad80b3e357', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1015ef36-261d-5d12-a379-3a9cc44ee0da', '0229c72f-ae2b-5abe-ba68-4e12f4ed387e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1b93c548-3d5a-56f5-a73a-0a8eced5a780', '93713aeb-34a6-5c25-8207-6292fcf7caa9', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9511d42b-bd91-5f03-9f3b-3c75ce36e756', '25f93efe-41d2-5ba0-b9da-c87eef1dd9bc', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f06580a9-cfa6-5b99-916f-c1570a1f1d45', '328ce717-e6f9-51fe-80d9-841cf4b763ce', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8fb7eb33-593e-5ed1-a120-62d1dc58e046', '857a03fd-dd5b-503f-aa62-61a21027089a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('afbc217e-c39b-59ce-ab01-ef4b5b09765d', '4dbe82b9-62a0-5b54-92dc-ee1926fb9cd5', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e37b593c-34cf-50f2-af04-70d83be4fcf4', '8782c4a8-1e20-576e-84bc-c26f8a7ba212', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('85c7b26e-e53f-5c98-97ab-27bd467ab1d0', 'c81bc67c-95bc-57d3-b8cf-72b8d559ffa0', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('782148aa-cf11-5c04-8149-eb7c278ad0e4', '4ba10e85-a0c7-5cbb-81c9-1769bf1fa86b', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e2b7742b-7f03-57d0-a82f-e6360e20d35a', '761e2d60-c9a2-5980-8291-33d7e6003b77', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1e815bcd-e3fa-5a97-8c41-1af455ff8373', '01de89c3-e9b9-5e00-9ad0-f84120e68f32', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('07399ee5-b556-5ddb-9b65-7314b40ecbef', '92434f86-a3f3-59fb-a171-2737f7e4eeb3', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('2a0760f5-e32a-5d7f-8de2-f4b7d1009adb', 'ac785da4-dad6-5d02-a244-5cfbcab2d652', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3a80ef38-ed45-5be6-a416-c4c5a6d65c39', '01cba86c-0fec-53e0-ae47-3d0c9b89114d', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('43ea6c68-db8e-55f1-af70-1e2968ed7524', '27a88639-284e-56a1-8411-e220b1ff791c', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('bc390e5a-35c6-5c7b-9181-06a231156837', '14212460-9e81-582a-bb96-29396c6a6042', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e9e22369-dd92-58aa-a091-83bdbf96f231', '211dbd0d-5a0e-5292-a304-47b7d7558ee4', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4237feab-5fac-5f76-9cbe-84ad66b4c420', 'a8df724a-6971-57a6-9179-d322345a337a', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3bf73374-94d3-5f87-84d4-e41ce92d9227', '9802ed5a-ab9e-55c1-965c-f39d4fcac334', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('bce09486-bbde-56fd-928c-fd9331702cc2', '3335315b-d3a9-5b61-a1d7-e1c790b7379e', '84622ddf-5eea-590c-b5d9-a9b0b3457a31', 'de9a9746-9015-5051-adde-fb2a41d6461a', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('2f8860da-41b2-57fa-bf22-01bab48cf936', '86febf74-ea70-54bd-a977-5fef41535de6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('aba46770-9e71-5d36-9241-a54a56c18eb6', '796a0b4c-79c4-5520-a5e6-1ca795541916', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a2a3b3a2-9bbb-51a2-83f3-d95b511cd12e', '8a488bb8-0545-5437-92d3-6a291cb433f3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('cb183588-7119-5499-98f5-5b06d8dec1db', '153ddbde-3392-5515-ba7b-c70713398f98', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('713df7c2-c48c-594f-8a2f-b2220af45715', '5f96504f-17e0-5fc7-bbc1-3449e63a6cb7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f6947bd6-7a01-5c20-a565-59d2b23d0b6b', '186afdf0-dd25-5244-a5aa-901ef2c116f6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7da08679-8118-570e-9fd7-969460b4d96a', 'd9d3518f-d84f-5f04-a5e8-b1495a91462b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('eca0fe35-b2f1-5794-98a4-a16aed712efd', '16e2ad45-d2bc-59ca-b661-973cc8ef9642', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('777341db-22cc-55d8-880a-7229ae42447f', 'a4e58a74-865e-511e-abad-777a9289935f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ce1f8671-177f-5622-a647-8cfadef3ae5e', 'a177bfbe-6129-5224-ba4e-33c497244c62', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('62e3c11d-0bba-5eaa-b133-981522e7beee', 'b8e73cc0-3e5f-563a-8706-290ac4b62a16', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3ef24ec4-884a-5a16-8927-e86cba53aaa9', '76cfa76e-3fad-5ac9-84d3-efa06995ec78', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5b119a55-45d7-5305-8ff2-846bc4efd20d', 'c27567a2-0f42-5bd9-b7f1-acfcc4c76d41', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('22366a1f-0cd4-5e0d-b053-2b6cb8588ee8', 'd30e684c-33b9-563f-842a-c91c917f42b9', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f6833e93-5677-52d1-9148-f819e7a9c0e6', '802e77f9-2e16-54cb-8074-cff31dc1ad4d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('df6f94a6-daf9-517e-9fd5-f95bc45b598f', 'f6e156c7-10aa-50b9-8b47-38954627ba02', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1829d823-ecb8-5cfd-a64e-c8aef0331366', '793a1798-aebf-5b6e-b824-9c0096102698', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('14ea13ca-338b-5d20-9b55-a43c3772cd4d', 'a658837b-4b2e-5ea4-873f-75abbf1882e4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7160e0fa-f912-5792-bbe0-df07422e4170', '07011d28-ec15-5afe-8bc7-0a24f4127b26', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1f6b3f51-75ab-5ba1-a824-822dfaf3482f', '13cd8ec0-e612-5049-91af-0e9f93e8e380', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('27e2bee1-37a1-5aca-8718-0751235fd7df', '72c3c33d-63e3-5ab1-a2f9-c72e3a52aa42', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d0ff13bf-cb71-5217-92b4-f67a172e48cb', 'e5df66e5-2b0c-5e2d-b072-f0ef4e8f70f7', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('18d75a31-c0f6-52ea-a150-ba068f375eff', '5a8848e9-1cb3-5147-b7b2-db12ec254d20', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4c09cf73-9913-5b94-afc4-404ade93d172', '64137af9-0eea-547a-bae4-73ddc8138906', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('aca48cff-bd8a-5f60-b1eb-7499b2ed4ee6', '1369abad-794f-5ff7-9f9b-be437b1808ba', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('db30c3cf-ce15-5109-99c7-321167a2d9e7', '3b01d99f-0cc2-53ec-96ca-e0f09339f37f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('52b64de4-0e23-5ba2-8639-d02e0df4deb5', '7290e5f6-41c8-5c86-90d1-2fab07f56bac', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ac8cd3f2-fc74-57d4-beae-e2c8cebe5e6e', '77795aab-26bf-50e9-b8f3-064ac641b836', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('797b8975-628c-56d2-aa70-580fdabfd94c', 'ebd63099-b4ee-5f5b-ae09-33845b383555', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('437a1f60-d621-572d-82e1-b63a07ff20b9', '625309a9-adc8-5402-a4f6-ea34aaae2b1b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4b956e5b-f25a-5b40-99cc-ab7ff833b3f9', '84f74b39-53f4-537e-b586-22d343f2ce03', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7030bed7-1e8c-5f9d-9f32-1ce6cefec8d6', '48d6ef71-defa-58b7-b39b-7368acce71cc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('32145990-9ee5-5274-87aa-95f0ee87e70d', '83657e81-303f-5055-ad23-ec79bc4073fd', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('43949e8f-9da0-5b51-a9b4-7ea7ea1e6985', '707b476a-8c5a-5430-89fe-021cbda2fc38', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8d0edeb2-5727-53fe-93ca-b5c3b770a05f', '1826a0d5-5354-541e-abf9-df791e02c5dd', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('98576e4e-fa5f-5974-9edb-ab34e81306e7', '6006e3e6-fd6d-53c9-a31b-985b21607ba6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('abac7596-5506-5f9c-b1fa-7135a1b7ea16', '1bb51058-8477-5429-b58f-cea1c9b42f89', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b08eaf70-c101-5a30-bfbe-18a17b150b34', '92f4096b-2a1b-5143-a99a-cd7ec01d9362', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0d1beefd-5f3d-5ae1-85a7-755fdb6c8f01', 'f6382597-6a8c-579d-8d94-0a1193902f0f', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9c73faec-63d8-5f9f-8734-4f427c55f977', 'ee734673-cef9-596f-b7fe-5de609bc4f7c', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('52770d4d-d5e1-55f0-b7ee-8aca3a1a3c50', '2235859b-73c7-5c77-bdd4-0c159adb7624', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('fbf8c528-c3dd-5823-a548-214a654e512f', 'b54351d3-da2f-5d26-8f92-92889a1ca8ab', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4d59590d-23d1-5436-a85b-a1416d7b563b', '09359ced-93b1-5e0b-9ee9-fabb567d48b0', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('776ca50c-7da1-57da-b715-1b6d419698ca', '68718dc3-bd6a-5360-a508-bf786665cf8b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e0303a0b-74db-5fd6-b290-f7e0503212e1', 'c082977a-0bc1-5dde-b47f-0ed372760372', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('78d3c400-4ece-5bd3-bc13-3f92acb45f9b', 'dec74611-986e-5d89-b59e-1b7934707223', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ebdae8fd-a7dd-583c-aa12-f7a01282b074', '5c65c996-3864-5ef9-8a32-43096cabc679', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6199a13f-5c85-5a7e-97b1-f0d36dc43f6d', '8b9b0dfc-5d3e-5c4e-a349-f2908b9ac602', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('514e48c3-277d-586d-89a8-beaac332debf', 'da050d9a-49bb-5707-90e3-df3936e06ee2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('de748afb-6699-5a9e-b959-3f634d9f4586', '081bda8b-41a9-5b6d-8438-d9956686312d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d3c8295e-31f2-57b1-90a4-679d939856ff', 'd598a557-45d1-573f-91b1-596205ba1d6d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1f987c5f-4c56-566c-96e7-f5aeceb43069', 'ac2495ca-9f04-573b-b948-762cb2d9181e', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('66719693-f3b1-5b18-aa42-6c98e871333e', '51cd8c49-fbde-5867-972d-3d0652dd2fd2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f1126c22-d36f-5edd-b731-a660996b54c1', '05ff0a88-7333-5168-85d3-7e41b4132f9d', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3459034a-2721-5516-8647-38cf77fe798e', '7fae4f1e-2984-5f53-81ab-3fa67e00f0fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('92772991-d775-5a65-99ba-e9acb069441a', '1b117cbc-767d-5bfe-bec9-5b12bbd7e7c2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f7dd19f2-b008-5ca5-8086-63f5d5f4acaf', '86ec31d6-74a7-515f-b8cb-ef8aea291ff2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('633b8279-da72-58b1-a843-bb5381987906', '85a24d25-201f-54d6-9d29-c4131a11c151', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('dad65ec4-6a0b-5fcc-9ce1-dfe980318eac', '457a6c56-7848-5815-a0ab-048a6f040c42', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ff0470a6-c6f9-5107-879a-a0e361b88ac5', '164af1a8-f546-5c2f-ac90-c75cbb27dcb2', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('db734a54-0b04-5c3a-97ad-ea73d54014ea', '01e70aa5-7aa3-5dfd-94de-8449453da0c0', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e1bf3123-559b-5f99-a0f4-ef0287b62f41', '7dd15c7c-248f-5d8b-8d66-8ee53e9680b5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('218f29e7-a3b7-5c02-b6b9-5bdad0e50cb6', 'c88c6626-a374-539d-930b-306136977997', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('33c6ed08-c5ad-5f95-a825-e0ad7b648c20', '4f09fae9-bc1f-5c70-b3a4-63aebfd7534b', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1af41435-86a3-59e1-b3d0-8b5751086721', '3f75bed9-7420-5221-8cb7-c9a56cdbdbc6', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d1d87371-1e6c-5c70-b6ec-cdcd3ad43398', '8ce82aaa-bba7-50bd-9abc-cd39a2a4ba89', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('496988d7-ee61-5cb8-a82f-15f38eb4c77a', '1b793501-8afc-5531-88c1-205bf90a30e8', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('1b3b554b-9044-578b-b256-a806984cec1e', 'a1532a3c-f9d0-53dc-9399-2b253ba98fa1', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('92904feb-88ea-56b4-86fd-f2326a949cb1', '42712cac-bd84-5f56-a186-61f3a30739fc', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('69a5f5d9-665d-57c5-aca8-516a5e4b472c', '664708b3-13aa-5759-b160-9f79d6aa25c3', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6f6ea020-d003-5989-994f-8581de9eac3d', '485a1650-6a25-56e8-afcc-d4b4d55a46fb', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('19ded1a0-a9f9-50e3-bdcf-bb460d801790', 'a005ef46-0d18-59af-831a-8ee184c1e553', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3f8a0c23-22ca-507c-82e0-0f3e236082da', '2bbe973a-1ce8-5cc0-b44b-2ff3079f6f82', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5a7c0425-b922-5b8d-8e48-4f78d0664f65', '664a11a2-c908-5141-b6cf-25338e5ebed5', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f6c25348-51dc-5bd9-bf94-0d44e77352ab', 'df6340d1-f9e4-5cea-96a5-27648403aab4', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('76c6e186-a442-5386-be2b-b119e9ab1787', 'b2c6b689-9bdb-5a09-978c-92a6eb85e111', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7a9caa2e-10f1-5c72-8a9f-ea4e7f2653b6', '01d9af3d-0e55-556a-aee4-1a9f49d61c4a', 'a7690b7b-9883-5ac1-b940-db5f13582c7a', 'ea1110f5-aeec-5be3-9752-ccc1ac7557c6', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('927aa011-3b78-521e-9256-0de0b820b130', '5042062a-fafb-5613-bd98-6c5df5e2446e', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('149f6581-e29b-5c8e-9a6f-15310cfe6b50', 'f48a1ebc-9a36-520b-989c-27f98a568367', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e4672631-e327-5a38-b87d-fdf24de10b98', '6a338509-e525-53ec-940c-21bd7329edf3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('cc42b7eb-e5f3-5afe-a45a-a1ea33294890', '66522e0c-15d1-5f8e-9908-725c0dff39df', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e85ca4a5-88a5-59e3-85ff-b6f7faf9be01', '82517c4d-c0b9-54a2-ac6c-36b1799e2ed2', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('9ac02897-e982-57b1-a02f-a84ba0d9147e', '25a33616-f1df-53c2-ab39-7f72e7be05e4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('871b770b-c043-5a29-94c7-1b92991e1e37', '0780080e-5529-5a0f-ba33-ebf948042c22', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e85cbca4-875f-5d61-84ab-13f55b6df152', 'cf23521a-f49a-5f16-bc8e-6868ae9d2b61', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('18b11629-80e3-5f1c-b450-1f14bebfa004', 'afe52e0b-fbee-58f4-b3e9-8256047867e0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d10bbe36-fa1f-5937-bf06-0c26ce37cef0', 'dd3ac8f8-85f9-5893-8d8d-00c705615d95', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f9826625-e6bc-5463-864e-f9f3d83be2f8', 'b71285ba-208d-5ad4-a2bf-5c5210ab1c37', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('15304673-1ec5-5c09-84e5-06cb38b9c7b6', 'bf2af5ec-b907-532c-b526-a7c25e64b444', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('78ef7ff8-83c4-55fd-865b-3d639088e90f', '525c17d6-fa6b-5b0e-936e-95a0621ea2cc', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('bb7060cf-e938-5f84-b67f-0f46b24464e7', 'cb15f429-7960-5737-955c-e8665139179a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('30ab1dfd-6dbb-5580-9882-9cb9a58e78db', '8eb394aa-d000-50c7-8961-5e6e93d5d2fe', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d07ddb7a-0db1-5036-a1f5-c090ce4dfae0', 'b41e1d1e-b2dd-5fe9-9dee-9eb2a9871e78', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8e7fb93c-69d1-5734-9e85-16705c8ee2da', '69f26489-1d61-535f-89a6-3a704b365993', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6d06a80a-d34d-589f-9ff3-180d0bfbe97d', '22fc8531-282a-5628-96e2-c1ffb582f4dc', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('23d6d0b8-f969-5fb6-ab8b-e680f39d9530', '4df3bef4-a420-51d3-9b39-6775a01e81f3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c37135db-e2c2-5850-acd5-949d2e139a67', 'f7023f53-4a76-51b1-86cd-cf9f1f41ec04', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('89c4685f-27bb-5a77-a79a-ea8d3f94a8a7', '61391e19-c7ab-5cb2-bac6-091bc676bf1f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5f52b541-2177-5462-9370-fd352d13b254', '0e9d1639-6683-5898-bdc1-cd45a564f12b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('177bf472-7a06-52f2-92a9-f2a8baf17d1e', 'fafc2a6b-4a19-560b-9d6b-10c1fec58b6c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('42c65cfa-305b-5099-9627-02902e1702f6', '0112bd55-30fe-5356-b803-780b8324b198', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6ef096ce-b0e4-574a-a6e4-fbc8bab7a2c1', '48c82575-eae0-57e3-98aa-b83d421e73fd', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('56ca30c0-1254-5a0b-b8fd-4507d7d916c6', '8beafe18-b109-544d-ac59-07c7810e1a92', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('4f043b38-b296-5050-97bc-d84c13ce49f7', 'eb1ead33-8b1a-5574-9c62-487464194b46', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('85664458-66e8-589c-a3f2-997eb501a2b9', '29031ab6-5d1c-5c39-9250-9caf4abdbc9c', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('adb50519-000c-574a-b720-3dcdf34bacd8', '370635ca-4642-50d4-8f7b-a28c9fad804b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('2c991867-a64d-5b5e-a1e2-050a860aefd2', 'e4f2e946-8f12-5c41-b917-806f22fdaa71', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('aee11df2-7d3c-5576-a7e3-1a7003c89ace', '8c14d1af-9309-55ef-a6ae-12e5d4af92a9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('ff0c9b5c-01f4-5cd7-8041-ae3af20037e3', '99e7fbda-e804-556f-aa77-f6d31396196d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('eb36a772-c757-5ba2-be5d-852fa8a18367', 'f8d4c553-8292-5f4a-a623-61a2801f54bf', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d2f8546b-fdc4-5214-b5f1-141d36e32738', '5df1e4de-bee3-5ed3-a78e-ff475a6ef6b3', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('fe6a336f-d168-5c4c-9e9b-b4d424692244', 'd402fbd0-48a4-5ba1-8afa-a0e7b5e7b1d9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('fe25177d-e2e8-5707-a2cc-f416ae3692e4', '2f8de48d-9ede-562f-b143-648c0982930a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('02f5a267-d60d-5ca9-9ab1-e5f5a4f1d287', 'd6506cfc-dc32-5135-a977-9e6ba219135a', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f214403c-ceed-5a7a-aa60-83f9c917f2b1', 'b9aa155a-ae77-5480-9afa-541840cfc63f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('97915561-1500-5a43-b5a9-0d2cbd13be24', '221f4ce3-8559-5a20-b8da-45a4bc9d9808', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('7bfb456f-c0ca-5a6e-8483-3b320018cea9', '09650291-b21c-5341-9ac2-4cae6e1d15f4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('62c2bd11-7846-599c-926b-d990fb1db6e9', '10902689-7bcc-5f16-949a-4cceb705ba47', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f145b7d2-0e05-5689-8103-b0e56fcd15cb', 'd4d8dea1-4cfd-593c-b6aa-5bbef8c8e8d7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('e187748b-fff4-517f-bbee-c74bf032d56a', 'c607ca11-6d7f-5ddb-bffb-2520f2c652ba', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('d1eb6907-c48b-56ea-aa6d-c996ab2787e2', 'd6781c94-8acb-5bca-8f1a-87b91b21b2a1', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '5ee0a346-e6d1-5bb3-9dac-537ce0974065', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a84d9abd-4e02-5901-8725-d1dd8a1916bb', '08c9ebe2-cb8b-561c-86b2-e6e2395b8491', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('c69a40d3-2822-528e-b73e-eadf9c89c37b', '91c83bdd-f1d8-5664-8241-a2014277fbf7', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('45f17309-17d4-554f-a0dc-7b3663cc2f2c', 'd75c0d8c-6cf5-5463-9f06-972464d768a9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('cad271e9-4cd0-5484-8bbc-506ad88b8ef5', '4540c941-274c-5a7a-9b65-950a5bdbbe39', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('babcd3cf-5a32-50d5-ac65-e1346b07ab96', 'aa8e9fe9-91f0-55c0-b923-f304d75617c4', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6ef4e226-5c62-5d17-8507-53fb3b7d5807', '4c072784-039a-50aa-9360-5c0d655130d9', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0f8bdaa9-dd65-5256-8a48-5cffe0aa4372', 'e4a3eaf6-71cd-5006-b3ad-58d8e54938d5', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('32d4eb48-6f7a-5361-906c-32a378b51dab', 'c6c80162-b3d6-5cc5-8894-74c06f8e69ff', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('736bce44-14fd-5884-9d9d-4519faebd44c', '125b70c0-b68a-55be-b901-7ae49354419b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('80877387-950e-50da-9c12-91d416d4dd93', '821507e5-bcb7-5d3b-b6af-1bb249c93e3d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('b6de4819-f211-5e6f-aa09-c3098e417304', 'd9aa9fe5-ef23-5bf5-954c-87fb722752c0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('790df11b-1599-55fa-8776-7404c2fbb862', 'b871ae33-5778-5f96-9561-2c612960b46d', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('810a66ec-223b-590a-9b3e-2ccbd87cce38', '6174c2f6-3787-5818-b109-2d49857deaa0', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('46c10fec-ef1e-503e-a8c8-2d727011f855', '866cb109-d21e-5261-b633-305274462086', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('eef9132c-f3c6-52fd-828f-db567ebc90ba', '2aaebd5f-51a5-5e69-91c9-e4117d8e19e8', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('79a88104-b003-52b6-88a2-75379150de84', 'e9c17fc7-1f0a-5581-b47c-2650deefb509', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('3f59c71a-7fa5-5423-8a73-6a3019170408', 'b2aa721c-be83-502e-981b-6d5b7af9ff64', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6a2cc940-32e9-5171-9b4d-70a95afc62f8', '8e9ac011-bd26-57e5-ad81-851a487bff74', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('02c627d4-3ec3-5beb-9b24-dff513f4e7c4', 'de5c24c4-40c0-5be8-94cd-76475d77f735', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('434f7643-3581-501e-8b6b-ca32c47fb676', '7d0da298-493e-5195-80db-dcc1bf14a586', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('8bf0c29e-1c60-5fdc-9d9f-d5f271fc8f18', 'baf3a1cc-e9dc-5bc3-bb9b-f4dfb0cede82', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('0a0f865b-d79b-5d37-a2e9-144d50fb1c25', '4d2fc8db-350c-5ef0-8fd8-3de8a9da1931', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('6d9d4a1c-9484-5e29-80ce-0a670e605a27', 'd9374f1c-a86e-59dd-8bf5-907fb2e0222f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('5f0a49e3-6435-522a-a5f9-12bad449a7a4', '52fcd459-bcc7-559e-9e70-1da7a3f6fe3b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('a7f932b0-fdb0-5c1c-9cdb-4c7c3b726f51', 'c94818ae-36bc-5fa9-84e6-98bd394f6b6b', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;

INSERT INTO work_schedules (id, employee_id, company_id, shift_id, effective_from, is_active)
VALUES ('f42dd977-71ba-573c-85e7-5b37145a5be6', 'ec9f0a7b-07f6-5dab-8844-0002bb315e4f', 'ac15c29f-ede7-55e2-a164-ebb95cb41b98', '870fc563-92a3-5578-9ef0-2ace334c66bd', '2025-01-01', true)
ON CONFLICT (id) DO UPDATE SET shift_id=EXCLUDED.shift_id, is_active=true;


-- ══════════════════════════════════════════════════════════════
-- STEP 13: Update SHD-005 to link with correct org structure
-- ══════════════════════════════════════════════════════════════
-- SHD-005 is already in DB - just make sure it has correct references
-- (It's employee_code SHD-005, already has correct company/branch/dept/position)

COMMIT;

-- ══════════════════════════════════════════════════════════════
-- SUMMARY
-- ══════════════════════════════════════════════════════════════
-- Companies: 4 (SHD, RABBIT, TOP ONE, PTC)
-- Departments: 16 (across all companies)
-- Branches: 41
-- Positions: 89
-- Employees: 327 + 9 extra supervisors = 336
-- Supervisor links: 318
-- Manager roles: 37
-- Schedule profiles: 327
