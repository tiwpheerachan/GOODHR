-- ============================================================
-- GOODHR: Migrate KPI เก่าที่ status = 'submitted' → 'approved'
-- เพื่อให้พนักงานเห็นผลประเมินที่ส่งไปก่อนหน้านี้
-- Run this AFTER running supabase_kpi_approval_and_probation_eval.sql
-- ============================================================

-- ดูจำนวนก่อน (ทดสอบ)
SELECT status, COUNT(*) FROM kpi_forms GROUP BY status;

-- อัพเดท KPI ที่ submitted ก่อนวันที่เพิ่มระบบ approval ให้เป็น approved
-- (เฉพาะที่ submitted ก่อนวันนี้)
UPDATE kpi_forms
SET status = 'approved',
    approved_at = submitted_at,
    updated_at = now()
WHERE status = 'submitted'
  AND submitted_at IS NOT NULL;

-- ตรวจสอบผลลัพธ์
SELECT status, COUNT(*) FROM kpi_forms GROUP BY status;
