-- ═══════════════════════════════════════════════════════════════════
-- เพิ่มกะ 07:00-16:00 ให้ทุกบริษัท
-- กะปกติ (ไม่ข้ามคืน) เวลาทำงาน 8 ชม. พักเที่ยง 1 ชม.
-- รันใน Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_company RECORD;
  v_count INT := 0;
BEGIN

  FOR v_company IN
    SELECT id, code, name_th FROM companies WHERE is_active = true
  LOOP
    -- ตรวจว่ามีกะ 07:00-16:00 อยู่แล้วหรือยัง
    IF NOT EXISTS (
      SELECT 1 FROM shift_templates
      WHERE company_id = v_company.id
        AND work_start = '07:00:00'
        AND work_end   = '16:00:00'
    ) THEN
      INSERT INTO shift_templates (
        id, company_id, name, shift_type, work_start, work_end,
        break_minutes, is_overnight, ot_start_after_minutes, is_active
      ) VALUES (
        gen_random_uuid(),
        v_company.id,
        'กะ 07:00-16:00',
        'normal',
        '07:00:00',
        '16:00:00',
        60,
        false,
        0,
        true
      );

      v_count := v_count + 1;
      RAISE NOTICE '✅ เพิ่มกะ 07:00-16:00 ให้ % (%)', v_company.code, v_company.name_th;
    ELSE
      RAISE NOTICE '⏭ % (%) มีกะ 07:00-16:00 อยู่แล้ว', v_company.code, v_company.name_th;
    END IF;
  END LOOP;

  RAISE NOTICE '══════════════════════════════════════';
  RAISE NOTICE '✅ เพิ่มกะ 07:00-16:00 สำเร็จ % บริษัท', v_count;
  RAISE NOTICE '══════════════════════════════════════';

END $$;
