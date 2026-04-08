-- ============================================================
-- Migration: Announcement Multi-Image Support
-- วันที่: 2026-04-08
-- เปลี่ยนจาก image_url (TEXT) เป็น image_urls (TEXT[])
-- ============================================================

-- Step 1: เพิ่มคอลัมน์ image_urls (array)
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Step 2: ย้ายข้อมูลจาก image_url เดิม → image_urls
UPDATE announcements
SET image_urls = ARRAY[image_url]
WHERE image_url IS NOT NULL AND image_url <> ''
  AND (image_urls IS NULL OR image_urls = '{}');

-- หมายเหตุ: ไม่ drop คอลัมน์ image_url เดิม เพื่อ backward compatibility
-- หลังจากยืนยันว่าระบบใหม่ทำงานได้ดีแล้ว สามารถ drop ได้ทีหลัง
