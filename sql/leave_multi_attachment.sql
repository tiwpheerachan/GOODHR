-- ============================================================
-- Migration: Leave Request Multi-Attachment Support
-- วันที่: 2026-04-08
-- เพิ่ม attachment_urls/attachment_names (TEXT[]) สำหรับหลายไฟล์
-- ============================================================

-- Step 1: เพิ่มคอลัมน์ array
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT '{}';
ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS attachment_names TEXT[] DEFAULT '{}';

-- Step 2: ย้ายข้อมูลจากคอลัมน์เดิม
UPDATE leave_requests
SET attachment_urls = ARRAY[attachment_url],
    attachment_names = ARRAY[attachment_name]
WHERE attachment_url IS NOT NULL AND attachment_url <> ''
  AND (attachment_urls IS NULL OR attachment_urls = '{}');

-- หมายเหตุ: ไม่ drop คอลัมน์เดิม เพื่อ backward compatibility
