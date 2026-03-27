-- ═══════════════════════════════════════════════════════════════════
-- ลบ custom location "Anywhere" ที่ถูกเพิ่มมือใน employee_allowed_locations
-- (เฉพาะแถวที่เป็น custom GPS ไม่ใช่ branch จริง)
-- ตอนนี้ใช้ flag checkin_anywhere ใน employees แทนแล้ว
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_deleted INT;
BEGIN

  -- ─── ดูก่อนว่ามีกี่แถว ───
  SELECT COUNT(*) INTO v_deleted
  FROM employee_allowed_locations
  WHERE branch_id IS NULL
    AND custom_name ILIKE '%anywhere%';

  RAISE NOTICE 'พบ custom location "Anywhere" จำนวน % แถว', v_deleted;

  -- ─── ลบ custom location ที่ชื่อ Anywhere (ไม่มี branch_id = เป็น custom GPS) ───
  DELETE FROM employee_allowed_locations
  WHERE branch_id IS NULL
    AND custom_name ILIKE '%anywhere%';

  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ ลบ custom location "Anywhere" สำเร็จ % แถว', v_deleted;
  RAISE NOTICE '   (ใช้ employees.checkin_anywhere แทนแล้ว)';
  RAISE NOTICE '══════════════════════════════════════';

END $$;
