-- DEBUG: ดู overtime_requests ของ 68000182 ในงวด มี.ค.-เม.ย. 2026
SELECT
  otr.work_date,
  otr.ot_minutes,
  otr.ot_type,
  otr.status,
  otr.reason
FROM overtime_requests otr
JOIN employees e ON e.id = otr.employee_id
WHERE e.employee_code = '68000182'
  AND otr.status = 'approved'
  AND otr.work_date >= '2026-03-22'
  AND otr.work_date <= '2026-04-21'
ORDER BY otr.work_date;
