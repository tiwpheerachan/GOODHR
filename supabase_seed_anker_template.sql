-- ════════════════════════════════════════════════════════════════════
-- Seed: Anker Store Visit Checklist (template เดี่ยว — รันซ้ำได้)
-- ────────────────────────────────────────────────────────────────────
-- ใช้ตอน:
--   • schema branch_eval ติดตั้งแล้ว (supabase_branch_eval.sql) แต่ยังไม่มี Anker template
--   • หรืออยากอัปเดต / เติมข้อที่หายไป (idempotent — ไม่ซ้ำซ้อน)
--
-- ที่มา: '/Users/tiw/Downloads/SOP visit shop anker - Sheet1.csv'
-- รวม 30 ข้อ · weight 100
-- ════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_template_id UUID;
  v_company_id  UUID := NULL;
  v_existing    INT;
BEGIN
  -- ── หา / สร้าง template ──
  SELECT id INTO v_template_id
  FROM branch_eval_templates
  WHERE name = 'Anker Store Visit Checklist'
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_template_id IS NULL THEN
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

    RAISE NOTICE 'Created template: %', v_template_id;
  ELSE
    RAISE NOTICE 'Template exists: %', v_template_id;
  END IF;

  -- ── upsert 30 ข้อ (key = template_id + order_no) ──
  WITH src(order_no, code, question_th, question_en, sub_notes, weight) AS (VALUES
    (1, '1', 'ความสมบูรณ์ของป้าย โลโก้ Anker และหลอดไฟหน้าร้าน',
        'Completeness of Logo "Anker" and spotlight in front of shop.',
        ARRAY[]::TEXT[], 3::NUMERIC),
    (2, '2', 'การจัดเรียงสินค้าบนผนัง แยกประเภทอย่างชัดเจน ไม่จัดเรียงรวมกัน Power Bank, Soundcore, Cable, Charger, MPP, eufy',
        'Display products on wall — must be separated by type such as Power Bank, Soundcore, Cable, Charger, MPP, eufy',
        ARRAY[]::TEXT[], 5),
    (3, '3', 'มีการจัดเรียงสินค้าที่ gondola และสินค้าบน Area วางสินค้าตรงมาตรฐาน',
        'The products on the gondola and display area are arranged according to merchandising standards.',
        ARRAY['การจัดเรียงสินค้าบนผนัง วางตำแหน่ง / จำนวน SKU / ใช้ตามคู่มือได้อย่างถูกต้อง',
              'Products on wall arranged correctly in terms of positioning, number of SKUs, and compliance with the merchandising guideline.'], 3),
    (4, '4', 'การใช้ป้าย ถูกตามประเภทของกลุ่มสินค้า New, Best Seller — เช็คป้ายราคา',
        'Signage used correctly according to product categories (New, Best Seller) — price tags properly checked.',
        ARRAY['การวางป้าย promotion ขนาด A5 / A4 ในตำแหน่งที่ถูกต้อง',
              'Present promotion price sign A5/A4 in the correct position'], 3),
    (5, '5', 'การจัดโต๊ะ Display ในพื้นที่ขายต้องโชว์สินค้า ตรง concept ของ Brand',
        'Show products which match with concept of brand at displayed table.',
        ARRAY[]::TEXT[], 5),
    (6, '6', 'Graphic บริเวณพื้นที่ขายมีการ Update ตามรุ่นของสินค้า',
        'Update Graphic at sale area to match the model of products.',
        ARRAY[]::TEXT[], 2),
    (7, '7', 'Graphic ภายในร้าน รวมถึงอุปกรณ์ต่างๆ เช่น แผ่นอะคริลิค มีสภาพสมบูรณ์ ไม่หลุด หรือ ชำรุด',
        'The graphics and equipment inside the store, including acrylic displays, are in good condition without any damage, looseness, or defects.',
        ARRAY['Hook, Hanger และ Fixture มีสภาพพร้อมใช้งาน',
              'ความสะอาดภายนอกและภายในร้าน รวมถึงเช็คทำความสะอาดทุกวัน',
              'จัดเก็บอุปกรณ์สินค้าตัวอย่างให้เป็นระเบียบ เรียบร้อย และสายงามตรงตาม Concept Brand'], 3),
    (8, '8', 'การเติมสินค้าจากคลังพร้อมจำหน่ายเพียงพอสำหรับความต้องการของลูกค้า',
        'Products are replenished from the stockroom and sufficiently available to meet customer demand.',
        ARRAY[]::TEXT[], 3),
    (9, '9', 'แนวทางแก้ไข หรือ Action plan เกี่ยวกับยอดขาย หรือ เรื่องต่างๆ สาขาได้มีเตรียมงานไว้หรือไม่',
        'Solution or Action plan about sales or various matters — the branch has prepared work or not.',
        ARRAY['การแก้ปัญหาเฉพาะหน้าของหัวหน้าร้าน / พนักงานขาย มีการเตรียมงานให้พร้อมตลอดเวลา'], 3),
    (10, '10', 'การรักษา Standard ของแบรนด์ให้เป็นไปอย่างเคร่งครัด เป็นแบบอย่างที่ดีอย่างมีประสิทธิภาพ',
        'Maintaining brand standards — store performance role model.',
        ARRAY['Target / Sell / Forecast',
              'Stock on hands vs Stock Capacity (5× ยอดขาย)',
              'Promotion + feedback',
              'Competitor promotion',
              'Need Support',
              'Manpower (full / vacant / part time / weekend)',
              'Follow up · Action Plan · Teamwork · Atmosphere'], 8),
    (11, '11', 'พนักงานมีความกระตือรือร้นในการขาย สุภาพอ่อนน้อมกับลูกค้า · Service step',
        'Staff are enthusiastic to sell and polite with customers · Service step',
        ARRAY['มีการทักทาย "Anker สวัสดีค่ะ / ครับ"',
              'พนักงานสอบถามเรื่อง VIP Card เพื่อสะสม / สมัคร'], 5),
    (12, '12', 'พนักงานมีการแจ้งสินค้าโปรโมชั่นประจำเดือนของร้าน',
        'Staff inform monthly promotion for shop.',
        ARRAY[]::TEXT[], 3),
    (13, '13', 'ตรวจสอบสต็อกสินค้าขายดีและสินค้า Demo ให้เพียงพอตามแผนการจัดวางของฝ่ายการตลาด รวมถึงสินค้าที่ร่วมโปรโมชั่น',
        'Check and ensure sufficient stock of best-selling and demo products in accordance with the marketing display plan.',
        ARRAY[]::TEXT[], 2),
    (14, '14', 'พนักงานมีความรู้เรื่องสินค้าในแต่ละรุ่น — สุ่มถาม 3-5 รายการเพื่อทดสอบความรู้',
        'Staff should have knowledge of each product model — randomly ask 3–5 products to test product knowledge.',
        ARRAY[]::TEXT[], 5),
    (15, '15', 'การจัดเก็บสินค้า Stock หน้าร้านมีความเป็นระเบียบตามมาตรฐานของบริษัท ง่ายต่อการบริการลูกค้า',
        'Front-store stock arrangement is organized according to company standards.',
        ARRAY[]::TEXT[], 5),
    (16, '16', 'การรับสินค้า — สาขาได้ตรวจนับครบตามจำนวนหรือไม่? มีการแจ้งปัญหาและตามงานจนจบขั้นตอนหรือยัง?',
        'Has the branch completely checked and verified the quantity of received products? If issues, have they been reported and followed up?',
        ARRAY['ตรวจสอบขั้นตอนการรับโอนเข้าสินค้าจากคลังในระบบว่ามีเอกสารค้างหรือไม่',
              'เช็ค stock negative เพื่อไม่ให้เกิดสินค้าในระบบไม่ตรงกับสินค้าจริงหน้าร้าน'], 3),
    (17, '17', 'ในแต่ละวันสาขาได้ทำการตรวจเช็คโดยการสุ่มสต็อกสินค้าในร้านวันละ 5-10 รุ่นหรือสินค้าที่ปัญหาในการส่งจากคลังหรือไม่',
        'Does the branch conduct daily stock checks by randomly checking 5–10 product models?',
        ARRAY[]::TEXT[], 2),
    (18, '18', 'พนักงานมีการตรวจ SN ในระบบที่ยังไม่ทำรับในระบบ หรือมี SN มาแล้วแต่ไม่มีสินค้าส่งมาที่สาขาหรือไม่',
        'Do staff check for SNs in the system that have not yet been received, or SNs that appear but products have not arrived?',
        ARRAY['ปัญหาการส่งสินค้าของ WH (transport problem)'], 5),
    (19, '19', 'ไฟภายในร้านสว่างครบทุกดวง รวมถึงไฟ lightbox / ไฟเคาน์เตอร์แคชเชียร์',
        'Lighting — all lamps are working (incl. lightbox / cashier counter).',
        ARRAY[]::TEXT[], 3),
    (20, '20', 'การจัดเก็บเอกสาร อุปกรณ์ต่างๆ งานของ marketing / Graphics จัดเก็บเป็นระเบียบในที่ที่กำหนด',
        'Keep all documents in fixed filing (U=Update, M=Standard) — Marketing equipment / Graphics tidy in assigned place.',
        ARRAY[]::TEXT[], 2),
    (21, '21', 'เคลียร์เอกสารต่างๆที่เกี่ยวกับยอดขายและเคลียร์จบภายในวันหรือไม่ — สลิปการขายและรายละเอียดถูกต้องตามข้อกำหนดของฝ่าย admin',
        'Are sales documents completed/cleared within the same day? Correctly prepared for admin submission?',
        ARRAY[]::TEXT[], 3),
    (22, '22', 'ไม่เก็บสิ่งของส่วนตัว ที่ไม่เกี่ยวข้องกับการขายไว้ที่ Fixture หรือ บริเวณพื้นที่ขาย',
        'Do not keep personal things (unrelated to selling) at fixtures or sales area.',
        ARRAY[]::TEXT[], 2),
    (23, '23', 'ถุงใส่สินค้าและเอกสารแบบพิมพ์ทางการเงิน จัดเก็บในที่ที่กำหนด ห้ามใช้ถุงของแบรนด์อื่น',
        'Shopping bag and monetary documents kept in the assigned place — do not use other brands.',
        ARRAY[]::TEXT[], 2),
    (24, '24', 'ที่จุด Cashier จะต้องไม่มีลูกค้ารอชำระเงินเกิน 2 คิว และรอเกิน 3 นาทีต่อคน',
        'At Cashier — should not have customers waiting more than 2 queue and not more than 3 minutes per person.',
        ARRAY[]::TEXT[], 3),
    (25, '25', 'ตรวจนับ Cash Float, Chat Shop / Counting the money in the safe',
        'Counting cash float / money in safe',
        ARRAY['ตรวจ Cash Float ที่สาขาต้องตรวจนับและลงบันทึกทุกวันก่อนเริ่มงาน',
              'ตรวจการโอนเงินเข้าบริษัทและการเมล์ส่งบัญชี'], 5),
    (26, '26', 'ตรวจรายงานการขายว่ามีเอกสารบัญชีในการ Payslip Bank ตกค้างส่งบัญชีหรือไม่',
        'Check sales report to ensure no pending bank payslips awaiting accounting submission.',
        ARRAY[]::TEXT[], 2),
    (27, '27', 'สาขามี Morning meeting ก่อนเริ่มงานทุกวัน และตรวจเช็คบอร์ดประจำร้าน',
        'Branch has morning meeting before starting work every day and recheck chart board.',
        ARRAY['ตรวจตารางการทำงานของพนักงานในสาขา (rechecking roster all staff)'], 3),
    (28, '28', 'ตรวจเอกสาร Claim เงินต่างๆของบัญชี รวมถึงการเบิกต่างๆของสาขาก่อนส่ง และลงชื่อรับทราบ',
        'Check claim documents — including withdrawals before sending and signing for acknowledgment.',
        ARRAY[]::TEXT[], 2),
    (29, '29', 'อุณหภูมิในร้านได้มาตรฐาน (ไม่เกิน 26°C สำหรับ SHOP — Kiosk ใช้แอร์ส่วนกลางของศูนย์)',
        'Is the AC on? Temperature comfortable (not more than 26°C standard)?',
        ARRAY['เครื่องเล่น DVD / TV / แผ่น DVD ใช้งานได้ปกติ เปิดเพลงที่เหมาะสมในระดับเสียงที่เหมาะสม ตามที่ MKT แจ้ง'], 2),
    (30, '30', 'พนักงานแต่งกายด้วยชุด Uniform ของบริษัทที่กำหนดเท่านั้น',
        'Staff well-dressed in uniform of the company.',
        ARRAY['*** AREA MANAGER ต้องส่งรายงานนี้ทุกวันไม่เกิน 19:00 น *** วันเสาร์-อาทิตย์-วันนักขัตฤกษ์ จะไม่ตรวจร้าน'], 3)
  ),
  upserted AS (
    INSERT INTO branch_eval_template_items
      (template_id, order_no, code, question_th, question_en, sub_notes, weight, answer_type)
    SELECT v_template_id, order_no, code, question_th, question_en, sub_notes, weight, 'yes_no'
    FROM src
    ON CONFLICT DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_existing FROM upserted;

  -- ── เติมข้อที่ "ขาด" เท่านั้น (เผื่อมี seed บางส่วนมาก่อน) ──
  --  (ON CONFLICT ใช้กับ unique constraint — ตาราง items ไม่มี unique
  --   ดังนั้นทำ manual: ลบ items ของ template นี้ก่อน แล้ว insert ใหม่ทั้งหมด)
  --  พลิกเป็น replace ปลอดภัย: ถ้าเพิ่งสร้าง template (ว่าง) → insert ทั้งหมด
  --                              ถ้ามี items อยู่บางส่วน → ข้าม (ไม่ทำลาย answers)

  IF v_existing = 0 THEN
    -- template มี items อยู่แล้ว — เช็คว่าครบ 30 หรือไม่
    SELECT count(*) INTO v_existing FROM branch_eval_template_items WHERE template_id = v_template_id;

    IF v_existing < 30 THEN
      RAISE NOTICE 'Template มี % ข้อ (ต้องการ 30) — เติมข้อที่ขาดด้วย order_no', v_existing;

      WITH src(order_no, code, question_th, question_en, sub_notes, weight) AS (VALUES
        (1, '1', 'ความสมบูรณ์ของป้าย โลโก้ Anker และหลอดไฟหน้าร้าน', 'Completeness of Logo "Anker" and spotlight in front of shop.', ARRAY[]::TEXT[], 3::NUMERIC),
        (2, '2', 'การจัดเรียงสินค้าบนผนัง แยกประเภทอย่างชัดเจน ไม่จัดเรียงรวมกัน Power Bank, Soundcore, Cable, Charger, MPP, eufy', 'Display products on wall — must be separated by type such as Power Bank, Soundcore, Cable, Charger, MPP, eufy', ARRAY[]::TEXT[], 5),
        (3, '3', 'มีการจัดเรียงสินค้าที่ gondola และสินค้าบน Area วางสินค้าตรงมาตรฐาน', 'The products on the gondola and display area are arranged according to merchandising standards.', ARRAY['การจัดเรียงสินค้าบนผนัง วางตำแหน่ง / จำนวน SKU / ใช้ตามคู่มือได้อย่างถูกต้อง'], 3),
        (4, '4', 'การใช้ป้าย ถูกตามประเภทของกลุ่มสินค้า New, Best Seller — เช็คป้ายราคา', 'Signage used correctly according to product categories (New, Best Seller) — price tags properly checked.', ARRAY['การวางป้าย promotion ขนาด A5 / A4 ในตำแหน่งที่ถูกต้อง'], 3),
        (5, '5', 'การจัดโต๊ะ Display ในพื้นที่ขายต้องโชว์สินค้า ตรง concept ของ Brand', 'Show products which match with concept of brand at displayed table.', ARRAY[]::TEXT[], 5),
        (6, '6', 'Graphic บริเวณพื้นที่ขายมีการ Update ตามรุ่นของสินค้า', 'Update Graphic at sale area to match the model of products.', ARRAY[]::TEXT[], 2),
        (7, '7', 'Graphic ภายในร้าน รวมถึงอุปกรณ์ต่างๆ เช่น แผ่นอะคริลิค มีสภาพสมบูรณ์ ไม่หลุด หรือ ชำรุด', 'The graphics and equipment inside the store, including acrylic displays, are in good condition.', ARRAY['Hook, Hanger และ Fixture มีสภาพพร้อมใช้งาน','ความสะอาดภายนอกและภายในร้าน รวมถึงเช็คทำความสะอาดทุกวัน','จัดเก็บอุปกรณ์สินค้าตัวอย่างให้เป็นระเบียบ เรียบร้อย และสายงามตรงตาม Concept Brand'], 3),
        (8, '8', 'การเติมสินค้าจากคลังพร้อมจำหน่ายเพียงพอสำหรับความต้องการของลูกค้า', 'Products are replenished from the stockroom.', ARRAY[]::TEXT[], 3),
        (9, '9', 'แนวทางแก้ไข หรือ Action plan เกี่ยวกับยอดขาย หรือ เรื่องต่างๆ สาขาได้มีเตรียมงานไว้หรือไม่', 'Solution or Action plan about sales or various matters.', ARRAY['การแก้ปัญหาเฉพาะหน้าของหัวหน้าร้าน / พนักงานขาย'], 3),
        (10, '10', 'การรักษา Standard ของแบรนด์ให้เป็นไปอย่างเคร่งครัด เป็นแบบอย่างที่ดีอย่างมีประสิทธิภาพ', 'Maintaining brand standards — store performance role model.', ARRAY['Target / Sell / Forecast','Stock on hands vs Stock Capacity (5× ยอดขาย)','Promotion + feedback','Competitor promotion','Need Support','Manpower (full / vacant / part time / weekend)','Follow up · Action Plan · Teamwork · Atmosphere'], 8),
        (11, '11', 'พนักงานมีความกระตือรือร้นในการขาย สุภาพอ่อนน้อมกับลูกค้า · Service step', 'Staff are enthusiastic to sell and polite with customers · Service step', ARRAY['มีการทักทาย "Anker สวัสดีค่ะ / ครับ"','พนักงานสอบถามเรื่อง VIP Card'], 5),
        (12, '12', 'พนักงานมีการแจ้งสินค้าโปรโมชั่นประจำเดือนของร้าน', 'Staff inform monthly promotion for shop.', ARRAY[]::TEXT[], 3),
        (13, '13', 'ตรวจสอบสต็อกสินค้าขายดีและสินค้า Demo ให้เพียงพอตามแผนการจัดวางของฝ่ายการตลาด', 'Check and ensure sufficient stock of best-selling and demo products.', ARRAY[]::TEXT[], 2),
        (14, '14', 'พนักงานมีความรู้เรื่องสินค้าในแต่ละรุ่น — สุ่มถาม 3-5 รายการเพื่อทดสอบความรู้', 'Staff should have knowledge of each product model.', ARRAY[]::TEXT[], 5),
        (15, '15', 'การจัดเก็บสินค้า Stock หน้าร้านมีความเป็นระเบียบตามมาตรฐานของบริษัท ง่ายต่อการบริการลูกค้า', 'Front-store stock arrangement is organized.', ARRAY[]::TEXT[], 5),
        (16, '16', 'การรับสินค้า — สาขาได้ตรวจนับครบตามจำนวนหรือไม่?', 'Has the branch completely checked received products?', ARRAY['ตรวจสอบขั้นตอนการรับโอนเข้าสินค้าจากคลังในระบบ','เช็ค stock negative'], 3),
        (17, '17', 'ในแต่ละวันสาขาได้ทำการตรวจเช็คโดยการสุ่มสต็อกสินค้าในร้านวันละ 5-10 รุ่น', 'Daily random stock checks.', ARRAY[]::TEXT[], 2),
        (18, '18', 'พนักงานมีการตรวจ SN ในระบบ', 'Staff check for SNs in the system.', ARRAY['ปัญหาการส่งสินค้าของ WH'], 5),
        (19, '19', 'ไฟภายในร้านสว่างครบทุกดวง รวมถึงไฟ lightbox / ไฟเคาน์เตอร์แคชเชียร์', 'All lamps working.', ARRAY[]::TEXT[], 3),
        (20, '20', 'การจัดเก็บเอกสาร อุปกรณ์ต่างๆ งานของ marketing / Graphics', 'Marketing documents tidy.', ARRAY[]::TEXT[], 2),
        (21, '21', 'เคลียร์เอกสารต่างๆที่เกี่ยวกับยอดขายและเคลียร์จบภายในวัน', 'Sales documents cleared within day.', ARRAY[]::TEXT[], 3),
        (22, '22', 'ไม่เก็บสิ่งของส่วนตัวที่ไม่เกี่ยวข้องกับการขายไว้ที่ Fixture', 'No personal things at fixtures.', ARRAY[]::TEXT[], 2),
        (23, '23', 'ถุงใส่สินค้าและเอกสารแบบพิมพ์ทางการเงิน จัดเก็บในที่ที่กำหนด', 'Shopping bag in assigned place.', ARRAY[]::TEXT[], 2),
        (24, '24', 'ที่จุด Cashier ไม่มีลูกค้ารอชำระเงินเกิน 2 คิว และเกิน 3 นาทีต่อคน', 'Cashier wait limits.', ARRAY[]::TEXT[], 3),
        (25, '25', 'ตรวจนับ Cash Float, Chat Shop', 'Cash float counting.', ARRAY['ตรวจ Cash Float ทุกวันก่อนเริ่มงาน','ตรวจการโอนเงินเข้าบริษัท'], 5),
        (26, '26', 'ตรวจรายงานการขายว่ามี Payslip Bank ตกค้างหรือไม่', 'Pending bank payslips check.', ARRAY[]::TEXT[], 2),
        (27, '27', 'สาขามี Morning meeting ก่อนเริ่มงานทุกวัน', 'Morning meeting daily.', ARRAY['rechecking roster all staff'], 3),
        (28, '28', 'ตรวจเอกสาร Claim เงินต่างๆของบัญชี', 'Claim documents check.', ARRAY[]::TEXT[], 2),
        (29, '29', 'อุณหภูมิในร้านได้มาตรฐาน (ไม่เกิน 26°C SHOP)', 'AC temperature standard.', ARRAY['เครื่องเล่น DVD / TV ใช้งานได้ปกติ'], 2),
        (30, '30', 'พนักงานแต่งกายด้วยชุด Uniform ของบริษัทที่กำหนดเท่านั้น', 'Uniform compliance.', ARRAY['*** AREA MANAGER ส่งรายงานก่อน 19:00 น ***'], 3)
      )
      INSERT INTO branch_eval_template_items
        (template_id, order_no, code, question_th, question_en, sub_notes, weight, answer_type)
      SELECT v_template_id, s.order_no, s.code, s.question_th, s.question_en, s.sub_notes, s.weight, 'yes_no'
      FROM src s
      WHERE NOT EXISTS (
        SELECT 1 FROM branch_eval_template_items
        WHERE template_id = v_template_id AND order_no = s.order_no
      );
    END IF;
  ELSE
    RAISE NOTICE 'Inserted % items (template ว่างมาก่อน)', v_existing;
  END IF;

  -- ── คำนวณ total_weight ใหม่ ──
  UPDATE branch_eval_templates
  SET total_weight = (
        SELECT COALESCE(SUM(weight), 0)
        FROM branch_eval_template_items
        WHERE template_id = v_template_id
      ),
      updated_at = now()
  WHERE id = v_template_id;

  RAISE NOTICE 'Done — template %, รวม % คะแนน',
    v_template_id,
    (SELECT total_weight FROM branch_eval_templates WHERE id = v_template_id);
END $$;

NOTIFY pgrst, 'reload schema';
