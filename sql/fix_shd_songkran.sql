-- ═══════════════════════════════════════════════════════════
-- เช็คก่อน: วันหยุดสงกรานต์ 13-15 เม.ย. 2026 มีใน company_holidays หรือยัง?
-- ═══════════════════════════════════════════════════════════
SELECT ch.date, ch.name, c.code AS company
FROM company_holidays ch
JOIN companies c ON c.id = ch.company_id
WHERE ch.date IN ('2026-04-13', '2026-04-14', '2026-04-15')
  AND ch.is_active = true
ORDER BY c.code, ch.date;
