-- ════════════════════════════════════════════════════════════════════
-- เพิ่มฟีเจอร์ "รับทราบประกาศ" (acknowledge) — แยกจาก "อ่านแล้ว" (read)
-- ─ read_at: เปิดดูประกาศ (passive)
-- ─ acknowledged_at: กดปุ่มรับทราบ (active confirm)
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE announcement_reads
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ann_reads_ack
  ON announcement_reads(announcement_id, acknowledged_at)
  WHERE acknowledged_at IS NOT NULL;

-- Verify
SELECT
  count(*) FILTER (WHERE acknowledged_at IS NOT NULL) AS acknowledged,
  count(*) FILTER (WHERE acknowledged_at IS NULL) AS not_yet,
  count(*) AS total
FROM announcement_reads;
