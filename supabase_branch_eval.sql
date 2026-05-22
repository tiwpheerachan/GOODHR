-- ════════════════════════════════════════════════════════════════════
-- Branch Evaluation System (Store Visit Checklist)
-- ════════════════════════════════════════════════════════════════════
-- โครงสร้าง:
--   templates → items (QUESTION POOL + weight)
--   evaluations → answers (instance of evaluation per branch)
--   permissions (admin / supervisor / evaluator)
--
-- Workflow:
--   admin สร้าง template → มอบสิทธิ์ supervisor (per branch)
--   supervisor มอบสิทธิ์ evaluator (per branch)
--   evaluator เข้าสาขา → check-in (GPS + รูปทางเลือก) → กรอกฟอร์ม → submit
--   supervisor review + comment
-- ════════════════════════════════════════════════════════════════════

-- 1) TEMPLATES
--    company_id เป็น UUID เปล่า (ไม่ผูก FK) เพื่อให้รันได้แม้ตาราง companies ไม่มี
CREATE TABLE IF NOT EXISTS branch_eval_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  total_weight NUMERIC(8,2) DEFAULT 0,
  company_id UUID,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ  -- soft delete
);
CREATE INDEX IF NOT EXISTS idx_branch_eval_templates_active ON branch_eval_templates(is_active) WHERE deleted_at IS NULL;

-- เพิ่ม FK ทีหลังถ้า companies ตารางมีอยู่ (best-effort)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    BEGIN
      ALTER TABLE branch_eval_templates
        ADD CONSTRAINT branch_eval_templates_company_id_fkey
        FOREIGN KEY (company_id) REFERENCES companies(id);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2) TEMPLATE ITEMS (questions)
CREATE TABLE IF NOT EXISTS branch_eval_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES branch_eval_templates(id) ON DELETE CASCADE,
  order_no INT NOT NULL DEFAULT 1,
  code TEXT,                                                -- "1", "2", ... (display number)
  question_th TEXT NOT NULL,
  question_en TEXT,
  sub_notes TEXT[] DEFAULT '{}',                            -- bullet points / sub-checks
  weight NUMERIC(6,2) DEFAULT 1,
  answer_type TEXT NOT NULL DEFAULT 'yes_no'
    CHECK (answer_type IN ('yes_no', 'score_1_5', 'text', 'number')),
  requires_note BOOLEAN DEFAULT false,                       -- บังคับ comment ถ้าตอบ NO/score ต่ำ
  requires_photo BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_branch_eval_items_template ON branch_eval_template_items(template_id, order_no);

-- 3) EVALUATIONS (instance — สาขา X ประเมินโดย Y วันที่ Z)
CREATE TABLE IF NOT EXISTS branch_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES branch_eval_templates(id),
  template_version INT DEFAULT 1,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  evaluator_id UUID NOT NULL REFERENCES employees(id),
  visit_date DATE DEFAULT CURRENT_DATE,
  visit_time TIME,
  store_manager TEXT,                                       -- ใครอยู่ตอนตรวจ
  store_staff TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed')),
  total_score NUMERIC(8,2) DEFAULT 0,
  total_weight NUMERIC(8,2) DEFAULT 0,
  percentage NUMERIC(5,2) DEFAULT 0,
  general_notes TEXT,
  action_plan TEXT,
  -- check-in (optional, GPS + photo)
  checkin_lat NUMERIC(10,7),
  checkin_lng NUMERIC(10,7),
  checkin_distance_m NUMERIC(8,2),                          -- คำนวณห่างจาก branch.lat/lng (m)
  checkin_photo_url TEXT,
  checkin_at TIMESTAMPTZ,
  -- review
  reviewed_by UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_branch_evals_branch ON branch_evaluations(branch_id, visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branch_evals_evaluator ON branch_evaluations(evaluator_id, visit_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_branch_evals_template ON branch_evaluations(template_id);

-- 4) ANSWERS (1 row per item per evaluation)
CREATE TABLE IF NOT EXISTS branch_evaluation_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES branch_evaluations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES branch_eval_template_items(id) ON DELETE CASCADE,
  answer_value JSONB,                                        -- {yes:true} | {score:4} | {text:"..."} | {value:42}
  is_pass BOOLEAN,                                           -- คำนวณตอน save
  earned_weight NUMERIC(6,2) DEFAULT 0,                      -- weight × score_ratio
  note TEXT,                                                 -- comment per question
  photo_urls TEXT[] DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (evaluation_id, item_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_eval_answers_eval ON branch_evaluation_answers(evaluation_id);

-- 5) PERMISSIONS (admin / supervisor / evaluator)
CREATE TABLE IF NOT EXISTS branch_eval_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('branch_eval_admin', 'branch_eval_supervisor', 'branch_eval_evaluator')),
  branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,  -- null = global admin
  granted_by UUID REFERENCES employees(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, role, branch_id)
);
CREATE INDEX IF NOT EXISTS idx_branch_eval_perm_employee ON branch_eval_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_branch_eval_perm_branch ON branch_eval_permissions(branch_id);

-- 6) PHOTOS — separate table for centralized photo audit
CREATE TABLE IF NOT EXISTS branch_evaluation_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES branch_evaluations(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES branch_evaluation_answers(id) ON DELETE CASCADE,  -- nullable: check-in photo doesn't have an answer
  kind TEXT NOT NULL CHECK (kind IN ('checkin', 'answer')),
  storage_path TEXT NOT NULL,                                -- supabase storage path
  url TEXT NOT NULL,
  taken_at TIMESTAMPTZ DEFAULT now(),
  uploaded_by UUID REFERENCES employees(id)
);
CREATE INDEX IF NOT EXISTS idx_branch_eval_photos_eval ON branch_evaluation_photos(evaluation_id);

-- 7) RLS — service role only (API uses service client)
ALTER TABLE branch_eval_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_eval_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_evaluation_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_eval_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_evaluation_photos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON branch_eval_templates;
CREATE POLICY "Service role full access" ON branch_eval_templates FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON branch_eval_template_items;
CREATE POLICY "Service role full access" ON branch_eval_template_items FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON branch_evaluations;
CREATE POLICY "Service role full access" ON branch_evaluations FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON branch_evaluation_answers;
CREATE POLICY "Service role full access" ON branch_evaluation_answers FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON branch_eval_permissions;
CREATE POLICY "Service role full access" ON branch_eval_permissions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role full access" ON branch_evaluation_photos;
CREATE POLICY "Service role full access" ON branch_evaluation_photos FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ════════════════════════════════════════════════════════════════════
-- SEED — Anker Store Visit Checklist (30 items, total weight = 100)
-- ════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  v_template_id UUID;
  v_company_id UUID := NULL;
BEGIN
  -- ใช้ company แรกถ้าตารางมี (best-effort)
  BEGIN
    EXECUTE 'SELECT id FROM companies LIMIT 1' INTO v_company_id;
  EXCEPTION WHEN undefined_table THEN
    v_company_id := NULL;
  END;

  -- ไม่ seed ซ้ำถ้ามีแล้ว
  IF EXISTS (SELECT 1 FROM branch_eval_templates WHERE name = 'Anker Store Visit Checklist') THEN
    RAISE NOTICE 'Anker template already exists, skipping seed';
    RETURN;
  END IF;

  INSERT INTO branch_eval_templates (name, description, total_weight, company_id)
  VALUES (
    'Anker Store Visit Checklist',
    'STORE CHECK LIST (ANKER) — Store Visit Report · ตรวจสาขา 30 ข้อ น้ำหนักรวม 100',
    100, v_company_id
  )
  RETURNING id INTO v_template_id;

  -- 30 items
  INSERT INTO branch_eval_template_items (template_id, order_no, code, question_th, question_en, sub_notes, weight) VALUES
  (v_template_id, 1, '1', 'ความสมบูรณ์ของป้าย โลโก้ Anker และหลอดไฟหน้าร้าน', 'Completeness of Logo "Anker" and spotlight in front of shop.', '{}', 3),
  (v_template_id, 2, '2', 'การจัดเรียงสินค้าบนผนัง แยกประเภทอย่างชัดเจน ไม่จัดเรียงรวมกัน Power Bank, Soundcore, Cable, Charger, MPP, eufy', 'Display products on wall — must be separated by type such as Power Bank, Soundcore, Cable, Charger, MPP, eufy', '{}', 5),
  (v_template_id, 3, '3', 'มีการจัดเรียงสินค้าที่ gondola และสินค้าบน Area วางสินค้าตรงมาตรฐาน', 'The products on the gondola and display area are arranged according to merchandising standards.',
    ARRAY['การจัดเรียงสินค้าบนผนัง วางตำแหน่ง / จำนวน SKU / ใช้ตามคู่มือได้อย่างถูกต้อง',
          'Products on wall arranged correctly in terms of positioning, number of SKUs, and compliance with the merchandising guideline.'], 3),
  (v_template_id, 4, '4', 'การใช้ป้าย ถูกตามประเภทของกลุ่มสินค้า New, Best Seller — เช็คป้ายราคา', 'Signage used correctly according to product categories (New, Best Seller) — price tags properly checked.',
    ARRAY['การวางป้าย promotion ขนาด A5 / A4 ในตำแหน่งที่ถูกต้อง',
          'Present promotion price sign A5/A4 in the correct position'], 3),
  (v_template_id, 5, '5', 'การจัดโต๊ะ Display ในพื้นที่ขายต้องโชว์สินค้า ตรง concept ของ Brand', 'Show products which match with concept of brand at displayed table.', '{}', 5),
  (v_template_id, 6, '6', 'Graphic บริเวณพื้นที่ขายมีการ Update ตามรุ่นของสินค้า', 'Update Graphic at sale area to match the model of products.', '{}', 2),
  (v_template_id, 7, '7', 'Graphic ภายในร้าน รวมถึงอุปกรณ์ต่างๆ เช่น แผ่นอะคริลิค มีสภาพสมบูรณ์ ไม่หลุด หรือ ชำรุด', 'The graphics and equipment inside the store, including acrylic displays, are in good condition without any damage, looseness, or defects.',
    ARRAY['Hook, Hanger และ Fixture มีสภาพพร้อมใช้งาน',
          'ความสะอาดภายนอกและภายในร้าน รวมถึงเช็คทำความสะอาดทุกวัน',
          'จัดเก็บอุปกรณ์สินค้าตัวอย่างให้เป็นระเบียบ เรียบร้อย และสายงามตรงตาม Concept Brand'], 3),
  (v_template_id, 8, '8', 'การเติมสินค้าจากคลังพร้อมจำหน่ายเพียงพอสำหรับความต้องการของลูกค้า', 'Products are replenished from the stockroom and sufficiently available to meet customer demand.', '{}', 3),
  (v_template_id, 9, '9', 'แนวทางแก้ไข หรือ Action plan เกี่ยวกับยอดขาย หรือ เรื่องต่างๆ สาขาได้มีเตรียมงานไว้หรือไม่', 'Solution or Action plan about sales or various matters — the branch has prepared work or not.',
    ARRAY['การแก้ปัญหาเฉพาะหน้าของหัวหน้าร้าน / พนักงานขาย มีการเตรียมงานให้พร้อมตลอดเวลา'], 3),
  (v_template_id, 10, '10', 'การรักษา Standard ของแบรนด์ให้เป็นไปอย่างเคร่งครัด เป็นแบบอย่างที่ดีอย่างมีประสิทธิภาพ', 'Maintaining brand standards — store performance role model.',
    ARRAY['Target / Sell / Forecast', 'Stock on hands vs Stock Capacity (5× ยอดขาย)', 'Promotion + feedback', 'Competitor promotion', 'Need Support', 'Manpower (full / vacant / part time / weekend)', 'Follow up · Action Plan · Teamwork · Atmosphere'], 8),
  (v_template_id, 11, '11', 'พนักงานมีความกระตือรือร้นในการขาย สุภาพอ่อนน้อมกับลูกค้า · Service step', 'Staff are enthusiastic to sell and polite with customers · Service step',
    ARRAY['มีการทักทาย "Anker สวัสดีค่ะ / ครับ"', 'พนักงานสอบถามเรื่อง VIP Card เพื่อสะสม / สมัคร'], 5),
  (v_template_id, 12, '12', 'พนักงานมีการแจ้งสินค้าโปรโมชั่นประจำเดือนของร้าน', 'Staff inform monthly promotion for shop.', '{}', 3),
  (v_template_id, 13, '13', 'ตรวจสอบสต็อกสินค้าขายดีและสินค้า Demo ให้เพียงพอตามแผนการจัดวางของฝ่ายการตลาด รวมถึงสินค้าที่ร่วมโปรโมชั่น', 'Check and ensure sufficient stock of best-selling and demo products in accordance with the marketing display plan.', '{}', 2),
  (v_template_id, 14, '14', 'พนักงานมีความรู้เรื่องสินค้าในแต่ละรุ่น — สุ่มถาม 3-5 รายการเพื่อทดสอบความรู้', 'Staff should have knowledge of each product model — randomly ask 3–5 products to test product knowledge.', '{}', 5),
  (v_template_id, 15, '15', 'การจัดเก็บสินค้า Stock หน้าร้านมีความเป็นระเบียบตามมาตรฐานของบริษัท ง่ายต่อการบริการลูกค้า', 'Front-store stock arrangement is organized according to company standards.', '{}', 5),
  (v_template_id, 16, '16', 'การรับสินค้า — สาขาได้ตรวจนับครบตามจำนวนหรือไม่? มีการแจ้งปัญหาและตามงานจนจบขั้นตอนหรือยัง?', 'Has the branch completely checked and verified the quantity of received products? If issues, have they been reported and followed up?',
    ARRAY['ตรวจสอบขั้นตอนการรับโอนเข้าสินค้าจากคลังในระบบว่ามีเอกสารค้างหรือไม่', 'เช็ค stock negative เพื่อไม่ให้เกิดสินค้าในระบบไม่ตรงกับสินค้าจริงหน้าร้าน'], 3),
  (v_template_id, 17, '17', 'ในแต่ละวันสาขาได้ทำการตรวจเช็คโดยการสุ่มสต็อกสินค้าในร้านวันละ 5-10 รุ่นหรือสินค้าที่ปัญหาในการส่งจากคลังหรือไม่', 'Does the branch conduct daily stock checks by randomly checking 5–10 product models?', '{}', 2),
  (v_template_id, 18, '18', 'พนักงานมีการตรวจ SN ในระบบที่ยังไม่ทำรับในระบบ หรือมี SN มาแล้วแต่ไม่มีสินค้าส่งมาที่สาขาหรือไม่', 'Do staff check for SNs in the system that have not yet been received, or SNs that appear but products have not arrived?',
    ARRAY['ปัญหาการส่งสินค้าของ WH (transport problem)'], 5),
  (v_template_id, 19, '19', 'ไฟภายในร้านสว่างครบทุกดวง รวมถึงไฟ lightbox / ไฟเคาน์เตอร์แคชเชียร์', 'Lighting — all lamps are working (incl. lightbox / cashier counter).', '{}', 3),
  (v_template_id, 20, '20', 'การจัดเก็บเอกสาร อุปกรณ์ต่างๆ งานของ marketing / Graphics จัดเก็บเป็นระเบียบในที่ที่กำหนด', 'Keep all documents in fixed filing (U=Update, M=Standard) — Marketing equipment / Graphics tidy in assigned place.', '{}', 2),
  (v_template_id, 21, '21', 'เคลียร์เอกสารต่างๆที่เกี่ยวกับยอดขายและเคลียร์จบภายในวันหรือไม่ — สลิปการขายและรายละเอียดถูกต้องตามข้อกำหนดของฝ่าย admin', 'Are sales documents completed/cleared within the same day? Correctly prepared for admin submission?', '{}', 3),
  (v_template_id, 22, '22', 'ไม่เก็บสิ่งของส่วนตัว ที่ไม่เกี่ยวข้องกับการขายไว้ที่ Fixture หรือ บริเวณพื้นที่ขาย', 'Do not keep personal things (unrelated to selling) at fixtures or sales area.', '{}', 2),
  (v_template_id, 23, '23', 'ถุงใส่สินค้าและเอกสารแบบพิมพ์ทางการเงิน จัดเก็บในที่ที่กำหนด ห้ามใช้ถุงของแบรนด์อื่น', 'Shopping bag and monetary documents kept in the assigned place — do not use other brands.', '{}', 2),
  (v_template_id, 24, '24', 'ที่จุด Cashier จะต้องไม่มีลูกค้ารอชำระเงินเกิน 2 คิว และรอเกิน 3 นาทีต่อคน', 'At Cashier — should not have customers waiting more than 2 queue and not more than 3 minutes per person.', '{}', 3),
  (v_template_id, 25, '25', 'ตรวจนับ Cash Float, Chat Shop / Counting the money in the safe', 'Counting cash float / money in safe',
    ARRAY['ตรวจ Cash Float ที่สาขาต้องตรวจนับและลงบันทึกทุกวันก่อนเริ่มงาน',
          'ตรวจการโอนเงินเข้าบริษัทและการเมล์ส่งบัญชี'], 5),
  (v_template_id, 26, '26', 'ตรวจรายงานการขายว่ามีเอกสารบัญชีในการ Payslip Bank ตกค้างส่งบัญชีหรือไม่', 'Check sales report to ensure no pending bank payslips awaiting accounting submission.', '{}', 2),
  (v_template_id, 27, '27', 'สาขามี Morning meeting ก่อนเริ่มงานทุกวัน และตรวจเช็คบอร์ดประจำร้าน', 'Branch has morning meeting before starting work every day and recheck chart board.',
    ARRAY['ตรวจตารางการทำงานของพนักงานในสาขา (rechecking roster all staff)'], 3),
  (v_template_id, 28, '28', 'ตรวจเอกสาร Claim เงินต่างๆของบัญชี รวมถึงการเบิกต่างๆของสาขาก่อนส่ง และลงชื่อรับทราบ', 'Check claim documents — including withdrawals before sending and signing for acknowledgment.', '{}', 2),
  (v_template_id, 29, '29', 'อุณหภูมิในร้านได้มาตรฐาน (ไม่เกิน 26°C สำหรับ SHOP — Kiosk ใช้แอร์ส่วนกลางของศูนย์)', 'Is the AC on? Temperature comfortable (not more than 26°C standard)?',
    ARRAY['เครื่องเล่น DVD / TV / แผ่น DVD ใช้งานได้ปกติ เปิดเพลงที่เหมาะสมในระดับเสียงที่เหมาะสม ตามที่ MKT แจ้ง'], 2),
  (v_template_id, 30, '30', 'พนักงานแต่งกายด้วยชุด Uniform ของบริษัทที่กำหนดเท่านั้น', 'Staff well-dressed in uniform of the company.',
    ARRAY['*** AREA MANAGER ต้องส่งรายงานนี้ทุกวันไม่เกิน 19:00 น *** วันเสาร์-อาทิตย์-วันนักขัตฤกษ์ จะไม่ตรวจร้าน'], 3);

  RAISE NOTICE 'Anker template seeded with id %', v_template_id;
END $$;

-- ════════════════════════════════════════════════════════════════════
-- Helper function — recalculate evaluation score
-- ════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION recalc_branch_evaluation_score(p_eval_id UUID)
RETURNS VOID AS $$
DECLARE
  v_total_weight NUMERIC := 0;
  v_total_score NUMERIC := 0;
  v_pct NUMERIC := 0;
BEGIN
  SELECT
    COALESCE(SUM(i.weight), 0),
    COALESCE(SUM(a.earned_weight), 0)
  INTO v_total_weight, v_total_score
  FROM branch_eval_template_items i
  JOIN branch_evaluations e ON e.template_id = i.template_id
  LEFT JOIN branch_evaluation_answers a ON a.evaluation_id = e.id AND a.item_id = i.id
  WHERE e.id = p_eval_id;

  v_pct := CASE WHEN v_total_weight > 0 THEN ROUND((v_total_score / v_total_weight) * 10000) / 100 ELSE 0 END;

  UPDATE branch_evaluations
  SET total_weight = v_total_weight,
      total_score  = v_total_score,
      percentage   = v_pct,
      updated_at   = now()
  WHERE id = p_eval_id;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
