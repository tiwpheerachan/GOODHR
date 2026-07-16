-- ════════════════════════════════════════════════════════════════════
-- Feishu Webhook (push แบบ realtime) — เมื่อมีคำขอสร้าง/อนุมัติ/ปฏิเสธ
--   Postgres ยิง HTTP POST ไป URL ของเพื่อนทันที (ผ่าน pg_net = async ไม่ block)
--   เพื่อนรับ payload → resolve feishu_user_id (API /api/feishu-notify/resolve) → push Feishu
-- ════════════════════════════════════════════════════════════════════

-- 1) เปิด pg_net (Supabase รองรับ)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2) ตารางเก็บ URL + secret ของ webhook (แก้ผ่าน API /api/admin/feishu-webhook หรือ SQL)
CREATE TABLE IF NOT EXISTS webhook_config (
  id          INT PRIMARY KEY DEFAULT 1,
  feishu_url  TEXT,             -- URL ปลายทางของเพื่อน
  secret      TEXT,             -- ส่งใน header X-GoodHR-Secret ให้เพื่อน verify
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_config_singleton CHECK (id = 1)
);
INSERT INTO webhook_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;  -- service role only

-- 3) trigger function — ยิง POST เมื่อคำขอ pending (สร้าง) หรือ approved/rejected (ตัดสิน)
CREATE OR REPLACE FUNCTION notify_request_webhook() RETURNS trigger AS $$
DECLARE cfg webhook_config; evt TEXT;
BEGIN
  SELECT * INTO cfg FROM webhook_config WHERE id = 1;
  IF cfg.feishu_url IS NULL OR cfg.feishu_url = '' OR NOT cfg.enabled THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    evt := 'request.created';        -- คำขอใหม่ → แจ้งหัวหน้า
  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status
        AND NEW.status IN ('approved','rejected') THEN
    evt := 'request.decided';        -- ตัดสินแล้ว → แจ้งเจ้าของคำขอ
  ELSE
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := cfg.feishu_url,
    headers := jsonb_build_object('Content-Type','application/json','X-GoodHR-Secret', coalesce(cfg.secret,'')),
    body := jsonb_build_object(
      'event', evt,
      'request_type', TG_ARGV[0],           -- leave | overtime | adjustment | offsite | resignation
      'request_id', NEW.id,
      'employee_id', NEW.employee_id,
      'status', NEW.status,
      'company_id', NEW.company_id,
      'at', now()
    )
  );
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4) ผูก trigger เข้าตารางคำขอ (เฉพาะตารางที่มีจริง)
DO $$
DECLARE t RECORD;
BEGIN
  FOR t IN SELECT * FROM (VALUES
      ('leave_requests','leave'),
      ('overtime_requests','overtime'),
      ('time_adjustment_requests','adjustment'),
      ('offsite_checkin_requests','offsite'),
      ('resignation_requests','resignation')
  ) AS v(tbl, typ) LOOP
    IF to_regclass('public.'||t.tbl) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_wh_%s ON %I', t.typ, t.tbl);
      EXECUTE format(
        'CREATE TRIGGER trg_wh_%s AFTER INSERT OR UPDATE ON %I
           FOR EACH ROW EXECUTE FUNCTION notify_request_webhook(%L)',
        t.typ, t.tbl, t.typ);
    END IF;
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';

-- ── ตั้งค่า URL ของเพื่อน (แก้ค่าแล้วรัน): ──
-- UPDATE webhook_config SET feishu_url='https://friend-service/webhook', secret='<สุ่มยาวๆ>' WHERE id=1;
