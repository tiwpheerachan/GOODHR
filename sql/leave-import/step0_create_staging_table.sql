-- ═══════════════════════════════════════════════════════════
-- STEP 0: สร้าง staging table สำหรับข้อมูลจากแอปเก่า
-- หมายเหตุ: ใช้ TABLE ธรรมดา (ไม่ใช่ TEMP) เพื่อให้คงอยู่ระหว่าง step
-- จะลบทิ้งใน step5 หลังจากทำเสร็จเรียบร้อย
-- ═══════════════════════════════════════════════════════════
DROP TABLE IF EXISTS _old_app_leave;
CREATE TABLE _old_app_leave (
  emp_code     TEXT NOT NULL,
  leave_name   TEXT NOT NULL,
  old_quota    NUMERIC(8,2) DEFAULT 0,
  old_used     NUMERIC(8,2) DEFAULT 0
);
