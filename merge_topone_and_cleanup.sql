-- ═══════════════════════════════════════════════════
-- Merge TOPONE → TOP1 แล้วลบ TOPONE + PCT
-- TOP1 id: 3d383dcd-9544-4b38-8cff-a37b69b9db57
-- ═══════════════════════════════════════════════════

BEGIN;

-- ── ดึง ID ของทั้งสองบริษัท ──
DO $$
DECLARE
  v_old_id uuid; -- TOPONE (จะถูกลบ)
  v_new_id uuid; -- TOP1 (จะเก็บไว้)
  v_pct_id uuid; -- PCT (จะถูกลบ)
BEGIN
  SELECT id INTO v_old_id FROM companies WHERE code = 'TOPONE';
  SELECT id INTO v_new_id FROM companies WHERE code = 'TOP1';
  SELECT id INTO v_pct_id FROM companies WHERE code = 'PCT';

  IF v_old_id IS NULL THEN
    RAISE NOTICE 'TOPONE not found — skip';
    RETURN;
  END IF;
  IF v_new_id IS NULL THEN
    RAISE NOTICE 'TOP1 not found — skip';
    RETURN;
  END IF;

  RAISE NOTICE 'Merging TOPONE (%) → TOP1 (%)', v_old_id, v_new_id;

  -- ══════════════════════════════════════════
  -- 1) ย้าย employees จาก TOPONE → TOP1
  -- ══════════════════════════════════════════
  UPDATE employees SET company_id = v_new_id WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 2) ย้าย branches → TOP1 (ข้ามถ้าชื่อซ้ำ)
  -- ══════════════════════════════════════════
  -- อัปเดต branch ที่ชื่อไม่ซ้ำกับ TOP1
  UPDATE branches SET company_id = v_new_id
  WHERE company_id = v_old_id
  AND NOT EXISTS (
    SELECT 1 FROM branches b2
    WHERE b2.company_id = v_new_id AND b2.name = branches.name
  );
  -- branch ที่ชื่อซ้ำ → ย้าย employee ที่อ้างถึงไปใช้ branch ของ TOP1 แทน
  UPDATE employees e SET branch_id = (
    SELECT b2.id FROM branches b2
    WHERE b2.company_id = v_new_id AND b2.name = (
      SELECT b_old.name FROM branches b_old WHERE b_old.id = e.branch_id
    ) LIMIT 1
  )
  WHERE e.company_id = v_new_id
  AND e.branch_id IN (SELECT id FROM branches WHERE company_id = v_old_id);
  -- ย้าย employee_allowed_locations ที่อ้าง branch เก่า
  UPDATE employee_allowed_locations eal SET branch_id = (
    SELECT b2.id FROM branches b2
    WHERE b2.company_id = v_new_id AND b2.name = (
      SELECT b_old.name FROM branches b_old WHERE b_old.id = eal.branch_id
    ) LIMIT 1
  )
  WHERE eal.branch_id IN (SELECT id FROM branches WHERE company_id = v_old_id);
  -- ลบ branches เก่าที่เหลือ
  DELETE FROM branches WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 3) ย้าย departments → TOP1
  -- ══════════════════════════════════════════
  UPDATE departments SET company_id = v_new_id
  WHERE company_id = v_old_id
  AND NOT EXISTS (
    SELECT 1 FROM departments d2
    WHERE d2.company_id = v_new_id AND d2.name = departments.name
  );
  UPDATE employees e SET department_id = (
    SELECT d2.id FROM departments d2
    WHERE d2.company_id = v_new_id AND d2.name = (
      SELECT d_old.name FROM departments d_old WHERE d_old.id = e.department_id
    ) LIMIT 1
  )
  WHERE e.company_id = v_new_id
  AND e.department_id IN (SELECT id FROM departments WHERE company_id = v_old_id);
  DELETE FROM departments WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 4) ย้าย positions → TOP1
  -- ══════════════════════════════════════════
  UPDATE positions SET company_id = v_new_id
  WHERE company_id = v_old_id
  AND NOT EXISTS (
    SELECT 1 FROM positions p2
    WHERE p2.company_id = v_new_id AND p2.name = positions.name
  );
  UPDATE employees e SET position_id = (
    SELECT p2.id FROM positions p2
    WHERE p2.company_id = v_new_id AND p2.name = (
      SELECT p_old.name FROM positions p_old WHERE p_old.id = e.position_id
    ) LIMIT 1
  )
  WHERE e.company_id = v_new_id
  AND e.position_id IN (SELECT id FROM positions WHERE company_id = v_old_id);
  DELETE FROM positions WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 5) ย้าย shift_templates → TOP1
  -- ══════════════════════════════════════════
  UPDATE shift_templates SET company_id = v_new_id
  WHERE company_id = v_old_id
  AND NOT EXISTS (
    SELECT 1 FROM shift_templates st2
    WHERE st2.company_id = v_new_id AND st2.name = shift_templates.name
  );
  -- work_schedules ที่อ้าง shift เก่า → ย้ายไปใช้ shift ของ TOP1
  UPDATE work_schedules ws SET shift_template_id = (
    SELECT st2.id FROM shift_templates st2
    WHERE st2.company_id = v_new_id AND st2.name = (
      SELECT st_old.name FROM shift_templates st_old WHERE st_old.id = ws.shift_template_id
    ) LIMIT 1
  )
  WHERE ws.shift_template_id IN (SELECT id FROM shift_templates WHERE company_id = v_old_id);
  DELETE FROM shift_templates WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 6) ย้าย leave_types → TOP1
  -- ══════════════════════════════════════════
  UPDATE leave_types SET company_id = v_new_id
  WHERE company_id = v_old_id
  AND NOT EXISTS (
    SELECT 1 FROM leave_types lt2
    WHERE lt2.company_id = v_new_id AND lt2.code = leave_types.code
  );
  -- leave_balances ที่อ้าง leave_type เก่า → ย้าย
  UPDATE leave_balances lb SET leave_type_id = (
    SELECT lt2.id FROM leave_types lt2
    WHERE lt2.company_id = v_new_id AND lt2.code = (
      SELECT lt_old.code FROM leave_types lt_old WHERE lt_old.id = lb.leave_type_id
    ) LIMIT 1
  )
  WHERE lb.leave_type_id IN (SELECT id FROM leave_types WHERE company_id = v_old_id);
  -- leave_requests ที่อ้าง leave_type เก่า → ย้าย
  UPDATE leave_requests lr SET leave_type_id = (
    SELECT lt2.id FROM leave_types lt2
    WHERE lt2.company_id = v_new_id AND lt2.code = (
      SELECT lt_old.code FROM leave_types lt_old WHERE lt_old.id = lr.leave_type_id
    ) LIMIT 1
  )
  WHERE lr.leave_type_id IN (SELECT id FROM leave_types WHERE company_id = v_old_id);
  DELETE FROM leave_types WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 7) ย้าย users ที่อ้าง company_id เก่า
  -- ══════════════════════════════════════════
  UPDATE users SET company_id = v_new_id WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 8) ย้ายตารางอื่นที่มี company_id
  -- ══════════════════════════════════════════
  -- อัปเดตเฉพาะตารางที่มี company_id จริง (ข้าม notifications, salary_structures)
  UPDATE attendance_records SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE leave_requests SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE time_adjustment_requests SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE overtime_requests SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE payroll_periods SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE payroll_records SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE kpi_forms SET company_id = v_new_id WHERE company_id = v_old_id;
  UPDATE resignation_requests SET company_id = v_new_id WHERE company_id = v_old_id;

  -- ══════════════════════════════════════════
  -- 9) ลบ TOPONE
  -- ══════════════════════════════════════════
  DELETE FROM companies WHERE id = v_old_id;
  RAISE NOTICE 'Deleted TOPONE (%)' , v_old_id;

  -- ══════════════════════════════════════════
  -- 10) ลบ PCT (0 พนักงาน, ไม่ใช้แล้ว)
  -- ══════════════════════════════════════════
  IF v_pct_id IS NOT NULL THEN
    -- ลบ sub-tables ของ PCT ถ้ามี
    DELETE FROM leave_types WHERE company_id = v_pct_id;
    DELETE FROM shift_templates WHERE company_id = v_pct_id;
    DELETE FROM positions WHERE company_id = v_pct_id;
    DELETE FROM departments WHERE company_id = v_pct_id;
    DELETE FROM branches WHERE company_id = v_pct_id;
    DELETE FROM companies WHERE id = v_pct_id;
    RAISE NOTICE 'Deleted PCT (%)' , v_pct_id;
  END IF;

END $$;

COMMIT;

-- ═══ ตรวจสอบผลลัพธ์ ═══
SELECT id, code, name_th, name_en,
  (SELECT count(*) FROM employees e WHERE e.company_id = c.id) AS emp_count
FROM companies c
ORDER BY code;
