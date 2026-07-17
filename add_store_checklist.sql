-- ════════════════════════════════════════════════════════════════════
-- เช็คลิสต์ร้านค้า / Dealer (ฟีเจอร์ย่อยใน "ประเมินสาขา")
--   เก็บข้อมูลการเข้าเยี่ยมร้าน: header + หัวข้อ + Stock/Order + Competitor
--   + POSM (checkbox) + สรุป + รูปแนบ + GPS  → เลือก template ได้
--   สิทธิ์ใช้ร่วมกับ branch_eval_permissions (isEvalAdmin / evaluator)
-- ════════════════════════════════════════════════════════════════════

-- ── 1) ทะเบียนร้าน Dealer ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_dealers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID REFERENCES companies(id) ON DELETE SET NULL,   -- บริษัทเจ้าของ (ไว้ scope)
  code          TEXT,                       -- รหัสร้าน (ถ้ามี)
  name          TEXT NOT NULL,              -- ชื่อร้าน
  store_type    TEXT,                       -- ประเภทร้าน
  zone          TEXT,                       -- เขต
  area          TEXT,                       -- พื้นที่
  is_new        BOOLEAN NOT NULL DEFAULT false,  -- ร้านใหม่ (false = ร้านเก่า)
  contact_name  TEXT,                       -- ผู้ติดต่อ
  contact_phone TEXT,                       -- เบอร์โทร
  address       TEXT,
  lat           DOUBLE PRECISION,           -- พิกัดร้าน (ตั้งต้น)
  lng           DOUBLE PRECISION,
  notes         TEXT,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dealer_company ON store_dealers(company_id);
CREATE INDEX IF NOT EXISTS idx_dealer_active  ON store_dealers(active);

-- ── 2) Template เช็คลิสต์ (โครงเก็บเป็น JSON) ───────────────────────
CREATE TABLE IF NOT EXISTS store_checklist_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  config      JSONB NOT NULL DEFAULT '{"sections":[]}'::jsonb,   -- โครง section/ช่อง
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INT NOT NULL DEFAULT 0,
  created_by  UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 3) มอบหมาย (ส่งถึงใครให้ไปเช็คร้านไหน ด้วย template ไหน) ────────
CREATE TABLE IF NOT EXISTS store_checklist_assignments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES store_checklist_templates(id) ON DELETE SET NULL,
  dealer_id   UUID REFERENCES store_dealers(id) ON DELETE CASCADE,  -- NULL = ร้านไหนก็ได้
  assignee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID,
  due_date    DATE,
  note        TEXT,
  status      TEXT NOT NULL DEFAULT 'open',   -- open | done | cancelled
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sc_assign_assignee ON store_checklist_assignments(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_sc_assign_dealer   ON store_checklist_assignments(dealer_id);

-- ── 4) บันทึกเช็คลิสต์ 1 ครั้งเข้าเยี่ยม ────────────────────────────
CREATE TABLE IF NOT EXISTS store_checklist_submissions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id    UUID REFERENCES store_checklist_templates(id) ON DELETE SET NULL,
  dealer_id      UUID REFERENCES store_dealers(id) ON DELETE SET NULL,
  assignment_id  UUID REFERENCES store_checklist_assignments(id) ON DELETE SET NULL,
  company_id     UUID REFERENCES companies(id) ON DELETE SET NULL,
  submitted_by   UUID REFERENCES employees(id) ON DELETE SET NULL,
  -- snapshot ชื่อร้าน/ผู้ตรวจ ณ ตอนบันทึก (กันข้อมูลเปลี่ยนภายหลัง)
  dealer_name    TEXT,
  submitter_name TEXT,
  visit_date     DATE NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Bangkok')::date,
  data           JSONB NOT NULL DEFAULT '{}'::jsonb,   -- คำตอบตาม config (topics/stock/competitor/posm/summary/...)
  photos         JSONB NOT NULL DEFAULT '[]'::jsonb,    -- [{url, storage_path, caption}]
  lat            DOUBLE PRECISION,
  lng            DOUBLE PRECISION,
  location_name  TEXT,
  status         TEXT NOT NULL DEFAULT 'submitted',     -- draft | submitted
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sc_sub_dealer   ON store_checklist_submissions(dealer_id);
CREATE INDEX IF NOT EXISTS idx_sc_sub_by       ON store_checklist_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_sc_sub_date     ON store_checklist_submissions(visit_date);
CREATE INDEX IF NOT EXISTS idx_sc_sub_company  ON store_checklist_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_sc_sub_template ON store_checklist_submissions(template_id);

-- ── RLS (อ่าน/เขียนผ่าน service role ใน API เท่านั้น) ──────────────
ALTER TABLE store_dealers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_checklist_templates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_checklist_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_checklist_submissions ENABLE ROW LEVEL SECURITY;

-- ── Seed 2 template ตามไฟล์ (ร้านค้า / Dealer) — โครงเดียวกัน แก้ทีหลังได้ ──
INSERT INTO store_checklist_templates (name, description, sort_order, config)
SELECT * FROM (VALUES
  ('เช็คลิสต์ร้านค้า', 'ฟอร์มเข้าเยี่ยมร้านค้าทั่วไป', 1,
   '{"sections":[
      {"key":"header","type":"fields","title":"ข้อมูลการเข้าเยี่ยม","fields":[
        {"key":"visit_no","label":"เข้าครั้งที่","type":"number"},
        {"key":"installs_per_month","label":"ลูกค้าเอากล้อง 70mai/DDPAI มาให้ติดตั้ง/เดือน (ชุด)","type":"number"}
      ]},
      {"key":"topics","type":"textlist","title":"หัวข้อ","count":5},
      {"key":"stock","type":"table","title":"Stock / Order","columns":[
        {"key":"stock_model","label":"รุ่น (Stock)"},
        {"key":"stock_qty","label":"จำนวน","type":"number"},
        {"key":"order_model","label":"รุ่น (Order)"},
        {"key":"order_price","label":"ราคา","type":"number"},
        {"key":"order_qty","label":"จำนวน","type":"number"},
        {"key":"promo","label":"โปรโมชั่น"}
      ]},
      {"key":"competitor","type":"table","title":"Competitor (คู่แข่ง)","columns":[
        {"key":"brand","label":"Brand"},
        {"key":"model","label":"รุ่น"},
        {"key":"retail","label":"ราคาปลีก","type":"number"},
        {"key":"wholesale","label":"ราคาส่ง","type":"number"},
        {"key":"gp","label":"GP%","type":"number"},
        {"key":"terms","label":"เงื่อนไขซื้อ/ขาย"},
        {"key":"sales_month","label":"ยอดขาย/เดือน"},
        {"key":"model_70mai","label":"70mai/DDPAI (รุ่น)"}
      ]},
      {"key":"posm","type":"checkboxes","title":"POSM","allowOther":true,"options":[
        "Catalog","Leaflet","Poster","POP UP","ป้ายไวนิล","ธงชายหาด","ป้ายตู้ไฟ",
        "Mockup","แท่นโชว์","Tent card","Standee","X-stand","Roll up","Sticker"
      ]},
      {"key":"summary","type":"textarea","title":"สรุป / ปัญหา / ของเสีย / อื่นๆ"}
    ]}'::jsonb
  ),
  ('เช็คลิสต์ Dealer', 'ฟอร์มเข้าเยี่ยม Dealer', 2,
   '{"sections":[
      {"key":"header","type":"fields","title":"ข้อมูลการเข้าเยี่ยม","fields":[
        {"key":"visit_no","label":"เข้าครั้งที่","type":"number"},
        {"key":"installs_per_month","label":"ลูกค้าเอากล้อง 70mai/DDPAI มาให้ติดตั้ง/เดือน (ชุด)","type":"number"}
      ]},
      {"key":"topics","type":"textlist","title":"หัวข้อ","count":5},
      {"key":"stock","type":"table","title":"Stock / Order","columns":[
        {"key":"stock_model","label":"รุ่น (Stock)"},
        {"key":"stock_qty","label":"จำนวน","type":"number"},
        {"key":"order_model","label":"รุ่น (Order)"},
        {"key":"order_price","label":"ราคา","type":"number"},
        {"key":"order_qty","label":"จำนวน","type":"number"},
        {"key":"promo","label":"โปรโมชั่น"}
      ]},
      {"key":"competitor","type":"table","title":"Competitor (คู่แข่ง)","columns":[
        {"key":"brand","label":"Brand"},
        {"key":"model","label":"รุ่น"},
        {"key":"retail","label":"ราคาปลีก","type":"number"},
        {"key":"wholesale","label":"ราคาส่ง","type":"number"},
        {"key":"gp","label":"GP%","type":"number"},
        {"key":"terms","label":"เงื่อนไขซื้อ/ขาย"},
        {"key":"sales_month","label":"ยอดขาย/เดือน"},
        {"key":"model_70mai","label":"70mai/DDPAI (รุ่น)"}
      ]},
      {"key":"posm","type":"checkboxes","title":"POSM","allowOther":true,"options":[
        "Catalog","Leaflet","Poster","POP UP","ป้ายไวนิล","ธงชายหาด","ป้ายตู้ไฟ",
        "Mockup","แท่นโชว์","Tent card","Standee","X-stand","Roll up","Sticker"
      ]},
      {"key":"summary","type":"textarea","title":"สรุป / ปัญหา / ของเสีย / อื่นๆ"}
    ]}'::jsonb
  )
) AS v(name, description, sort_order, config)
WHERE NOT EXISTS (SELECT 1 FROM store_checklist_templates);

NOTIFY pgrst, 'reload schema';
