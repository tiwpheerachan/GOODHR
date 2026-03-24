-- ══════════════════════════════════════════════════════════════════════
-- GOODHR Performance Indexes — รองรับ 500+ พนักงาน
-- วิธีใช้: รันใน Supabase SQL Editor (ใช้ IF NOT EXISTS ปลอดภัย)
-- ══════════════════════════════════════════════════════════════════════

-- ── 1) attendance_records ────────────────────────────────────────────
-- ใช้ตอน: check-in (ตรวจซ้ำ), payroll calc, admin attendance list
CREATE INDEX IF NOT EXISTS idx_att_emp_workdate
  ON attendance_records(employee_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_att_company_workdate
  ON attendance_records(company_id, work_date DESC);

-- ใช้ตอน: KPI dashboard - นับสถานะรายวัน
CREATE INDEX IF NOT EXISTS idx_att_workdate_status
  ON attendance_records(work_date, status);

-- ใช้ตอน: check-in ตรวจว่าเช็คอินแล้วหรือยัง (covering index)
CREATE INDEX IF NOT EXISTS idx_att_emp_date_clockin
  ON attendance_records(employee_id, work_date)
  INCLUDE (clock_in, clock_out, status);

-- ── 2) payroll_records ──────────────────────────────────────────────
-- ใช้ตอน: payroll register, upsert per period
CREATE INDEX IF NOT EXISTS idx_payroll_period_emp
  ON payroll_records(payroll_period_id, employee_id);

-- ใช้ตอน: YTD tax accumulation (ดึงเดือนก่อนหน้าในปีเดียวกัน)
CREATE INDEX IF NOT EXISTS idx_payroll_emp_year_month
  ON payroll_records(employee_id, year DESC, month DESC);

-- ── 3) salary_structures ────────────────────────────────────────────
-- ใช้ตอน: payroll calc ดึง active salary
CREATE INDEX IF NOT EXISTS idx_salary_emp_active
  ON salary_structures(employee_id, effective_from DESC)
  WHERE effective_to IS NULL;

-- ── 4) leave_requests ───────────────────────────────────────────────
-- ใช้ตอน: payroll calc ดึงลาที่อนุมัติในงวด
CREATE INDEX IF NOT EXISTS idx_leave_emp_status_dates
  ON leave_requests(employee_id, status, start_date, end_date);

-- ใช้ตอน: attendance summary ดึงลาในช่วง
CREATE INDEX IF NOT EXISTS idx_leave_dates_status
  ON leave_requests(start_date, end_date)
  WHERE status = 'approved';

-- ── 5) employee_loans ───────────────────────────────────────────────
-- ใช้ตอน: payroll calc ดึงเงินกู้ active
CREATE INDEX IF NOT EXISTS idx_loans_emp_active
  ON employee_loans(employee_id)
  WHERE status = 'active';

-- ── 6) transport_claims ─────────────────────────────────────────────
-- ใช้ตอน: payroll calc ดึง transport ที่อนุมัติแล้ว
CREATE INDEX IF NOT EXISTS idx_transport_period_emp_status
  ON transport_claims(payroll_period_id, employee_id)
  WHERE status = 'approved';

-- ── 7) overtime_requests ────────────────────────────────────────────
-- ใช้ตอน: payroll calc fallback OT
CREATE INDEX IF NOT EXISTS idx_ot_emp_status_date
  ON overtime_requests(employee_id, status, work_date);

-- ── 8) employees ────────────────────────────────────────────────────
-- ใช้ตอน: ทุกหน้า admin ที่ filter by company + active
CREATE INDEX IF NOT EXISTS idx_emp_company_active
  ON employees(company_id, is_active)
  WHERE is_active = true;

-- ── 9) company_holidays ─────────────────────────────────────────────
-- ใช้ตอน: payroll calc ดึงวันหยุดในงวด
CREATE INDEX IF NOT EXISTS idx_holidays_company_date
  ON company_holidays(company_id, date)
  WHERE is_active = true;

-- ── 10) monthly_shift_assignments ───────────────────────────────────
-- ใช้ตอน: check-in ดึง shift ของวันนี้
CREATE INDEX IF NOT EXISTS idx_shift_assign_emp_date
  ON monthly_shift_assignments(employee_id, work_date);

-- ── 11) work_schedules ──────────────────────────────────────────────
-- ใช้ตอน: check-in fallback shift
CREATE INDEX IF NOT EXISTS idx_work_sched_emp_from
  ON work_schedules(employee_id, effective_from DESC);

-- ── 12) employee_allowed_locations ──────────────────────────────────
-- ใช้ตอน: check-in ดึงสาขาที่อนุญาต
CREATE INDEX IF NOT EXISTS idx_allowed_loc_emp
  ON employee_allowed_locations(employee_id);

-- ── 13) offsite_checkin_requests ────────────────────────────────────
-- ใช้ตอน: KPI dashboard นับ pending
CREATE INDEX IF NOT EXISTS idx_offsite_status
  ON offsite_checkin_requests(status)
  WHERE status = 'pending';

-- ══════════════════════════════════════════════════════════════════════
-- VERIFY: ตรวจสอบ indexes ที่สร้างแล้ว
-- ══════════════════════════════════════════════════════════════════════
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
