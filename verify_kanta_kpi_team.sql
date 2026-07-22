-- ═══════════════════════════════════════════════════════════════════
-- ตรวจสอบ: ทีมที่ "กันตา (แอปเปิ้ล)" ต้องประเมิน KPI รอบ ก.ค. 2026
-- จำลอง logic getManageableEmployees() ของหน้า KPI เป๊ะ:
--   direct = (history active ของกันตา  ลบ  คนที่ kpi_evaluator_id ชี้คนอื่น)
--            บวก  คนที่ kpi_evaluator_id = กันตา (active)
--            แล้วกรองเฉพาะ is_active = true AND deleted_at IS NULL
-- ═══════════════════════════════════════════════════════════════════
WITH kanta AS (
  SELECT id FROM employees
  WHERE (nickname = 'แอปเปิ้ล' OR first_name_th = 'กันตา')
    AND employment_status NOT IN ('resigned','terminated')
  ORDER BY employee_code LIMIT 1
),
-- (A) ลูกทีมจริงจาก history active
history_reports AS (
  SELECT h.employee_id
  FROM employee_manager_history h, kanta k
  WHERE h.manager_id = k.id AND h.effective_to IS NULL
),
-- (B) เอาไว้ตัด: history report ที่ถูกมอบให้คนอื่นประเมิน
overridden AS (
  SELECT e.id AS employee_id
  FROM employees e, kanta k
  WHERE e.id IN (SELECT employee_id FROM history_reports)
    AND e.kpi_evaluator_id IS NOT NULL AND e.kpi_evaluator_id <> k.id
),
-- (C) คนที่ถูกมอบหมายให้กันตาประเมิน (แม้ไม่ใช่ลูกทีมจริง)
designated AS (
  SELECT e.id AS employee_id
  FROM employees e, kanta k
  WHERE e.kpi_evaluator_id = k.id AND e.is_active = true
),
-- direct = (history - overridden) ∪ designated
direct_set AS (
  SELECT employee_id FROM history_reports
  EXCEPT
  SELECT employee_id FROM overridden
  UNION
  SELECT employee_id FROM designated
)
SELECT
  ROW_NUMBER() OVER (ORDER BY e.employee_code)               AS "#",
  e.employee_code,
  e.first_name_th || COALESCE(' '||e.last_name_th,'') ||
    COALESCE(' ('||e.nickname||')','')                       AS employee,
  p.name                                                     AS position,
  -- เป็นลูกทีมจริงไหม
  CASE WHEN e.id IN (SELECT employee_id FROM history_reports)
       THEN '✅ ลูกทีมจริง' ELSE '👉 มอบหมาย' END            AS type,
  -- สถานะประเมิน ก.ค. 2026
  COALESCE(f.status, 'ยังไม่ประเมิน')                        AS kpi_status
FROM direct_set ds
JOIN employees e   ON e.id = ds.employee_id
                  AND e.is_active = true AND e.deleted_at IS NULL   -- ← หน้า KPI ซ่อนคนลาออก/ปิดใช้งาน
LEFT JOIN positions p ON p.id = e.position_id
LEFT JOIN kpi_forms f ON f.employee_id = e.id
                     AND f.evaluator_id = (SELECT id FROM kanta)
                     AND f.year = 2026 AND f.month = 7
ORDER BY e.employee_code;

-- ── นับสรุป: ทั้งหมด / ประเมินแล้ว / ยังไม่ประเมิน ──
WITH kanta AS (
  SELECT id FROM employees
  WHERE (nickname = 'แอปเปิ้ล' OR first_name_th = 'กันตา')
    AND employment_status NOT IN ('resigned','terminated')
  ORDER BY employee_code LIMIT 1
),
history_reports AS (
  SELECT h.employee_id FROM employee_manager_history h, kanta k
  WHERE h.manager_id = k.id AND h.effective_to IS NULL
),
overridden AS (
  SELECT e.id AS employee_id FROM employees e, kanta k
  WHERE e.id IN (SELECT employee_id FROM history_reports)
    AND e.kpi_evaluator_id IS NOT NULL AND e.kpi_evaluator_id <> k.id
),
designated AS (
  SELECT e.id AS employee_id FROM employees e, kanta k
  WHERE e.kpi_evaluator_id = k.id AND e.is_active = true
),
direct_set AS (
  SELECT employee_id FROM history_reports
  EXCEPT SELECT employee_id FROM overridden
  UNION  SELECT employee_id FROM designated
),
active_team AS (
  SELECT e.id FROM direct_set ds
  JOIN employees e ON e.id = ds.employee_id AND e.is_active = true AND e.deleted_at IS NULL
)
SELECT
  (SELECT COUNT(*) FROM active_team)                                    AS ขึ้นให้ประเมิน,
  (SELECT COUNT(*) FROM active_team a
     JOIN kpi_forms f ON f.employee_id = a.id
      AND f.evaluator_id = (SELECT id FROM kanta) AND f.year=2026 AND f.month=7) AS มีฟอร์มแล้ว;
