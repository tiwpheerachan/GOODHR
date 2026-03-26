-- ═══════════════════════════════════════════════════════════════════
-- เพิ่ม leave_types (ประเภทการลา) ให้ทุกบริษัทที่ยังไม่มี
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  r RECORD;
  cnt INTEGER;
BEGIN
  -- วนลูปทุกบริษัทที่ active
  FOR r IN SELECT id, code, name_th FROM companies WHERE is_active = true ORDER BY name_th
  LOOP
    -- นับจำนวน leave_types ที่มีอยู่แล้ว
    SELECT count(*) INTO cnt FROM leave_types WHERE company_id = r.id;

    IF cnt = 0 THEN
      RAISE NOTICE '⬇ เพิ่ม leave_types ให้ % (%)', r.code, r.name_th;

      -- ลาป่วย (30 วัน/ปี, มีเงิน)
      INSERT INTO leave_types (id, company_id, code, name, is_paid, days_per_year, color_hex, is_active, carry_over, require_document)
      VALUES (gen_random_uuid(), r.id, 'sick', 'ลาป่วย', true, 30, '#ef4444', true, false, false);

      -- ลากิจ (6 วัน/ปี, มีเงิน)
      INSERT INTO leave_types (id, company_id, code, name, is_paid, days_per_year, color_hex, is_active, carry_over, require_document)
      VALUES (gen_random_uuid(), r.id, 'personal', 'ลากิจ', true, 6, '#f59e0b', true, false, false);

      -- ลาพักร้อน (6 วัน/ปี, มีเงิน, ยกยอด)
      INSERT INTO leave_types (id, company_id, code, name, is_paid, days_per_year, color_hex, is_active, carry_over, require_document)
      VALUES (gen_random_uuid(), r.id, 'vacation', 'ลาพักร้อน', true, 6, '#3b82f6', true, true, false);

      -- ลาคลอด (98 วัน, มีเงิน)
      INSERT INTO leave_types (id, company_id, code, name, is_paid, days_per_year, color_hex, is_active, carry_over, require_document)
      VALUES (gen_random_uuid(), r.id, 'maternity', 'ลาคลอด', true, 98, '#ec4899', true, false, false);

      -- ลาบวช (15 วัน, ไม่มีเงิน)
      INSERT INTO leave_types (id, company_id, code, name, is_paid, days_per_year, color_hex, is_active, carry_over, require_document)
      VALUES (gen_random_uuid(), r.id, 'ordination', 'ลาบวช', false, 15, '#8b5cf6', true, false, false);

      -- ลารับราชการทหาร (60 วัน, มีเงิน)
      INSERT INTO leave_types (id, company_id, code, name, is_paid, days_per_year, color_hex, is_active, carry_over, require_document)
      VALUES (gen_random_uuid(), r.id, 'military', 'ลารับราชการทหาร', true, 60, '#10b981', true, false, false);

      RAISE NOTICE '  ✓ เพิ่ม 6 ประเภทการลาสำเร็จ';
    ELSE
      RAISE NOTICE '✓ % (%) มี leave_types อยู่แล้ว % รายการ — ข้าม', r.code, r.name_th, cnt;
    END IF;
  END LOOP;

  -- แสดงสรุป
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'สรุป leave_types ทั้งหมดหลัง migration:';
  FOR r IN
    SELECT c.code, c.name_th, count(lt.id) AS type_count
    FROM companies c
    LEFT JOIN leave_types lt ON lt.company_id = c.id AND lt.is_active = true
    WHERE c.is_active = true
    GROUP BY c.code, c.name_th
    ORDER BY c.name_th
  LOOP
    RAISE NOTICE '  % (%): % ประเภท', r.code, r.name_th, r.type_count;
  END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════
-- เพิ่ม leave_balances ปี 2026 ให้พนักงานที่ยังไม่มี
-- (รันต่อจาก leave_types ด้านบน)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO leave_balances (id, employee_id, leave_type_id, year, entitled_days, used_days, pending_days, carried_over, remaining_days)
SELECT gen_random_uuid(), e.id, lt.id, 2026,
       COALESCE(lt.days_per_year, 0), 0, 0, 0, COALESCE(lt.days_per_year, 0)
FROM employees e
JOIN leave_types lt ON lt.company_id = e.company_id AND lt.is_active = true
WHERE e.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM leave_balances lb
    WHERE lb.employee_id = e.id
      AND lb.leave_type_id = lt.id
      AND lb.year = 2026
  );

-- แสดงสรุป leave_balances ที่เพิ่มแล้ว
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE 'สรุป leave_balances ปี 2026 ต่อบริษัท:';
  FOR r IN
    SELECT c.code, c.name_th,
           count(DISTINCT lb.employee_id) AS emp_count,
           count(lb.id) AS balance_count
    FROM companies c
    JOIN employees e ON e.company_id = c.id AND e.is_active = true
    LEFT JOIN leave_balances lb ON lb.employee_id = e.id AND lb.year = 2026
    WHERE c.is_active = true
    GROUP BY c.code, c.name_th
    ORDER BY c.name_th
  LOOP
    RAISE NOTICE '  % (%): % พนักงาน, % รายการ leave_balance', r.code, r.name_th, r.emp_count, r.balance_count;
  END LOOP;
END $$;
