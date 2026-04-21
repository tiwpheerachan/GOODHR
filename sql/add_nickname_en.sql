-- ============================================================
-- Migration: Add nickname_en column to employees table
-- Purpose: Support multi-language nicknames (English)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add the column
ALTER TABLE employees ADD COLUMN IF NOT EXISTS nickname_en TEXT;

-- 2. Comment
COMMENT ON COLUMN employees.nickname_en IS 'English transliteration of Thai nickname';

-- ============================================================
-- 3. Auto-transliterate known Thai nicknames → English
--    This covers the most common Thai nicknames.
--    After running, manually review and fix any incorrect ones.
-- ============================================================
UPDATE employees SET nickname_en = CASE nickname
  -- Common Thai nicknames → English transliteration
  WHEN 'บอย' THEN 'Boy'
  WHEN 'เบล' THEN 'Bell'
  WHEN 'มิ้นท์' THEN 'Mint'
  WHEN 'มิ้น' THEN 'Mint'
  WHEN 'มิน' THEN 'Min'
  WHEN 'ปาล์ม' THEN 'Palm'
  WHEN 'ฝน' THEN 'Fon'
  WHEN 'น้ำ' THEN 'Nam'
  WHEN 'แนน' THEN 'Nan'
  WHEN 'นุ่น' THEN 'Noon'
  WHEN 'หนุ่ม' THEN 'Num'
  WHEN 'โอ๊ค' THEN 'Oak'
  WHEN 'อาร์ม' THEN 'Arm'
  WHEN 'เอิร์ธ' THEN 'Earth'
  WHEN 'เฟิร์น' THEN 'Fern'
  WHEN 'เฟิร์ส' THEN 'First'
  WHEN 'เจ' THEN 'Jay'
  WHEN 'เจม' THEN 'Jam'
  WHEN 'เจมส์' THEN 'James'
  WHEN 'กัน' THEN 'Gun'
  WHEN 'กันต์' THEN 'Gun'
  WHEN 'กิ๊ฟ' THEN 'Gift'
  WHEN 'กิ๊ก' THEN 'Gig'
  WHEN 'เก่ง' THEN 'Keng'
  WHEN 'เกม' THEN 'Game'
  WHEN 'ก้อย' THEN 'Koi'
  WHEN 'กอล์ฟ' THEN 'Golf'
  WHEN 'ไอซ์' THEN 'Ice'
  WHEN 'ไอซ' THEN 'Ice'
  WHEN 'นิว' THEN 'New'
  WHEN 'เม' THEN 'May'
  WHEN 'เมย์' THEN 'May'
  WHEN 'แม็ค' THEN 'Mac'
  WHEN 'มาร์ค' THEN 'Mark'
  WHEN 'มาย' THEN 'Mai'
  WHEN 'แมน' THEN 'Man'
  WHEN 'ต้น' THEN 'Ton'
  WHEN 'ตูน' THEN 'Toon'
  WHEN 'เต้ย' THEN 'Toei'
  WHEN 'เติ้ล' THEN 'Tle'
  WHEN 'ท็อป' THEN 'Top'
  WHEN 'ทราย' THEN 'Sai'
  WHEN 'ทิพ' THEN 'Tip'
  WHEN 'ทิม' THEN 'Tim'
  WHEN 'ตี๊ดตี่' THEN 'Tid-Tee'
  WHEN 'ตี๋' THEN 'Tee'
  WHEN 'แตง' THEN 'Taeng'
  WHEN 'แต้ว' THEN 'Taew'
  WHEN 'บี' THEN 'Bee'
  WHEN 'บีม' THEN 'Beam'
  WHEN 'แบม' THEN 'Bam'
  WHEN 'แบงค์' THEN 'Bank'
  WHEN 'เบญ' THEN 'Ben'
  WHEN 'เบสท์' THEN 'Best'
  WHEN 'บิว' THEN 'Bew'
  WHEN 'บุ๋ม' THEN 'Boom'
  WHEN 'แบ๊งค์' THEN 'Bank'
  WHEN 'ปอ' THEN 'Por'
  WHEN 'ปู' THEN 'Poo'
  WHEN 'ป๊อป' THEN 'Pop'
  WHEN 'เปิ้ล' THEN 'Ple'
  WHEN 'ปอนด์' THEN 'Pond'
  WHEN 'แป้ง' THEN 'Paeng'
  WHEN 'พลอย' THEN 'Ploy'
  WHEN 'พิม' THEN 'Pim'
  WHEN 'พิมพ์' THEN 'Pim'
  WHEN 'เพชร' THEN 'Petch'
  WHEN 'เพียว' THEN 'Pew'
  WHEN 'ปิ๊ก' THEN 'Pig'
  WHEN 'ปิ่น' THEN 'Pin'
  WHEN 'แพรว' THEN 'Praew'
  WHEN 'เอม' THEN 'Aim'
  WHEN 'แอม' THEN 'Am'
  WHEN 'ออม' THEN 'Aom'
  WHEN 'อ้อม' THEN 'Aom'
  WHEN 'อาร์ต' THEN 'Art'
  WHEN 'อั้ม' THEN 'Aum'
  WHEN 'อั๋น' THEN 'An'
  WHEN 'โอม' THEN 'Ohm'
  WHEN 'เอก' THEN 'Ek'
  WHEN 'ส้ม' THEN 'Som'
  WHEN 'แซม' THEN 'Sam'
  WHEN 'ซัน' THEN 'Sun'
  WHEN 'หมิว' THEN 'Mew'
  WHEN 'มิว' THEN 'Mew'
  WHEN 'หมู' THEN 'Moo'
  WHEN 'หมูหมี' THEN 'MooMee'
  WHEN 'หนึ่ง' THEN 'Nueng'
  WHEN 'ว่าน' THEN 'Wan'
  WHEN 'วุ้น' THEN 'Wun'
  WHEN 'วิว' THEN 'View'
  WHEN 'จุ๊บ' THEN 'Jub'
  WHEN 'จอย' THEN 'Joy'
  WHEN 'ดาว' THEN 'Dao'
  WHEN 'ด้า' THEN 'Da'
  WHEN 'ฟลุ๊ค' THEN 'Fluke'
  WHEN 'ฟิล์ม' THEN 'Film'
  WHEN 'แฟ้ม' THEN 'Fam'
  WHEN 'หลิน' THEN 'Lin'
  WHEN 'ลิน' THEN 'Lin'
  WHEN 'ลูกตาล' THEN 'Looktan'
  WHEN 'ลูกปลา' THEN 'Lookpla'
  WHEN 'นุ๊ก' THEN 'Nook'
  WHEN 'นก' THEN 'Nok'
  WHEN 'นาย' THEN 'Nai'
  WHEN 'เนย' THEN 'Noei'
  WHEN 'นัท' THEN 'Nut'
  WHEN 'เนส' THEN 'Nest'
  WHEN 'ยุ้ย' THEN 'Yui'
  WHEN 'ยิม' THEN 'Yim'
  WHEN 'ไหม' THEN 'Mai'
  WHEN 'ไร' THEN 'Rai'
  WHEN 'กัส' THEN 'Gus'
  WHEN 'อากิมบิว' THEN 'Akimbew'
  WHEN 'มาย' THEN 'Mai'
  WHEN 'ข้าว' THEN 'Khao'
  WHEN 'คิม' THEN 'Kim'
  -- If nickname not in list, keep it null for manual review
  ELSE NULL
END
WHERE nickname IS NOT NULL AND nickname != '' AND nickname_en IS NULL;

-- ============================================================
-- 4. Report: Show employees that still need manual review
-- ============================================================
SELECT employee_code, first_name_th, last_name_th, nickname, nickname_en
FROM employees
WHERE nickname IS NOT NULL AND nickname != '' AND nickname_en IS NULL
ORDER BY employee_code;
