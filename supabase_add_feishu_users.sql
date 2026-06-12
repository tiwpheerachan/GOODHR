-- ════════════════════════════════════════════════════════════════════
-- Feishu Users — เก็บข้อมูลพนักงานจาก Feishu Contacts + mapping → GoodHR
--
-- หลักการ:
--   1. feishu_user_id เป็น primary anchor (ไม่เปลี่ยนตลอดอายุการใช้งาน)
--   2. auto-match ครั้งแรกใช้ email/nickname/name
--   3. หลัง match แล้ว → ทุก sync ครั้งต่อๆ ไปใช้ feishu_user_id อย่างเดียว
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feishu_users (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ─── PRIMARY ANCHOR (Feishu side) ───
  feishu_user_id        text UNIQUE NOT NULL,        -- Feishu internal ID เช่น "e616f6g9"
  feishu_user_id_modified text,                       -- User ID (Revised) ถ้ามี

  -- ─── identity ───
  name                  text NOT NULL,               -- raw "陈安琪|CN-陈安琪"
  name_cn               text,                        -- "陈安琪"
  name_en               text,                        -- "Clara"
  name_jp               text,
  nickname              text,                        -- "Clara"
  english_name_custom   text,                        -- custom field "英文名"

  -- ─── employee info ───
  employee_number       text,                        -- "SHD201" (Feishu format)
  email                 text,                        -- contact email
  email_work            text,                        -- work email
  email_business        text,                        -- business email
  phone                 text,                        -- "+8613580261303"
  department_path       text,                        -- "SHD/Brazil/Project 1"
  job_title             text,                        -- "营销推广专员"
  workforce_type        text,                        -- "Regular" / "Intern"
  start_date            date,                        -- "2024-09-09"
  gender                text,                        -- "Male" / "Female"
  city                  text,
  status                text,                        -- "Active" / "Inactive"
  brand                 text,                        -- 负责品牌
  mentor                text,                        -- 导师
  direct_manager_raw    text,                        -- raw direct manager value

  -- ─── GoodHR mapping ───
  goodhr_employee_id    uuid REFERENCES employees(id) ON DELETE SET NULL,
  match_method          text,                        -- 'manual' | 'email' | 'nickname' | 'code' | 'name_en'
  match_confidence      int CHECK (match_confidence BETWEEN 0 AND 100),
  matched_at            timestamptz,
  manually_verified     boolean DEFAULT false,       -- admin ยืนยันแล้ว (ไม่ override จาก auto-match)
  match_note            text,                        -- หมายเหตุการจับคู่

  -- ─── sync metadata ───
  imported_at           timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  last_imported_batch   text,                        -- batch id ของการ import ล่าสุด
  raw_payload           jsonb,                       -- เก็บ row จาก Excel ทั้ง row (debug)

  CONSTRAINT feishu_users_email_lower CHECK (email = lower(email) OR email IS NULL),
  CONSTRAINT feishu_users_workemail_lower CHECK (email_work = lower(email_work) OR email_work IS NULL),
  CONSTRAINT feishu_users_bizemail_lower CHECK (email_business = lower(email_business) OR email_business IS NULL)
);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_feishu_users_emp_num    ON feishu_users(employee_number) WHERE employee_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_email       ON feishu_users(email)            WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_email_work  ON feishu_users(email_work)       WHERE email_work IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_email_biz   ON feishu_users(email_business)   WHERE email_business IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_nickname    ON feishu_users(LOWER(nickname))  WHERE nickname IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_goodhr      ON feishu_users(goodhr_employee_id) WHERE goodhr_employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_unmatched   ON feishu_users(status) WHERE goodhr_employee_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_feishu_users_status      ON feishu_users(status);

-- ─── เพิ่ม feishu_user_id ใน employees (สำหรับ reverse lookup เร็ว) ───
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS feishu_user_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_employees_feishu_user_id ON employees(feishu_user_id) WHERE feishu_user_id IS NOT NULL;

-- ─── Trigger: update employees.feishu_user_id เมื่อมี mapping ใหม่ ───
CREATE OR REPLACE FUNCTION sync_feishu_user_id_to_employees()
RETURNS TRIGGER AS $$
BEGIN
  -- ตอน insert/update mapping → set employees.feishu_user_id
  IF NEW.goodhr_employee_id IS NOT NULL THEN
    -- เคลียร์ feishu_user_id เก่าก่อน (ถ้าคนใน goodhr คนนี้ผูกกับ Feishu คนอื่นมาก่อน)
    UPDATE employees SET feishu_user_id = NULL
      WHERE feishu_user_id = NEW.feishu_user_id AND id <> NEW.goodhr_employee_id;
    -- เซ็ตใหม่
    UPDATE employees SET feishu_user_id = NEW.feishu_user_id
      WHERE id = NEW.goodhr_employee_id;
  END IF;
  -- ตอน unmap (goodhr_employee_id เปลี่ยนจาก non-null เป็น null) → clear employees.feishu_user_id
  IF TG_OP = 'UPDATE' AND OLD.goodhr_employee_id IS NOT NULL AND NEW.goodhr_employee_id IS NULL THEN
    UPDATE employees SET feishu_user_id = NULL
      WHERE id = OLD.goodhr_employee_id AND feishu_user_id = OLD.feishu_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_feishu_to_employees ON feishu_users;
CREATE TRIGGER trg_sync_feishu_to_employees
  AFTER INSERT OR UPDATE OF goodhr_employee_id ON feishu_users
  FOR EACH ROW EXECUTE FUNCTION sync_feishu_user_id_to_employees();

-- ─── updated_at auto ───
CREATE OR REPLACE FUNCTION feishu_users_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feishu_users_updated_at ON feishu_users;
CREATE TRIGGER trg_feishu_users_updated_at
  BEFORE UPDATE ON feishu_users
  FOR EACH ROW EXECUTE FUNCTION feishu_users_set_updated_at();

-- ─── RLS: เฉพาะ admin ───
ALTER TABLE feishu_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feishu_users_admin_all ON feishu_users;
CREATE POLICY feishu_users_admin_all ON feishu_users
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('super_admin','hr_admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid()
      AND users.role IN ('super_admin','hr_admin'))
  );
