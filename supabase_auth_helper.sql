-- ════════════════════════════════════════════════════════════════
-- Helper function: ค้นหา auth user id จากอีเมล
-- ใช้สำหรับ change-email API
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_auth_user_by_email(lookup_email text)
RETURNS uuid AS $$
  SELECT id FROM auth.users WHERE email = lookup_email LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- ════════════════════════════════════════════════════════════════
-- Helper function: ค้นหา auth user id จาก employee_id
-- ค้นทั้ง users table และ auth.users
-- ════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_auth_user_for_employee(emp_id uuid)
RETURNS TABLE(auth_id uuid, auth_email text) AS $$
BEGIN
  -- วิธี 1: หาจาก public.users ที่มี employee_id
  RETURN QUERY
    SELECT u.id, u.email::text
    FROM users u
    WHERE u.employee_id = emp_id
    LIMIT 1;

  IF FOUND THEN RETURN; END IF;

  -- วิธี 2: หาจากอีเมลของ employee → match กับ auth.users
  RETURN QUERY
    SELECT au.id, au.email::text
    FROM employees e
    JOIN auth.users au ON au.email = e.email
    WHERE e.id = emp_id
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
