-- ════════════════════════════════════════════════════════════════════
-- Seed Probation Evaluation Template
--   พนักงาน: 69000101 — กุลรวี วรกวิน (เก๋ Kea)
--   ผู้ประเมิน: 64000075 — CHEN JINBIAO (อากิมบิว)
--
--   ใส่ template 4 หัวข้อ (รวม 100%) เป็นฟอร์ม draft ในทุกรอบที่ "ยังไม่ได้ประเมิน"
--   (round = 1/2/3) → CHEN เปิดฟอร์มแล้วกรอกคะแนนได้เลย
--
--   เงื่อนไข:
--   - ถ้ารอบนั้นยังไม่มีฟอร์มเลย          → INSERT draft + items
--   - ถ้ามีฟอร์ม draft อยู่แล้ว             → DELETE items เก่า + INSERT items ใหม่ (overwrite template)
--   - ถ้ามีฟอร์ม submitted/approved      → ข้าม (ไม่แก้ของที่ส่งแล้ว)
--
--   หัวข้อ (รวม 100%):
--     1. การขยายตลาดเชิงกลยุทธ์ฯ                            35%
--     2. การพลิกฟื้น Brand Shop                              30%
--     3. การปรับโมเดลการค้าของคู่ค้า                          20%
--     4. การวางแผนโครงสร้าง + Talent Retention            15%
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_emp_id        UUID;
  v_company_id    UUID;
  v_hire_date     DATE;
  v_evaluator_id  UUID;
  v_round         INT;
  v_due_date      DATE;
  v_eval_id       UUID;
  v_existing_id   UUID;
  v_existing_status TEXT;
  ROUND_DAYS      INT[] := ARRAY[60, 90, 119];   -- รอบ 1, 2, 3

  v_inserted_rounds INT[] := ARRAY[]::INT[];
  v_overwritten_rounds INT[] := ARRAY[]::INT[];
  v_skipped_rounds INT[] := ARRAY[]::INT[];
BEGIN
  -- ─── 1) หาพนักงาน ─────────────────────────────────────
  SELECT id, company_id, hire_date
  INTO v_emp_id, v_company_id, v_hire_date
  FROM employees
  WHERE employee_code = '69000101'
  LIMIT 1;

  IF v_emp_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบพนักงาน 69000101 (เก๋ Kea)';
  END IF;

  IF v_hire_date IS NULL THEN
    RAISE EXCEPTION 'พนักงาน 69000101 ไม่มี hire_date — กรุณาตั้งก่อน';
  END IF;

  -- ─── 2) หาผู้ประเมิน ────────────────────────────────────
  SELECT id INTO v_evaluator_id
  FROM employees
  WHERE employee_code = '64000075'
  LIMIT 1;

  IF v_evaluator_id IS NULL THEN
    RAISE EXCEPTION 'ไม่พบผู้ประเมิน 64000075 (CHEN JINBIAO)';
  END IF;

  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE ' พนักงาน:     เก๋ Kea (69000101) · % company', v_company_id;
  RAISE NOTICE ' ผู้ประเมิน:   CHEN อากิมบิว (64000075)';
  RAISE NOTICE ' Hire date:   %', v_hire_date;
  RAISE NOTICE '═══════════════════════════════════════════════';

  -- ─── 3) วนทุกรอบ — Round 1, 2, 3 ────────────────────────
  FOR v_round IN 1..3 LOOP
    v_due_date := v_hire_date + (ROUND_DAYS[v_round] || ' days')::INTERVAL;

    -- เช็คฟอร์มเดิม
    SELECT id, status
    INTO v_existing_id, v_existing_status
    FROM probation_evaluations
    WHERE employee_id = v_emp_id AND round = v_round
    LIMIT 1;

    -- ฟอร์มเดิมเป็น submitted/approved → ข้าม
    IF v_existing_id IS NOT NULL
       AND v_existing_status IN ('submitted', 'approved')
    THEN
      RAISE NOTICE 'รอบ %: ข้าม (status=%, แตะไม่ได้)', v_round, v_existing_status;
      v_skipped_rounds := array_append(v_skipped_rounds, v_round);
      CONTINUE;
    END IF;

    -- ─── INSERT หรือใช้ของเดิม (draft) ───
    IF v_existing_id IS NULL THEN
      INSERT INTO probation_evaluations (
        company_id, employee_id, evaluator_id, round, due_date,
        status, total_score, grade
      ) VALUES (
        v_company_id, v_emp_id, v_evaluator_id, v_round, v_due_date,
        'draft', 0, NULL
      )
      RETURNING id INTO v_eval_id;

      v_inserted_rounds := array_append(v_inserted_rounds, v_round);
      RAISE NOTICE 'รอบ %: สร้าง draft ใหม่ (due %)', v_round, v_due_date;
    ELSE
      v_eval_id := v_existing_id;
      -- update evaluator + due_date (กรณีคนเดิมเปลี่ยน)
      UPDATE probation_evaluations
      SET evaluator_id = v_evaluator_id,
          due_date = v_due_date,
          updated_at = now()
      WHERE id = v_eval_id;

      -- ลบ items เก่า (overwrite template)
      DELETE FROM probation_evaluation_items WHERE evaluation_id = v_eval_id;

      v_overwritten_rounds := array_append(v_overwritten_rounds, v_round);
      RAISE NOTICE 'รอบ %: ใช้ draft เดิม + ลบ items เก่า → ใส่ template ใหม่', v_round;
    END IF;

    -- ─── INSERT 4 items (รวม 100%) ───
    INSERT INTO probation_evaluation_items (
      evaluation_id, order_no, category, description, weight_pct, actual_score, weighted_score, is_mandatory, comment
    ) VALUES
    -- ─────── 1. การขยายตลาดเชิงกลยุทธ์ (35%) ───────
    (
      v_eval_id, 1,
      'การขยายตลาดเชิงกลยุทธ์และการขับเคลื่อนช่องทางขาย (Strategic Market Expansion & Channel Execution) 战略性市场拓展与销售渠道执行',
      E'A) Onboard ≥ 2 Key Accounts (≥1 Modern Trade)\n' ||
      E'B) Achieve ≥ 70% Listing Success Rate\n' ||
      E'C) Launch new channels within ≤ 90–120 days\n' ||
      E'D) Deliver ≥ 1 MB Sell-in from new channels (first 3 months)\n' ||
      E'E) Maintain ≥ 15–20% Positive Margin\n' ||
      E'F) Ensure ≥ 40–60% Sell-through within 60 days\n\n' ||
      E'A) 完成 ≥2 个重点客户入驻（其中 ≥1 个为现代渠道）\n' ||
      E'B) 实现 ≥70% 的商品上架成功率（Listing Success Rate）\n' ||
      E'C) 在 ≤90–120 天内完成新渠道上线\n' ||
      E'D) 新渠道在前 3 个月实现 ≥100 万销售额（Sell-in）\n' ||
      E'E) 维持 ≥15–20% 的正向利润率\n' ||
      E'F) 确保 60 天内 ≥40–60% 的动销率（Sell-through）',
      35, 0, 0, TRUE, ''
    ),

    -- ─────── 2. การพลิกฟื้น Brand Shop (30%) ───────
    (
      v_eval_id, 2,
      'การพลิกฟื้นและยกระดับความสามารถในการทำกำไรของ Brand Shop (Brand Shop Profitability Improvement & Turnaround) 品牌门店盈利能力改善与扭亏转盈',
      E'A) Achieve break-even in ≥ 70% of stores within 3–6 months\n' ||
      E'B) Reduce loss-making stores\n' ||
      E'C) Improve average store P&L to ≥ 0%\n' ||
      E'D) Increase sales per store\n\n' ||
      E'A) 在 3–6 个月内实现 ≥70% 门店盈亏平衡（Break-even）\n' ||
      E'B) 减少亏损门店数量\n' ||
      E'C) 将门店平均 P&L 提升至 ≥0%（实现盈亏平衡）\n' ||
      E'D) 提升单店销售额（Sales per Store）',
      30, 0, 0, TRUE, ''
    ),

    -- ─────── 3. การปรับโมเดลการค้าของคู่ค้า (20%) ───────
    (
      v_eval_id, 3,
      'การปรับโมเดลการค้าของคู่ค้า (Partner Commercial Restructuring) Partner 商业模式与交易结构优化',
      E'Trade term agreement negotiation effectiveness\n\n' ||
      E'贸易条款协议谈判的有效性',
      20, 0, 0, TRUE, ''
    ),

    -- ─────── 4. การวางแผนโครงสร้าง + Talent Retention (15%) ───────
    (
      v_eval_id, 4,
      'การวางแผนโครงสร้างการทำงานและการบริหารบุคลากรเพื่อการรักษาคน (Workforce Planning, Operating Model & Talent Retention) 组织架构规划与人力资源管理及人才保留',
      E'A) Implement new operating workflow across all teams\n' ||
      E'B) Establish clear role & responsibility (R&R) structure\n' ||
      E'C) Roll out performance management framework\n' ||
      E'D) Launch retention initiatives (career path / incentive / engagement)\n\n' ||
      E'A) 在各团队中全面实施新的运营流程（Operating Workflow）\n' ||
      E'B) 建立清晰的岗位职责体系（R&R, Role & Responsibility）\n' ||
      E'C) 推行绩效管理体系（Performance Management Framework）\n' ||
      E'D) 启动人才保留举措（职业发展路径 / 激励机制 / 员工参与度）',
      15, 0, 0, TRUE, ''
    );

  END LOOP;

  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE ' สร้างใหม่:     %', v_inserted_rounds;
  RAISE NOTICE ' Overwrite draft: %', v_overwritten_rounds;
  RAISE NOTICE ' ข้าม (locked):  %', v_skipped_rounds;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE 'เสร็จสิ้น — เก๋ Kea เปิด /manager/probation-eval ก็จะเห็น template พร้อมกรอก';
END $$;

-- ─── ตรวจสอบผล ────────────────────────────────────────────
SELECT
  pe.round,
  pe.status,
  pe.due_date,
  pe.total_score,
  pe.grade,
  (SELECT COUNT(*) FROM probation_evaluation_items WHERE evaluation_id = pe.id) AS item_count,
  (SELECT SUM(weight_pct) FROM probation_evaluation_items WHERE evaluation_id = pe.id) AS total_weight
FROM probation_evaluations pe
WHERE pe.employee_id = (SELECT id FROM employees WHERE employee_code = '69000101')
ORDER BY pe.round;
