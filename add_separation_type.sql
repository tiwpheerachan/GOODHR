-- ════════════════════════════════════════════════════════════════════
-- ประเภทการพ้นสภาพพนักงาน (separation_type)
--   เก็บเหตุผลเชิงประเภท: death | resignation | retirement |
--     dismissal_cause | dismissal_nocause | removal | early_retire
--   employment_status ยังเป็น resigned/terminated (enum เดิม) — type เก็บรายละเอียด
-- ════════════════════════════════════════════════════════════════════
ALTER TABLE employees            ADD COLUMN IF NOT EXISTS separation_type TEXT;
ALTER TABLE resignation_history  ADD COLUMN IF NOT EXISTS separation_type TEXT;

NOTIFY pgrst, 'reload schema';
