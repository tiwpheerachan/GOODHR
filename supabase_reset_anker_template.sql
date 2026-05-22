-- ════════════════════════════════════════════════════════════════════
-- RESET: ลบ Anker / SOP visit shop template เก่าทั้งหมด → seed ใหม่ครบ 1 ครั้ง
-- ────────────────────────────────────────────────────────────────────
-- ใช้ตอน: เผลอ run seed ซ้ำจน template ขึ้น 2 อัน
--
-- ⚠️ คำเตือน:
--   • ลบ evaluations (answers + photos + รูปใน storage) ที่ผูกกับ template เหล่านี้ทั้งหมด
--   • ถ้ามีฟอร์มที่ส่งไปแล้วและสำคัญ — ห้ามรันไฟล์นี้
--   • ถ้ายังไม่มีใครเริ่มกรอกฟอร์มจริง — ปลอดภัย
-- ════════════════════════════════════════════════════════════════════

BEGIN;

-- ── 1) ดู template ที่ตรงเงื่อนไข (ก่อนลบ — preview) ──
DO $$
DECLARE
  v_cnt INT;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM branch_eval_templates
  WHERE name ILIKE '%Anker%'
     OR name ILIKE '%SOP%shop%'
     OR name ILIKE '%SOP visit%';
  RAISE NOTICE 'พบ template ที่จะลบ: % อัน', v_cnt;
END $$;

-- ── 2) ลบ photos ที่ผูกกับ evaluations ของ template เหล่านี้ก่อน ──
DELETE FROM branch_evaluation_photos
WHERE evaluation_id IN (
  SELECT e.id FROM branch_evaluations e
  JOIN branch_eval_templates t ON t.id = e.template_id
  WHERE t.name ILIKE '%Anker%'
     OR t.name ILIKE '%SOP%shop%'
     OR t.name ILIKE '%SOP visit%'
);

-- ── 3) ลบ answers ──
DELETE FROM branch_evaluation_answers
WHERE evaluation_id IN (
  SELECT e.id FROM branch_evaluations e
  JOIN branch_eval_templates t ON t.id = e.template_id
  WHERE t.name ILIKE '%Anker%'
     OR t.name ILIKE '%SOP%shop%'
     OR t.name ILIKE '%SOP visit%'
);

-- ── 4) ลบ evaluations ──
DELETE FROM branch_evaluations
WHERE template_id IN (
  SELECT id FROM branch_eval_templates
  WHERE name ILIKE '%Anker%'
     OR name ILIKE '%SOP%shop%'
     OR name ILIKE '%SOP visit%'
);

-- ── 5) ลบ template_items (CASCADE ก็ได้ แต่ explicit เพื่อความชัดเจน) ──
DELETE FROM branch_eval_template_items
WHERE template_id IN (
  SELECT id FROM branch_eval_templates
  WHERE name ILIKE '%Anker%'
     OR name ILIKE '%SOP%shop%'
     OR name ILIKE '%SOP visit%'
);

-- ── 6) ลบ template หลัก ──
DELETE FROM branch_eval_templates
WHERE name ILIKE '%Anker%'
   OR name ILIKE '%SOP%shop%'
   OR name ILIKE '%SOP visit%';

-- ── 7) Seed ใหม่ 30 ข้อ น้ำหนัก 100 (จาก SOP visit shop anker.csv) ──
DO $$
DECLARE
  v_template_id UUID;
  v_company_id  UUID := NULL;
BEGIN
  BEGIN
    EXECUTE 'SELECT id FROM companies LIMIT 1' INTO v_company_id;
  EXCEPTION WHEN OTHERS THEN
    v_company_id := NULL;
  END;

  INSERT INTO branch_eval_templates (name, description, total_weight, company_id)
  VALUES (
    'Anker Store Visit Checklist',
    'STORE CHECK LIST (ANKER) — STORE VISIT REPORT · ตรวจสาขา 30 ข้อ น้ำหนักรวม 100',
    100, v_company_id
  )
  RETURNING id INTO v_template_id;

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
    ARRAY['Target / Sell / Forecast',
          'Stock on hands vs Stock Capacity (5× ยอดขาย)',
          'Promotion + feedback',
          'Competitor promotion',
          'Need Support',
          'Manpower (full / vacant / part time / weekend)',
          'Follow up · Action Plan · Teamwork · Atmosphere'], 8),
  (v_template_id, 11, '11', 'พนักงานมีความกระตือรือร้นในการขาย สุภาพอ่อนน้อมกับลูกค้า · Service step', 'Staff are enthusiastic to sell and polite with customers · Service step',
    ARRAY['มีการทักทาย "Anker สวัสดีค่ะ / ครับ"',
          'พนักงานสอบถามเรื่อง VIP Card เพื่อสะสม / สมัคร'], 5),
  (v_template_id, 12, '12', 'พนักงานมีการแจ้งสินค้าโปรโมชั่นประจำเดือนของร้าน', 'Staff inform monthly promotion for shop.', '{}', 3),
  (v_template_id, 13, '13', 'ตรวจสอบสต็อกสินค้าขายดีและสินค้า Demo ให้เพียงพอตามแผนการจัดวางของฝ่ายการตลาด รวมถึงสินค้าที่ร่วมโปรโมชั่น', 'Check and ensure sufficient stock of best-selling and demo products in accordance with the marketing display plan.', '{}', 2),
  (v_template_id, 14, '14', 'พนักงานมีความรู้เรื่องสินค้าในแต่ละรุ่น — สุ่มถาม 3-5 รายการเพื่อทดสอบความรู้', 'Staff should have knowledge of each product model — randomly ask 3–5 products to test product knowledge.', '{}', 5),
  (v_template_id, 15, '15', 'การจัดเก็บสินค้า Stock หน้าร้านมีความเป็นระเบียบตามมาตรฐานของบริษัท ง่ายต่อการบริการลูกค้า', 'Front-store stock arrangement is organized according to company standards.', '{}', 5),
  (v_template_id, 16, '16', 'การรับสินค้า — สาขาได้ตรวจนับครบตามจำนวนหรือไม่? มีการแจ้งปัญหาและตามงานจนจบขั้นตอนหรือยัง?', 'Has the branch completely checked and verified the quantity of received products?',
    ARRAY['ตรวจสอบขั้นตอนการรับโอนเข้าสินค้าจากคลังในระบบว่ามีเอกสารค้างหรือไม่',
          'เช็ค stock negative เพื่อไม่ให้เกิดสินค้าในระบบไม่ตรงกับสินค้าจริงหน้าร้าน'], 3),
  (v_template_id, 17, '17', 'ในแต่ละวันสาขาได้ทำการตรวจเช็คโดยการสุ่มสต็อกสินค้าในร้านวันละ 5-10 รุ่นหรือสินค้าที่ปัญหาในการส่งจากคลังหรือไม่', 'Daily random stock checks 5–10 product models.', '{}', 2),
  (v_template_id, 18, '18', 'พนักงานมีการตรวจ SN ในระบบที่ยังไม่ทำรับในระบบ หรือมี SN มาแล้วแต่ไม่มีสินค้าส่งมาที่สาขาหรือไม่', 'Do staff check for SNs in the system that have not yet been received?',
    ARRAY['ปัญหาการส่งสินค้าของ WH (transport problem)'], 5),
  (v_template_id, 19, '19', 'ไฟภายในร้านสว่างครบทุกดวง รวมถึงไฟ lightbox / ไฟเคาน์เตอร์แคชเชียร์', 'Lighting — all lamps are working (incl. lightbox / cashier counter).', '{}', 3),
  (v_template_id, 20, '20', 'การจัดเก็บเอกสาร อุปกรณ์ต่างๆ งานของ marketing / Graphics จัดเก็บเป็นระเบียบในที่ที่กำหนด', 'Keep all documents in fixed filing (U=Update, M=Standard).', '{}', 2),
  (v_template_id, 21, '21', 'เคลียร์เอกสารต่างๆที่เกี่ยวกับยอดขายและเคลียร์จบภายในวันหรือไม่ — สลิปการขายและรายละเอียดถูกต้องตามข้อกำหนดของฝ่าย admin', 'Sales documents completed/cleared within the same day?', '{}', 3),
  (v_template_id, 22, '22', 'ไม่เก็บสิ่งของส่วนตัวที่ไม่เกี่ยวข้องกับการขายไว้ที่ Fixture หรือ บริเวณพื้นที่ขาย', 'Do not keep personal things at fixtures or sales area.', '{}', 2),
  (v_template_id, 23, '23', 'ถุงใส่สินค้าและเอกสารแบบพิมพ์ทางการเงิน จัดเก็บในที่ที่กำหนด ห้ามใช้ถุงของแบรนด์อื่น', 'Shopping bag and monetary documents kept in assigned place — do not use other brands.', '{}', 2),
  (v_template_id, 24, '24', 'ที่จุด Cashier จะต้องไม่มีลูกค้ารอชำระเงินเกิน 2 คิว และรอเกิน 3 นาทีต่อคน', 'At Cashier — not more than 2 queue and 3 minutes per person.', '{}', 3),
  (v_template_id, 25, '25', 'ตรวจนับ Cash Float, Chat Shop / Counting the money in the safe', 'Counting cash float / money in safe',
    ARRAY['ตรวจ Cash Float ที่สาขาต้องตรวจนับและลงบันทึกทุกวันก่อนเริ่มงาน',
          'ตรวจการโอนเงินเข้าบริษัทและการเมล์ส่งบัญชี'], 5),
  (v_template_id, 26, '26', 'ตรวจรายงานการขายว่ามีเอกสารบัญชีในการ Payslip Bank ตกค้างส่งบัญชีหรือไม่', 'Check sales report — no pending bank payslips awaiting accounting submission.', '{}', 2),
  (v_template_id, 27, '27', 'สาขามี Morning meeting ก่อนเริ่มงานทุกวัน และตรวจเช็คบอร์ดประจำร้าน', 'Branch has morning meeting before starting work every day.',
    ARRAY['ตรวจตารางการทำงานของพนักงานในสาขา (rechecking roster all staff)'], 3),
  (v_template_id, 28, '28', 'ตรวจเอกสาร Claim เงินต่างๆของบัญชี รวมถึงการเบิกต่างๆของสาขาก่อนส่ง และลงชื่อรับทราบ', 'Check claim documents — including withdrawals before sending and signing.', '{}', 2),
  (v_template_id, 29, '29', 'อุณหภูมิในร้านได้มาตรฐาน (ไม่เกิน 26°C สำหรับ SHOP — Kiosk ใช้แอร์ส่วนกลางของศูนย์)', 'AC temperature standard (not more than 26°C).',
    ARRAY['เครื่องเล่น DVD / TV / แผ่น DVD ใช้งานได้ปกติ เปิดเพลงที่เหมาะสมในระดับเสียงที่เหมาะสม ตามที่ MKT แจ้ง'], 2),
  (v_template_id, 30, '30', 'พนักงานแต่งกายด้วยชุด Uniform ของบริษัทที่กำหนดเท่านั้น', 'Staff well-dressed in uniform of the company.',
    ARRAY['*** AREA MANAGER ต้องส่งรายงานนี้ทุกวันไม่เกิน 19:00 น *** วันเสาร์-อาทิตย์-วันนักขัตฤกษ์ จะไม่ตรวจร้าน'], 3);

  RAISE NOTICE 'สร้าง template ใหม่ id=% พร้อม 30 ข้อ', v_template_id;
END $$;

-- ── 8) ตรวจสอบผลลัพธ์ ──
DO $$
DECLARE
  v_tpl_cnt INT;
  v_item_cnt INT;
  v_weight NUMERIC;
BEGIN
  SELECT count(*) INTO v_tpl_cnt FROM branch_eval_templates WHERE name ILIKE '%Anker%';
  SELECT count(*), COALESCE(SUM(weight), 0) INTO v_item_cnt, v_weight
    FROM branch_eval_template_items i
    JOIN branch_eval_templates t ON t.id = i.template_id
    WHERE t.name ILIKE '%Anker%';
  RAISE NOTICE '✓ Template ที่เหลือ: %, items: %, น้ำหนักรวม: %', v_tpl_cnt, v_item_cnt, v_weight;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
