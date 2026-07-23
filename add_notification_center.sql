-- ═══════════════════════════════════════════════════════════════════
-- Notification Control Center — 3 ตาราง (config / log / สิทธิ์ผู้ส่ง)
-- RLS: service-role เท่านั้น (เข้าผ่าน API admin ที่ guard role แล้ว)
-- re-runnable ได้ (idempotent) — ไม่ทับ custom title/body ของผู้ใช้
-- ═══════════════════════════════════════════════════════════════════

-- 1) config ต่อชนิดแจ้งเตือน
CREATE TABLE IF NOT EXISTS notification_templates (
  key          TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'auto',      -- 'auto' | 'manual'
  audience     TEXT NOT NULL DEFAULT 'employee',  -- 'employee' | 'manager' | 'hr'
  enabled      BOOLEAN NOT NULL DEFAULT true,
  header_color TEXT DEFAULT 'blue',
  title_tmpl   TEXT,
  body_tmpl    TEXT,
  sample_rows  JSONB DEFAULT '[]',                -- ตัวอย่างรายละเอียดในการ์ด [{label,value}]
  sort_order   INT DEFAULT 100,
  updated_at   TIMESTAMPTZ DEFAULT now(),
  updated_by   UUID
);
-- เผื่อสร้างตารางไว้ก่อนแล้ว → เพิ่มคอลัมน์ใหม่
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS audience    TEXT NOT NULL DEFAULT 'employee';
ALTER TABLE notification_templates ADD COLUMN IF NOT EXISTS sample_rows JSONB DEFAULT '[]';

-- 2) log การส่งทุกครั้ง
CREATE TABLE IF NOT EXISTS notification_send_log (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            TIMESTAMPTZ DEFAULT now(),
  type                  TEXT,
  audience              TEXT,
  title                 TEXT,
  body                  TEXT,
  recipient_employee_id UUID,
  recipient_name        TEXT,
  recipient_feishu_id   TEXT,
  sent_by               UUID,
  sent_by_name          TEXT,
  status                TEXT DEFAULT 'sent',
  message_id            TEXT,
  error                 TEXT,
  meta                  JSONB DEFAULT '{}'
);
ALTER TABLE notification_send_log ADD COLUMN IF NOT EXISTS audience TEXT;
CREATE INDEX IF NOT EXISTS idx_notif_log_created ON notification_send_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_log_type    ON notification_send_log(type, created_at DESC);

-- 3) allowlist คนที่กดส่งได้
CREATE TABLE IF NOT EXISTS notification_senders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,
  added_by    UUID,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_notif_sender UNIQUE (employee_id)
);

-- 4) allowlist "ผู้รับ" (rollout gate) — เริ่มส่งให้ใคร/แผนกไหน
--    kind='employee' ref_id=employee_id · kind='department' ref_id=department_id · kind='all' ref_id=null (เปิดทุกคน)
CREATE TABLE IF NOT EXISTS notification_rollout (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind       TEXT NOT NULL,        -- 'employee' | 'department' | 'all'
  ref_id     UUID,
  added_by   UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_notif_rollout ON notification_rollout(kind, COALESCE(ref_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_send_log  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_senders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rollout   ENABLE ROW LEVEL SECURITY;

-- seed — INSERT สำหรับติดตั้งใหม่ · DO UPDATE เฉพาะ audience/sample_rows/name (ไม่ทับ title/body ที่ user แก้)
INSERT INTO notification_templates (key, name, category, audience, header_color, title_tmpl, body_tmpl, sample_rows, sort_order) VALUES
  -- 👤 พนักงาน (ลูกน้อง)
  ('checkin_due', 'เตือนก่อนเข้ากะ 10 นาที', 'auto', 'employee', 'orange',
    '⏰ อีก 10 นาทีถึงเวลาเข้ากะ', 'สวัสดีตอนเช้า อย่าลืมเช็คอินเมื่อถึงที่ทำงานนะ',
    '[{"label":"🕘 กะเริ่ม","value":"09:00"},{"label":"⏳ อีก","value":"10 นาที"},{"label":"📍 สาขา","value":"สำนักงานใหญ่"},{"label":"สถานะ","value":"ยังไม่เช็คอิน"}]', 10),
  ('checkout_reminder', 'เตือนลืมเช็คเอาท์', 'auto', 'employee', 'orange',
    '🏃 ยังไม่ได้เช็คเอาท์นะ', 'กะเลิกแล้ว ถ้ากลับแล้วอย่าลืมกดเช็คเอาท์',
    '[{"label":"🕕 กะเลิก","value":"18:00"},{"label":"ผ่านมา","value":"5 นาที"},{"label":"สถานะ","value":"เช็คอินแล้ว ยังไม่เช็คเอาท์"}]', 20),
  ('celebrations', 'อวยพรวันเกิด/ครบรอบงาน', 'auto', 'employee', 'green',
    '🎂 สุขสันต์วันเกิด!', 'ขอให้มีความสุขมากๆ สุขภาพแข็งแรง ทีมงาน GOODHR ทุกคนคิดถึงคุณ 💛', '[]', 30),
  ('request_decided', 'ผลอนุมัติคำขอ (แจ้งผู้ยื่น)', 'auto', 'employee', 'green',
    '✅ อัปเดตคำขอของคุณ', 'คำขอของคุณได้รับการพิจารณาแล้ว',
    '[{"label":"ประเภท","value":"ลาพักร้อน"},{"label":"วันที่","value":"27/07/69"},{"label":"จำนวน","value":"1 วัน"},{"label":"ผล","value":"อนุมัติแล้ว ✅"},{"label":"โดย","value":"หัวหน้า"}]', 40),
  ('my_leave_balance', 'วันลาคงเหลือ (ตอบเมื่อถาม)', 'manual', 'employee', 'blue',
    'ℹ️ วันลาคงเหลือของคุณ', 'สรุปโควตาวันลาคงเหลือรายประเภท',
    '[{"label":"🏖️ ลาพักร้อน","value":"เหลือ 4/6 วัน"},{"label":"🤒 ลาป่วย","value":"เหลือ 28/30 วัน"},{"label":"📄 ลากิจ","value":"เหลือ 2/3 วัน"}]', 50),
  -- 🔒 หัวหน้า
  ('manager_digest', 'สรุปทีมเช้านี้', 'auto', 'manager', 'blue',
    '☀️ สรุปทีมเช้านี้', 'ภาพรวมการเข้างานทีม + คำขอรออนุมัติ',
    '[{"label":"✅ มาแล้ว","value":"23"},{"label":"🕐 มาสาย","value":"1"},{"label":"🏖️ ลา","value":"0"},{"label":"⏳ ยังไม่เช็คอิน","value":"9"},{"label":"📋 คำขอค้าง","value":"4"}]', 60),
  ('stale_approvals', 'คำขอค้างนาน', 'auto', 'manager', 'red',
    '⏳ มีคำขอค้างเกินกำหนด', 'ช่วยกดอนุมัติ/ปฏิเสธให้พนักงานหน่อยนะ',
    '[{"label":"ค้างทั้งหมด","value":"7 รายการ"},{"label":"เก่าสุด","value":"118 วัน"},{"label":"ประเภท","value":"ลา, OT, แก้เวลา"}]', 70),
  ('request_created', 'มีคำขอใหม่รออนุมัติ', 'auto', 'manager', 'blue',
    '📋 มีคำขอรออนุมัติ', 'มีคำขอใหม่รอคุณอนุมัติ',
    '[{"label":"ผู้ยื่น","value":"วรินทร (ฝน)"},{"label":"ประเภท","value":"ลาพักร้อน"},{"label":"วันที่","value":"27/07/69"},{"label":"จำนวน","value":"1 วัน"},{"label":"เหตุผล","value":"พักร้อน"}]', 80),
  -- 🏢 HR
  ('probation_due', 'ทดลองงานใกล้ครบกำหนด', 'auto', 'hr', 'purple',
    '📝 ต้องประเมินทดลองงานเร็วๆ นี้', 'มีพนักงานครบกำหนดประเมินทดลองงาน',
    '[{"label":"พนักงาน","value":"สุพิชญา โบกขระณีย์"},{"label":"ครบ 90 วัน","value":"21/08/69"},{"label":"สถานะ","value":"ยังไม่ประเมิน"}]', 90),
  -- แนะนำระบบ (ต้อนรับครั้งแรก)
  ('intro', 'แนะนำระบบ (ต้อนรับครั้งแรก)', 'manual', 'employee', 'green',
    '🎉 ยินดีต้อนรับสู่ระบบแจ้งเตือน GOODHR',
    'ตั้งแต่วันนี้ คุณจะได้รับแจ้งเตือนสำคัญผ่าน Feishu โดยตรง 🔔\nไม่พลาดทั้งเรื่องเข้างาน การลา การอนุมัติ และวันสำคัญ 💛',
    '[{"label":"⏰ เตือนเข้ากะ","value":"ก่อนเวลา 10 นาที"},{"label":"🏃 ลืมเช็คเอาท์","value":"เตือนตอนเลิกกะ"},{"label":"🏖️ ผลอนุมัติลา/OT","value":"รู้ผลทันที"},{"label":"🎂 วันเกิด/ครบรอบ","value":"มีคำอวยพร"},{"label":"ℹ️ เมนูบอท","value":"ดูวันลา/การเข้างานเอง"},{"label":"📋 สำหรับหัวหน้า","value":"สรุปทีม + คำขอรออนุมัติ"}]', 5),
  -- ทั่วไป
  ('custom', 'ข้อความกำหนดเอง', 'manual', 'employee', 'blue',
    '📢 ประกาศจาก GOODHR', '', '[]', 100)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name, audience = EXCLUDED.audience,
  sample_rows = CASE WHEN notification_templates.sample_rows = '[]'::jsonb OR notification_templates.sample_rows IS NULL
                     THEN EXCLUDED.sample_rows ELSE notification_templates.sample_rows END;

NOTIFY pgrst, 'reload schema';
