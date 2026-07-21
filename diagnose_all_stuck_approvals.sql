-- ════════════════════════════════════════════════════════════════════
-- รวมทุกคำขอที่ "ค้าง" แล้วหัวหน้าอาจไม่เห็น (ครอบทุกเคส + ทุกประเภท)
--   เคสหัวหน้าเพี้ยน:
--     no_active   = ไม่มีหัวหน้าใน history เลย  → ไม่มีใครเห็น
--     multi_active= มีหัวหน้า active หลายแถว    → ข้อมูลซ้อน
--     mismatch    = history ≠ supervisor_id     → หัวหน้าจริง (supervisor) ไม่เห็น
--   ประเภท: ลา / OT / แก้เวลา / นอกสถานที่ (pending) + ลาออก (pending_manager)
-- ════════════════════════════════════════════════════════════════════

WITH act AS (   -- หัวหน้า active ใน history (นับจำนวน + เอา manager มาเทียบ)
  SELECT employee_id, COUNT(*) AS n, MAX(manager_id::text) AS hist_mgr
  FROM employee_manager_history WHERE effective_to IS NULL GROUP BY employee_id
),
pending AS (
  SELECT employee_id, 'ลา'         AS typ, created_at FROM leave_requests             WHERE status='pending'
  UNION ALL SELECT employee_id, 'OT',          created_at FROM overtime_requests        WHERE status='pending'
  UNION ALL SELECT employee_id, 'แก้เวลา',     created_at FROM time_adjustment_requests WHERE status='pending'
  UNION ALL SELECT employee_id, 'นอกสถานที่',  created_at FROM offsite_checkin_requests  WHERE status='pending'
  UNION ALL SELECT employee_id, 'ลาออก',       created_at FROM resignation_requests      WHERE status='pending_manager'
),
diag AS (
  SELECT p.typ, p.created_at::date AS submitted, e.employee_code, e.first_name_th, e.last_name_th,
         d.name AS dept, c.name_th AS company,
         sup.first_name_th AS supervisor_name,
         hm.first_name_th  AS history_name,
         CASE
           WHEN a.n IS NULL THEN 'no_active'
           WHEN a.n > 1     THEN 'multi_active'
           WHEN e.supervisor_id IS DISTINCT FROM a.hist_mgr::uuid THEN 'mismatch'
           ELSE 'ok'
         END AS issue
  FROM pending p
  JOIN employees e ON e.id = p.employee_id
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN companies  c ON c.id = e.company_id
  LEFT JOIN employees sup ON sup.id = e.supervisor_id
  LEFT JOIN act a ON a.employee_id = p.employee_id
  LEFT JOIN employees hm ON hm.id = a.hist_mgr::uuid
)

-- ─── (1) สรุปจำนวน: ปัญหาแบบไหน กี่คำขอ กี่คน ───
SELECT issue,
       COUNT(*)                          AS จำนวนคำขอค้าง,
       COUNT(DISTINCT employee_code)      AS จำนวนคน
FROM diag WHERE issue <> 'ok'
GROUP BY issue ORDER BY จำนวนคำขอค้าง DESC;

-- ─── (2) รายละเอียดทั้งหมด (uncomment เพื่อดูรายคำขอ) ───
-- SELECT typ AS ประเภท, employee_code, first_name_th, last_name_th, dept,
--        issue, supervisor_name AS หัวหน้าจริง, history_name AS หัวหน้าใน_history, submitted
-- FROM diag WHERE issue <> 'ok'
-- ORDER BY issue, employee_code, submitted;

-- ─── (3) สรุปต่อคน (ใครค้างกี่รายการ ปัญหาอะไร) ───
-- SELECT employee_code, first_name_th, last_name_th, dept, issue,
--        supervisor_name AS หัวหน้าจริง, history_name AS ใน_history,
--        COUNT(*) AS คำขอค้าง,
--        string_agg(DISTINCT typ, ', ') AS ประเภท
-- FROM diag WHERE issue <> 'ok'
-- GROUP BY employee_code, first_name_th, last_name_th, dept, issue, supervisor_name, history_name
-- ORDER BY คำขอค้าง DESC;
