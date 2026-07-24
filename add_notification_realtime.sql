-- ═══════════════════════════════════════════════════════════════════
-- แจ้งเตือน "เรียลไทม์": มี in-app notification ใหม่ → ยิงเข้า Feishu ทันที
--   notifications INSERT → pg_net POST → /api/cron/notify-one (GoodHR ส่งเอง)
--   (ไม่ต้องรอ cron 5 นาที) · cron relay ยังไว้เป็น fallback กันพลาด
-- ═══════════════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_net;

-- config: ปลายทาง relay ของ GoodHR เอง + secret (= CRON_SECRET)
CREATE TABLE IF NOT EXISTS notify_realtime_config (
  id      INT PRIMARY KEY DEFAULT 1,
  url     TEXT,
  secret  TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT notify_rt_singleton CHECK (id = 1)
);
-- ตั้งค่าเริ่มต้น (แก้ secret ให้ตรง CRON_SECRET ที่ตั้งบน Render)
INSERT INTO notify_realtime_config (id, url, secret, enabled)
VALUES (1, 'https://goodhr.onrender.com/api/cron/notify-one', 'ใส่ค่า CRON_SECRET ที่นี่', true)
ON CONFLICT (id) DO UPDATE SET url = EXCLUDED.url;   -- ไม่ทับ secret ที่ตั้งไว้แล้ว

ALTER TABLE notify_realtime_config ENABLE ROW LEVEL SECURITY;

-- ยิงเรียลไทม์ตอนมี notification ใหม่
CREATE OR REPLACE FUNCTION notify_realtime_fn() RETURNS trigger AS $$
DECLARE cfg notify_realtime_config;
BEGIN
  SELECT * INTO cfg FROM notify_realtime_config WHERE id = 1;
  IF cfg.url IS NULL OR cfg.url = '' OR NOT cfg.enabled THEN RETURN NEW; END IF;
  PERFORM net.http_post(
    url := cfg.url,
    headers := jsonb_build_object('Content-Type','application/json','X-GoodHR-Secret', coalesce(cfg.secret,'')),
    body := jsonb_build_object('notif_id', NEW.id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_realtime ON notifications;
CREATE TRIGGER trg_notify_realtime
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION notify_realtime_fn();

NOTIFY pgrst, 'reload schema';

-- ⚠️ หลังรัน: UPDATE notify_realtime_config SET secret='<CRON_SECRET จริง>' WHERE id=1;
