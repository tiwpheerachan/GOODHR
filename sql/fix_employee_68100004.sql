-- ════════════════════════════════════════════════════════════════
-- แก้ไขข้อมูลพนักงาน รังสิมา พาพันธ์ (68100004)
-- รันใน Supabase SQL Editor
-- ════════════════════════════════════════════════════════════════

-- ─── 1. แก้ OT วันที่ 30 มี.ค. 2569 ──────────────────────────
-- OT อนุมัติ 2 รายการ (เช้า 120 นาที + เย็น 120 นาที = 240)
-- แต่ attendance record บันทึกแค่ 120 เพราะ checkout เขียนทับ
UPDATE attendance_records
SET ot_minutes = 240
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND work_date = '2026-03-30';

-- ─── 2. แก้ early_out วันที่ 2 เม.ย. 2569 ────────────────────
-- พนักงานลากิจอนุมัติแล้ว แต่ attendance ยังขึ้น early_out 500 นาที
-- เปลี่ยน status เป็น leave และเคลียร์ early_out
UPDATE attendance_records
SET status = 'leave',
    early_out_minutes = 0,
    late_minutes = 0
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND work_date = '2026-04-02';

-- ─── 3. ตรวจสอบผลลัพธ์ ───────────────────────────────────────
SELECT work_date, status, ot_minutes, early_out_minutes, late_minutes
FROM attendance_records
WHERE employee_id = (SELECT id FROM employees WHERE employee_code = '68100004')
  AND work_date IN ('2026-03-30', '2026-04-02');
