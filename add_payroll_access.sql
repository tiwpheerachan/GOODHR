-- ============================================================================
-- สิทธิ์ดูข้อมูลเงินเดือน (payroll_access) — "เหนือกว่า super_admin"
--   เฉพาะ user ที่อยู่ในตารางนี้เท่านั้นที่:
--     • เข้าหน้า /admin/payroll ได้
--     • เห็นแท็บ "เงินเดือน" + "สรุปเงินเดือน" ในหน้าพนักงาน
--     • เรียก API ข้อมูลเงินเดือน (register/breakdown/bulk ฯลฯ)
--   เพิ่ม/ลบสิทธิ์ได้เฉพาะคนที่มีสิทธิ์นี้อยู่แล้ว
--   เริ่มต้น seed: may.pradit.s@shd-technology.co.th
-- ============================================================================

CREATE TABLE IF NOT EXISTS payroll_access (
  user_id     UUID PRIMARY KEY,          -- users.id (auth user id)
  email       TEXT,                       -- อีเมล (ไว้แสดง)
  granted_by  UUID,                        -- ใครเป็นคนเปิดสิทธิ์
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- seed คนแรก: may.pradit.s@ (map email → employee → user)
INSERT INTO payroll_access (user_id, email, granted_by)
SELECT u.id, e.email, u.id
FROM users u
JOIN employees e ON e.id = u.employee_id
WHERE lower(e.email) = lower('may.pradit.s@shd-technology.co.th')
ON CONFLICT (user_id) DO NOTHING;

-- RLS: ปิด client read ทั้งหมด (เข้าถึงผ่าน service-role API เท่านั้น) — ข้อมูลสิทธิ์เป็นเรื่องละเอียดอ่อน
ALTER TABLE payroll_access ENABLE ROW LEVEL SECURITY;
-- ไม่สร้าง policy = anon/authenticated อ่าน/เขียนไม่ได้ · API ใช้ service role bypass

NOTIFY pgrst, 'reload schema';

-- หมายเหตุ: ถ้า seed แล้วไม่ขึ้น (ยังว่าง) แปลว่า employees.email ของ may.pradit ยังไม่ตรง
--   ตรวจด้วย:  SELECT id, email FROM employees WHERE email ILIKE '%may.pradit%';
--   แล้วรัน INSERT ด้านบนใหม่ หรือใส่ user_id ตรงๆ
