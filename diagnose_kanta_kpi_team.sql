-- ═══════════════════════════════════════════════════════════════════
-- วินิจฉัย: หน้า KPI ของ "กันตา (แอปเปิ้ล)" ต้องประเมินใครบ้าง + ใครเป็นหัวหน้าจริง
--
-- หน้า KPI นิยาม "ทีมตรงของฉัน" (relation=direct) จาก getManageableEmployees():
--   (A) employee_manager_history: manager_id = กันตา AND effective_to IS NULL   ← หัวหน้าจริง
--   (B) ลบคนที่ employees.kpi_evaluator_id ชี้ไปคนอื่น (มอบหมายให้คนอื่นประเมิน)
--   (C) บวกคนที่ employees.kpi_evaluator_id = กันตา (ถูกมอบให้ประเมินแทนหัวหน้าจริง)
-- → ดังนั้น "ประเมินได้" ≠ "เป็นหัวหน้าจริง" เสมอไป ตารางนี้แยกให้เห็น
-- ═══════════════════════════════════════════════════════════════════

-- ── หา employee_id ของกันตา (แก้เงื่อนไขได้ถ้าชื่อซ้ำ) ──
WITH kanta AS (
  SELECT id, employee_code, first_name_th, last_name_th, nickname
  FROM employees
  WHERE (nickname = 'แอปเปิ้ล' OR first_name_th = 'กันตา')
    AND employment_status NOT IN ('resigned','terminated')
  ORDER BY employee_code
  LIMIT 1
)
-- ── รายชื่อ "ทีมตรง KPI" ที่หน้าจอแสดง + เหตุผล ──
SELECT
  e.employee_code,
  e.first_name_th || ' ' || COALESCE(e.last_name_th,'') ||
    COALESCE(' ('||e.nickname||')','')                       AS employee,
  p.name  AS position,
  d.name  AS department,
  -- เป็นหัวหน้าจริงไหม (มีใน history active)
  CASE WHEN h.employee_id IS NOT NULL THEN '✅ ใช่' ELSE '— ไม่' END           AS is_real_direct_report,
  -- supervisor_id ตรงกับกันตาไหม (อีกแหล่งที่อาจ drift)
  CASE WHEN e.supervisor_id = k.id THEN '✅ ตรง'
       WHEN e.supervisor_id IS NULL THEN '(ว่าง)'
       ELSE '⚠️ ชี้คนอื่น' END                                                 AS supervisor_id_match,
  -- kpi_evaluator_id override
  CASE WHEN e.kpi_evaluator_id = k.id THEN '👉 มอบให้กันตาประเมิน'
       WHEN e.kpi_evaluator_id IS NOT NULL THEN '⚠️ มอบให้คนอื่น'
       ELSE '(ตามหัวหน้าจริง)' END                                            AS kpi_evaluator,
  -- สรุปว่าทำไมโผล่ในลิสต์กันตา
  CASE
    WHEN e.kpi_evaluator_id = k.id AND (h.employee_id IS NULL) THEN 'มอบหมาย (ไม่ใช่ลูกทีมจริง)'
    WHEN h.employee_id IS NOT NULL AND (e.kpi_evaluator_id IS NULL OR e.kpi_evaluator_id = k.id) THEN 'ลูกทีมจริง'
    ELSE 'ตรวจสอบ'
  END                                                                          AS reason
FROM kanta k
JOIN employees e ON TRUE
LEFT JOIN employee_manager_history h
       ON h.employee_id = e.id AND h.manager_id = k.id AND h.effective_to IS NULL
LEFT JOIN positions   p ON p.id = e.position_id
LEFT JOIN departments d ON d.id = e.department_id
WHERE e.is_active = true AND e.deleted_at IS NULL
  AND (
    -- (A)+(C) เข้าเงื่อนไข direct ของ KPI
    (h.employee_id IS NOT NULL AND (e.kpi_evaluator_id IS NULL OR e.kpi_evaluator_id = k.id))
    OR e.kpi_evaluator_id = k.id
  )
ORDER BY is_real_direct_report DESC, e.employee_code;


-- ═══════════════════════════════════════════════════════════════════
-- (2) ตรงข้าม: คนที่ "รายงานกันตาจริง" (history active) แต่หลุดจากลิสต์ KPI
--     เพราะ kpi_evaluator_id ถูกมอบให้คนอื่น
-- ═══════════════════════════════════════════════════════════════════
WITH kanta AS (
  SELECT id FROM employees
  WHERE (nickname = 'แอปเปิ้ล' OR first_name_th = 'กันตา')
    AND employment_status NOT IN ('resigned','terminated')
  ORDER BY employee_code LIMIT 1
)
SELECT
  e.employee_code,
  e.first_name_th || ' ' || COALESCE(e.last_name_th,'') || COALESCE(' ('||e.nickname||')','') AS employee,
  (SELECT first_name_th||' ('||COALESCE(nickname,'')||')' FROM employees WHERE id = e.kpi_evaluator_id) AS assigned_to,
  'รายงานกันตาจริง แต่มอบให้คนอื่นประเมิน KPI' AS note
FROM kanta k
JOIN employee_manager_history h ON h.manager_id = k.id AND h.effective_to IS NULL
JOIN employees e ON e.id = h.employee_id AND e.is_active = true AND e.deleted_at IS NULL
WHERE e.kpi_evaluator_id IS NOT NULL AND e.kpi_evaluator_id <> k.id
ORDER BY e.employee_code;


-- ═══════════════════════════════════════════════════════════════════
-- (3) เช็ค drift: คนที่ supervisor_id = กันตา แต่ไม่มีใน history active (หรือกลับกัน)
--     ถ้าตัวเลขไม่ตรงกัน = ข้อมูลหัวหน้า 2 แหล่งไม่ sync
-- ═══════════════════════════════════════════════════════════════════
WITH kanta AS (
  SELECT id FROM employees
  WHERE (nickname = 'แอปเปิ้ล' OR first_name_th = 'กันตา')
    AND employment_status NOT IN ('resigned','terminated')
  ORDER BY employee_code LIMIT 1
)
SELECT
  COUNT(*) FILTER (WHERE h.employee_id IS NOT NULL)                        AS via_history_active,
  COUNT(*) FILTER (WHERE e.supervisor_id = k.id)                          AS via_supervisor_id,
  COUNT(*) FILTER (WHERE h.employee_id IS NOT NULL AND e.supervisor_id IS DISTINCT FROM k.id) AS in_history_not_supervisor,
  COUNT(*) FILTER (WHERE e.supervisor_id = k.id AND h.employee_id IS NULL) AS in_supervisor_not_history
FROM kanta k
JOIN employees e ON e.is_active = true AND e.deleted_at IS NULL
LEFT JOIN employee_manager_history h
       ON h.employee_id = e.id AND h.manager_id = k.id AND h.effective_to IS NULL
WHERE e.supervisor_id = k.id OR h.employee_id IS NOT NULL;
