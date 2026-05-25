-- ════════════════════════════════════════════════════════════════════
-- Migration: เพิ่ม "section header" ใน branch_eval_template_items
-- ────────────────────────────────────────────────────────────────────
-- เพิ่มความสามารถจัดกลุ่มข้อตรวจประเมินเป็นหัวข้อหลัก (sections)
--   • is_section = true → แถวคั่นหัวข้อ (ไม่ใช่คำถามจริง)
--   • is_section = false (default) → ข้อตรวจปกติ
--   • update recalc_branch_evaluation_score ให้ skip section ตอนรวมคะแนน
-- ════════════════════════════════════════════════════════════════════

-- 1) เพิ่ม column
ALTER TABLE branch_eval_template_items
  ADD COLUMN IF NOT EXISTS is_section BOOLEAN DEFAULT false;

-- index ช่วยเรียงตาม order_no เร็วขึ้น (มีอยู่แล้ว แต่ใส่ also-by-section ถ้ายังไม่มี)
CREATE INDEX IF NOT EXISTS idx_branch_eval_items_template_order
  ON branch_eval_template_items(template_id, order_no);

-- 2) update RPC ให้ skip section ตอนคำนวณคะแนน
CREATE OR REPLACE FUNCTION recalc_branch_evaluation_score(p_eval_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_weight NUMERIC := 0;
  v_total_score  NUMERIC := 0;
  v_pct          NUMERIC := 0;
BEGIN
  SELECT
    COALESCE(SUM(i.weight), 0),
    COALESCE(SUM(a.earned_weight), 0)
  INTO v_total_weight, v_total_score
  FROM branch_eval_template_items i
  JOIN branch_evaluations e ON e.template_id = i.template_id
  LEFT JOIN branch_evaluation_answers a ON a.evaluation_id = e.id AND a.item_id = i.id
  WHERE e.id = p_eval_id
    AND COALESCE(i.is_section, false) = false;   -- ⚠️ skip section headers

  v_pct := CASE
    WHEN v_total_weight > 0 THEN ROUND((v_total_score / v_total_weight) * 10000) / 100
    ELSE 0
  END;

  UPDATE branch_evaluations
  SET total_weight = v_total_weight,
      total_score  = v_total_score,
      percentage   = v_pct,
      updated_at   = now()
  WHERE id = p_eval_id;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';

-- ─────────── VERIFY ──────────────────────────────────────────────
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM information_schema.columns
  WHERE table_name = 'branch_eval_template_items' AND column_name = 'is_section';
  RAISE NOTICE '✓ is_section column: %', CASE WHEN v_count > 0 THEN 'มีแล้ว' ELSE 'ไม่พบ' END;
END $$;
