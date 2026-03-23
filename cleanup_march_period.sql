-- ลบงวดมีนาคมที่สร้างไว้แล้ว (ที่ว่างอยู่) เพื่อสร้างใหม่ด้วย auto-calculate
-- Run ทีละบริษัทหรือทั้งหมด

-- ลบ payroll_records ของมีนาคม 2026 ก่อน (ถ้ามี)
DELETE FROM payroll_records WHERE year = 2026 AND month = 3;

-- ลบ payroll_periods ของมีนาคม 2026
DELETE FROM payroll_periods WHERE year = 2026 AND month = 3;

-- เสร็จแล้วไปกด "+ งวดใหม่" ที่หน้า admin อีกครั้ง
-- ระบบจะสร้างงวด + คำนวณเงินเดือนทุกคนทันที
