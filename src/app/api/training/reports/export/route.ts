import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import { getTrainingAccess, getAccessibleChannelIds, getChannelReadFilter } from "@/lib/utils/training-permissions"
import * as XLSX from "xlsx"

// GET /api/training/reports/export?channel_id=...&course_id=...
// Returns a multi-sheet XLSX with detailed training data
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const svc = createServiceClient()
  const access = await getTrainingAccess(svc, user.id)
  if (!access.isTrainingAdmin && !access.isSupervisor && !access.isViewer) {
    return NextResponse.json({ error: "ไม่มีสิทธิ์" }, { status: 403 })
  }

  const sp = new URL(req.url).searchParams
  const channelFilter = sp.get("channel_id")
  const courseFilter = sp.get("course_id")

  // ── Determine accessible channels ─────────────────────────────────
  // admin = all; supervisor + viewer = only granted channels
  const accessibleIds = getAccessibleChannelIds(access)
  const restrictedChannelIds = accessibleIds === "ALL"
    ? null
    : (accessibleIds.length ? accessibleIds : ["00000000-0000-0000-0000-000000000000"])

  // ── Fetch channels ────────────────────────────────────────────────
  let chQ = svc.from("training_channels").select("id, name, brand, description, created_at")
  if (restrictedChannelIds) chQ = chQ.in("id", restrictedChannelIds)
  if (channelFilter) chQ = chQ.eq("id", channelFilter)
  const { data: channels } = await chQ.order("name")

  const channelIds = (channels ?? []).map(c => c.id)
  if (channelIds.length === 0) {
    return NextResponse.json({ error: "ไม่มีช่องที่เข้าถึงได้" }, { status: 404 })
  }

  // ── Fetch courses ─────────────────────────────────────────────────
  let crsQ = svc.from("training_courses")
    .select("id, channel_id, title, description, status, version, passing_score, max_retries, affect_kpi, kpi_weight, close_date, difficulty, estimated_minutes, created_at")
    .in("channel_id", channelIds)
  if (courseFilter) crsQ = crsQ.eq("id", courseFilter)
  const { data: courses } = await crsQ.order("created_at", { ascending: false })

  const courseIds = (courses ?? []).map(c => c.id)
  const chanById = new Map((channels ?? []).map(c => [c.id, c]))
  const courseById = new Map((courses ?? []).map(c => [c.id, c]))

  // ── Fetch modules ─────────────────────────────────────────────────
  const { data: modules } = courseIds.length
    ? await svc.from("training_modules")
        .select("id, course_id, order_no, title, content_type, required_watch_pct, video_duration_sec")
        .in("course_id", courseIds)
        .order("order_no")
    : { data: [] as any[] }
  const moduleById = new Map((modules ?? []).map(m => [m.id, m]))

  // ── Fetch quizzes ─────────────────────────────────────────────────
  const { data: quizzes } = courseIds.length
    ? await svc.from("training_quizzes")
        .select("id, course_id, module_id, title, passing_score, question_count, time_limit_sec")
        .in("course_id", courseIds)
    : { data: [] as any[] }
  const quizById = new Map((quizzes ?? []).map(q => [q.id, q]))

  // ── Build per-channel viewer subordinate filter (parallel) ───────
  // For each accessible channel, get the set of employee_ids the user may see.
  // null means "all employees" (admin / supervisor / viewer scope=all)
  const channelEmployeeFilter = new Map<string, Set<string> | null>()
  const filterResults = await Promise.all((channels ?? []).map(ch =>
    getChannelReadFilter(svc, access, ch.id).then(rf => ({ id: ch.id, rf }))
  ))
  for (const { id, rf } of filterResults) {
    if (!rf.allowed) continue
    channelEmployeeFilter.set(id, rf.filterEmployeeIds ? new Set(rf.filterEmployeeIds) : null)
  }

  // ── Fetch enrollments + employee profile ─────────────────────────
  let { data: enrollments } = courseIds.length
    ? await svc.from("training_enrollments")
        .select(`id, course_id, employee_id, status, progress_pct, last_accessed_at, completed_at, final_score, enrolled_at,
                 employee:employees!training_enrollments_employee_id_fkey(
                   first_name_th, last_name_th, nickname, employee_code, brand,
                   department:departments(name), position:positions(name), branch:branches(name)
                 )`)
        .in("course_id", courseIds)
        .order("enrolled_at", { ascending: false })
    : { data: [] as any[] }

  // apply per-channel subordinate filter
  if (enrollments && enrollments.length > 0) {
    enrollments = enrollments.filter((e: any) => {
      const c = courseById.get(e.course_id)
      if (!c) return false
      const allowed = channelEmployeeFilter.get(c.channel_id)
      if (allowed === undefined) return false
      if (allowed === null) return true   // no filter
      return allowed.has(e.employee_id)
    })
  }

  const enrollmentIds = (enrollments ?? []).map(e => e.id)
  const enrollmentById = new Map((enrollments ?? []).map(e => [e.id, e]))

  // ── Fetch module progress ─────────────────────────────────────────
  const { data: modProgress } = enrollmentIds.length
    ? await svc.from("training_module_progress")
        .select("enrollment_id, module_id, watched_pct, watch_time_sec, completed, completed_at, last_position_sec, updated_at")
        .in("enrollment_id", enrollmentIds)
    : { data: [] as any[] }

  // ── Fetch quiz attempts ───────────────────────────────────────────
  const { data: attempts } = enrollmentIds.length
    ? await svc.from("training_quiz_attempts")
        .select("enrollment_id, quiz_id, attempt_no, started_at, submitted_at, time_used_sec, score, passed, tab_switches")
        .in("enrollment_id", enrollmentIds)
        .order("submitted_at", { ascending: false })
    : { data: [] as any[] }

  // ── Helper formatters ─────────────────────────────────────────────
  const fmtDT = (s: any) => s ? new Date(s).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" }) : ""
  const fmtD  = (s: any) => s ? new Date(s).toLocaleDateString("th-TH") : ""
  const fmtSec = (s: any) => {
    if (!s) return ""
    const n = Number(s); if (!isFinite(n) || n <= 0) return ""
    const m = Math.floor(n / 60), sec = Math.floor(n % 60)
    return m > 0 ? `${m} น. ${sec} ว.` : `${sec} ว.`
  }
  const statusLabel: Record<string, string> = {
    not_started: "ยังไม่เริ่ม",
    in_progress: "กำลังเรียน",
    completed:   "จบหลักสูตร",
    failed:      "ไม่ผ่าน",
  }
  const empName = (e: any) => {
    const emp = e?.employee
    if (!emp) return ""
    const base = `${emp.first_name_th ?? ""} ${emp.last_name_th ?? ""}`.trim()
    return emp.nickname ? `${base} (${emp.nickname})` : base
  }

  // ────────────────────────────────────────────────────────────────
  // Sheet 1: ภาพรวม
  // ────────────────────────────────────────────────────────────────
  const totalCourses = courses?.length ?? 0
  const publishedCourses = (courses ?? []).filter(c => c.status === "published").length
  const totalEnrolls = enrollments?.length ?? 0
  const completedEnrolls = (enrollments ?? []).filter(e => e.status === "completed").length
  const inProgressEnrolls = (enrollments ?? []).filter(e => e.status === "in_progress").length
  const failedEnrolls = (enrollments ?? []).filter(e => e.status === "failed").length
  const notStartedEnrolls = totalEnrolls - completedEnrolls - inProgressEnrolls - failedEnrolls
  const completionRate = totalEnrolls > 0 ? (completedEnrolls / totalEnrolls) * 100 : 0
  const avgProgress = totalEnrolls > 0
    ? (enrollments ?? []).reduce((s, e) => s + Number(e.progress_pct || 0), 0) / totalEnrolls
    : 0
  const scoredEnrolls = (enrollments ?? []).filter(e => e.final_score != null)
  const avgScore = scoredEnrolls.length > 0
    ? scoredEnrolls.reduce((s, e) => s + Number(e.final_score), 0) / scoredEnrolls.length
    : null

  const overviewRows: any[][] = [
    ["รายงานระบบเรียนรู้"],
    [`ออกรายงานเมื่อ: ${new Date().toLocaleString("th-TH")}`],
    [`ขอบเขต: ${access.isTrainingAdmin ? "ทุกช่อง (Training Admin)" : `เฉพาะช่องที่รับผิดชอบ (Supervisor) — ${channels?.length ?? 0} ช่อง`}`],
    channelFilter ? [`กรองเฉพาะช่อง: ${chanById.get(channelFilter)?.name ?? channelFilter}`] : [],
    courseFilter ? [`กรองเฉพาะคอร์ส: ${courseById.get(courseFilter)?.title ?? courseFilter}`] : [],
    [],
    ["ตัวชี้วัด", "ค่า"],
    ["จำนวนช่องทั้งหมด", channels?.length ?? 0],
    ["จำนวนคอร์สทั้งหมด", totalCourses],
    ["คอร์สที่เผยแพร่", publishedCourses],
    ["จำนวนผู้เรียน (ใบลงทะเบียน)", totalEnrolls],
    ["จบหลักสูตร", completedEnrolls],
    ["กำลังเรียน", inProgressEnrolls],
    ["ยังไม่เริ่ม", notStartedEnrolls],
    ["ไม่ผ่าน", failedEnrolls],
    ["อัตราจบหลักสูตร (%)", Number(completionRate.toFixed(2))],
    ["ความคืบหน้าเฉลี่ย (%)", Number(avgProgress.toFixed(2))],
    ["คะแนนเฉลี่ย (%)", avgScore !== null ? Number(avgScore.toFixed(2)) : ""],
    ["จำนวนบทเรียนทั้งหมด", modules?.length ?? 0],
    ["จำนวนควิซทั้งหมด", quizzes?.length ?? 0],
    ["จำนวนครั้งสอบรวม", attempts?.length ?? 0],
  ].filter(r => r.length > 0)

  // ────────────────────────────────────────────────────────────────
  // Sheet 2: ช่อง (Channels)
  // ────────────────────────────────────────────────────────────────
  const enrollsByChannel = new Map<string, any[]>()
  for (const e of enrollments ?? []) {
    const c = courseById.get(e.course_id)
    if (!c) continue
    const list = enrollsByChannel.get(c.channel_id) ?? []
    list.push(e)
    enrollsByChannel.set(c.channel_id, list)
  }
  const coursesByChannel = new Map<string, any[]>()
  for (const c of courses ?? []) {
    const list = coursesByChannel.get(c.channel_id) ?? []
    list.push(c)
    coursesByChannel.set(c.channel_id, list)
  }

  const channelSheet = (channels ?? []).map(ch => {
    const chCourses = coursesByChannel.get(ch.id) ?? []
    const chEnrolls = enrollsByChannel.get(ch.id) ?? []
    const cmp = chEnrolls.filter(e => e.status === "completed").length
    const ip  = chEnrolls.filter(e => e.status === "in_progress").length
    const fl  = chEnrolls.filter(e => e.status === "failed").length
    const ns  = chEnrolls.length - cmp - ip - fl
    const compRate = chEnrolls.length > 0 ? (cmp / chEnrolls.length) * 100 : 0
    const avgProg  = chEnrolls.length > 0
      ? chEnrolls.reduce((s, e) => s + Number(e.progress_pct || 0), 0) / chEnrolls.length
      : 0
    const scored = chEnrolls.filter(e => e.final_score != null)
    const avgScr = scored.length > 0
      ? scored.reduce((s, e) => s + Number(e.final_score), 0) / scored.length
      : null
    return {
      "ช่อง":            ch.name,
      "แบรนด์":          ch.brand ?? "",
      "คำอธิบาย":        ch.description ?? "",
      "คอร์สทั้งหมด":     chCourses.length,
      "คอร์สเผยแพร่":     chCourses.filter(c => c.status === "published").length,
      "ผู้เรียนทั้งหมด":  chEnrolls.length,
      "จบหลักสูตร":      cmp,
      "กำลังเรียน":      ip,
      "ยังไม่เริ่ม":      ns,
      "ไม่ผ่าน":         fl,
      "อัตราจบ (%)":     Number(compRate.toFixed(2)),
      "คืบหน้าเฉลี่ย (%)": Number(avgProg.toFixed(2)),
      "คะแนนเฉลี่ย (%)":  avgScr !== null ? Number(avgScr.toFixed(2)) : "",
      "สร้างเมื่อ":       fmtD(ch.created_at),
    }
  })

  // ────────────────────────────────────────────────────────────────
  // Sheet 3: คอร์ส (Courses)
  // ────────────────────────────────────────────────────────────────
  const enrollsByCourse = new Map<string, any[]>()
  for (const e of enrollments ?? []) {
    const list = enrollsByCourse.get(e.course_id) ?? []
    list.push(e)
    enrollsByCourse.set(e.course_id, list)
  }
  const modulesByCourse = new Map<string, any[]>()
  for (const m of modules ?? []) {
    const list = modulesByCourse.get(m.course_id) ?? []
    list.push(m)
    modulesByCourse.set(m.course_id, list)
  }
  const quizzesByCourse = new Map<string, any[]>()
  for (const q of quizzes ?? []) {
    const list = quizzesByCourse.get(q.course_id) ?? []
    list.push(q)
    quizzesByCourse.set(q.course_id, list)
  }

  const courseSheet = (courses ?? []).map(c => {
    const ch = chanById.get(c.channel_id)
    const cEnrolls = enrollsByCourse.get(c.id) ?? []
    const cmp = cEnrolls.filter(e => e.status === "completed").length
    const ip  = cEnrolls.filter(e => e.status === "in_progress").length
    const fl  = cEnrolls.filter(e => e.status === "failed").length
    const ns  = cEnrolls.length - cmp - ip - fl
    const compRate = cEnrolls.length > 0 ? (cmp / cEnrolls.length) * 100 : 0
    const avgProg  = cEnrolls.length > 0
      ? cEnrolls.reduce((s, e) => s + Number(e.progress_pct || 0), 0) / cEnrolls.length
      : 0
    const scored = cEnrolls.filter(e => e.final_score != null)
    const avgScr = scored.length > 0
      ? scored.reduce((s, e) => s + Number(e.final_score), 0) / scored.length
      : null
    return {
      "คอร์ส":          c.title,
      "ช่อง":           ch?.name ?? "",
      "แบรนด์":         ch?.brand ?? "",
      "สถานะ":          c.status === "published" ? "เผยแพร่"
                       : c.status === "archived" ? "เก็บถาวร" : "ฉบับร่าง",
      "เวอร์ชัน":        c.version,
      "ระดับ":          c.difficulty ?? "",
      "เกณฑ์ผ่าน (%)":   c.passing_score,
      "จำนวนครั้งทำควิซ": c.max_retries,
      "เวลาประเมิน (น.)": c.estimated_minutes ?? "",
      "ผูก KPI":        c.affect_kpi ? "ใช่" : "ไม่",
      "น้ำหนัก KPI (%)": c.affect_kpi ? (c.kpi_weight ?? 0) : "",
      "บทเรียน":         (modulesByCourse.get(c.id) ?? []).length,
      "ควิซ":           (quizzesByCourse.get(c.id) ?? []).length,
      "ผู้เรียนทั้งหมด":  cEnrolls.length,
      "จบหลักสูตร":     cmp,
      "กำลังเรียน":     ip,
      "ยังไม่เริ่ม":     ns,
      "ไม่ผ่าน":        fl,
      "อัตราจบ (%)":    Number(compRate.toFixed(2)),
      "คืบหน้าเฉลี่ย (%)": Number(avgProg.toFixed(2)),
      "คะแนนเฉลี่ย (%)":  avgScr !== null ? Number(avgScr.toFixed(2)) : "",
      "ปิดรับสมัคร":     fmtD(c.close_date),
      "สร้างเมื่อ":      fmtD(c.created_at),
    }
  })

  // ────────────────────────────────────────────────────────────────
  // Sheet 4: ผู้เรียน (Learners — per enrollment)
  // ────────────────────────────────────────────────────────────────
  const modProgByEnrollment = new Map<string, any[]>()
  for (const p of modProgress ?? []) {
    const list = modProgByEnrollment.get(p.enrollment_id) ?? []
    list.push(p)
    modProgByEnrollment.set(p.enrollment_id, list)
  }
  const attemptsByEnrollment = new Map<string, any[]>()
  for (const a of attempts ?? []) {
    const list = attemptsByEnrollment.get(a.enrollment_id) ?? []
    list.push(a)
    attemptsByEnrollment.set(a.enrollment_id, list)
  }

  // Build best-attempt-per-quiz map: (enrollment_id, quiz_id) → best attempt
  const bestByEnrQuiz = new Map<string, any>()
  for (const a of attempts ?? []) {
    if (a.score == null) continue
    const key = `${a.enrollment_id}::${a.quiz_id}`
    const cur = bestByEnrQuiz.get(key)
    if (!cur || Number(a.score) > Number(cur.score)) bestByEnrQuiz.set(key, a)
  }

  const learnerSheet = (enrollments ?? []).map(e => {
    const emp = e.employee as any
    const c = courseById.get(e.course_id)
    const ch = c ? chanById.get(c.channel_id) : null
    const mods = modulesByCourse.get(e.course_id) ?? []
    const cQuizzes = quizzesByCourse.get(e.course_id) ?? []
    const eProg = modProgByEnrollment.get(e.id) ?? []
    const modsDone = eProg.filter(p => p.completed).length
    const totalWatch = eProg.reduce((s, p) => s + (Number(p.watch_time_sec) || 0), 0)
    const eAtts = attemptsByEnrollment.get(e.id) ?? []
    const passedAtts = eAtts.filter(a => a.passed).length
    const totalTabSwitches = eAtts.reduce((s, a) => s + (Number(a.tab_switches) || 0), 0)
    // avg of best score across quizzes the learner has actually attempted
    const bestScores: number[] = []
    for (const q of cQuizzes) {
      const b = bestByEnrQuiz.get(`${e.id}::${q.id}`)
      if (b && b.score != null) bestScores.push(Number(b.score))
    }
    const avgBest = bestScores.length > 0
      ? bestScores.reduce((s, n) => s + n, 0) / bestScores.length
      : null
    return {
      "รหัสพนักงาน":      emp?.employee_code ?? "",
      "ชื่อ-สกุล":         empName(e),
      "ฝ่าย":            emp?.department?.name ?? "",
      "ตำแหน่ง":         emp?.position?.name ?? "",
      "สาขา":            emp?.branch?.name ?? "",
      "แบรนด์":           emp?.brand ?? "",
      "คอร์ส":           c?.title ?? "",
      "ช่อง":            ch?.name ?? "",
      "สถานะ":           statusLabel[e.status] ?? e.status,
      "ความคืบหน้า (%)": Number(Number(e.progress_pct ?? 0).toFixed(2)),
      "บทเรียนที่จบ":     modsDone,
      "บทเรียนทั้งหมด":   mods.length,
      "เวลาดูวิดีโอ":     fmtSec(totalWatch),
      "คะแนนเฉลี่ย best (%)": avgBest !== null ? Number(avgBest.toFixed(2)) : "",
      "คะแนนสุดท้าย (%)": e.final_score != null ? Number(Number(e.final_score).toFixed(2)) : "",
      "ควิซที่ทำ":        bestScores.length,
      "ควิซทั้งหมด":      cQuizzes.length,
      "ครั้งสอบรวม":     eAtts.length,
      "ครั้งที่ผ่าน":      passedAtts,
      "สลับแท็บรวม":     totalTabSwitches,
      "ลงทะเบียน":       fmtDT(e.enrolled_at),
      "เปิดล่าสุด":       fmtDT(e.last_accessed_at),
      "จบเมื่อ":         fmtDT(e.completed_at),
    }
  })

  // ────────────────────────────────────────────────────────────────
  // Sheet: สรุปคะแนน (Best score per quiz per learner — long format)
  // ────────────────────────────────────────────────────────────────
  const scoreSummaryRows: any[] = []
  for (const e of enrollments ?? []) {
    const emp = (e as any).employee
    const c = courseById.get(e.course_id)
    const ch = c ? chanById.get(c.channel_id) : null
    const cQuizzes = quizzesByCourse.get(e.course_id) ?? []
    for (const q of cQuizzes) {
      const allForQuiz = (attemptsByEnrollment.get(e.id) ?? []).filter(a => a.quiz_id === q.id)
      const best = bestByEnrQuiz.get(`${e.id}::${q.id}`)
      const m = q.module_id ? moduleById.get(q.module_id) : null
      const tabSw = allForQuiz.reduce((s, a) => s + (Number(a.tab_switches) || 0), 0)
      const lastSubmitted = allForQuiz
        .filter(a => a.submitted_at)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())[0]
      scoreSummaryRows.push({
        "รหัสพนักงาน":     emp?.employee_code ?? "",
        "ชื่อ-สกุล":        empName(e),
        "ฝ่าย":            emp?.department?.name ?? "",
        "ตำแหน่ง":         emp?.position?.name ?? "",
        "คอร์ส":           c?.title ?? "",
        "ช่อง":            ch?.name ?? "",
        "บทเรียน":         m ? m.title : "(ควิซรวม / Final)",
        "ควิซ":            q.title,
        "จำนวนข้อ":        q.question_count ?? "",
        "เกณฑ์ผ่าน (%)":    q.passing_score,
        "จำนวนครั้งที่ทำ":   allForQuiz.length,
        "คะแนนดีที่สุด (%)":  best?.score != null ? Number(Number(best.score).toFixed(2)) : "",
        "ผลลัพธ์":          best ? (best.passed ? "ผ่าน" : "ไม่ผ่าน") : (allForQuiz.length > 0 ? "ยังไม่ส่ง" : "ยังไม่ทำ"),
        "สลับแท็บรวม":      tabSw,
        "ความคืบหน้าคอร์ส (%)": Number(Number(e.progress_pct ?? 0).toFixed(2)),
        "สถานะคอร์ส":       statusLabel[e.status] ?? e.status,
        "ครั้งล่าสุดเมื่อ":    fmtDT(lastSubmitted?.submitted_at),
      })
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Sheet 5: บทเรียน (Module Progress — per learner per module)
  // ────────────────────────────────────────────────────────────────
  const modProgRows: any[] = []
  for (const e of enrollments ?? []) {
    const emp = (e as any).employee
    const c = courseById.get(e.course_id)
    const mods = modulesByCourse.get(e.course_id) ?? []
    const progByMod = new Map<string, any>()
    for (const p of modProgByEnrollment.get(e.id) ?? []) progByMod.set(p.module_id, p)
    for (const m of mods) {
      const p = progByMod.get(m.id)
      const required = Number(m.required_watch_pct ?? 80)
      const watched  = Number(p?.watched_pct ?? 0)
      const passed   = watched >= required
      modProgRows.push({
        "รหัสพนักงาน":     emp?.employee_code ?? "",
        "ชื่อ-สกุล":        empName(e),
        "คอร์ส":          c?.title ?? "",
        "ลำดับบท":        m.order_no,
        "บทเรียน":         m.title,
        "ประเภท":         m.content_type ?? "",
        "วิดีโอ (ว.)":     m.video_duration_sec ?? "",
        "เกณฑ์ดู (%)":     required,
        "ดูแล้ว (%)":      Number(watched.toFixed(2)),
        "เวลาดู":         fmtSec(p?.watch_time_sec),
        "ผ่านเกณฑ์":       p?.completed ? "ใช่" : passed ? "ถึงเกณฑ์ (ยังต้องทำควิซ)" : "ไม่",
        "ตำแหน่งล่าสุด":   fmtSec(p?.last_position_sec),
        "บันทึกล่าสุด":    fmtDT(p?.updated_at),
        "จบบทเมื่อ":       fmtDT(p?.completed_at),
      })
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Sheet 6: ควิซ (Quiz Attempts)
  // ────────────────────────────────────────────────────────────────
  const quizSheet = (attempts ?? []).map(a => {
    const e = enrollmentById.get(a.enrollment_id)
    const emp = (e as any)?.employee
    const c = e ? courseById.get(e.course_id) : null
    const q = quizById.get(a.quiz_id)
    const m = q?.module_id ? moduleById.get(q.module_id) : null
    const best = bestByEnrQuiz.get(`${a.enrollment_id}::${a.quiz_id}`)
    const isBest = best && best.attempt_no === a.attempt_no
    return {
      "รหัสพนักงาน":      emp?.employee_code ?? "",
      "ชื่อ-สกุล":         e ? empName(e) : "",
      "คอร์ส":            c?.title ?? "",
      "บทเรียน":          m ? m.title : "(ควิซรวม)",
      "ควิซ":             q?.title ?? "",
      "ครั้งที่":           a.attempt_no,
      "คะแนน (%)":         a.score != null ? Number(Number(a.score).toFixed(2)) : "",
      "เกณฑ์ผ่าน (%)":      q?.passing_score ?? "",
      "ผ่าน":             a.passed === true ? "ผ่าน" : a.submitted_at ? "ไม่ผ่าน" : "ยังไม่ส่ง",
      "คะแนนดีที่สุด":      isBest ? "✓" : "",
      "ใช้เวลา":           fmtSec(a.time_used_sec),
      "สลับแท็บ":          a.tab_switches ?? 0,
      "เริ่มทำ":           fmtDT(a.started_at),
      "ส่งเมื่อ":           fmtDT(a.submitted_at),
    }
  })

  // ────────────────────────────────────────────────────────────────
  // Build workbook
  // ────────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  const wsOv = XLSX.utils.aoa_to_sheet(overviewRows)
  wsOv["!cols"] = [{ wch: 40 }, { wch: 24 }]
  XLSX.utils.book_append_sheet(wb, wsOv, "ภาพรวม")

  const wsCh = XLSX.utils.json_to_sheet(channelSheet.length ? channelSheet : [{ "ช่อง": "(ไม่มีข้อมูล)" }])
  wsCh["!cols"] = autoCols(channelSheet)
  XLSX.utils.book_append_sheet(wb, wsCh, "ช่อง")

  const wsCs = XLSX.utils.json_to_sheet(courseSheet.length ? courseSheet : [{ "คอร์ส": "(ไม่มีข้อมูล)" }])
  wsCs["!cols"] = autoCols(courseSheet)
  XLSX.utils.book_append_sheet(wb, wsCs, "คอร์ส")

  const wsLn = XLSX.utils.json_to_sheet(learnerSheet.length ? learnerSheet : [{ "รหัสพนักงาน": "(ไม่มีข้อมูล)" }])
  wsLn["!cols"] = autoCols(learnerSheet)
  XLSX.utils.book_append_sheet(wb, wsLn, "ผู้เรียน")

  const wsSs = XLSX.utils.json_to_sheet(scoreSummaryRows.length ? scoreSummaryRows : [{ "ควิซ": "(ไม่มีข้อมูล)" }])
  wsSs["!cols"] = autoCols(scoreSummaryRows)
  XLSX.utils.book_append_sheet(wb, wsSs, "สรุปคะแนน")

  const wsMp = XLSX.utils.json_to_sheet(modProgRows.length ? modProgRows : [{ "บทเรียน": "(ไม่มีข้อมูล)" }])
  wsMp["!cols"] = autoCols(modProgRows)
  XLSX.utils.book_append_sheet(wb, wsMp, "บทเรียน")

  const wsQz = XLSX.utils.json_to_sheet(quizSheet.length ? quizSheet : [{ "ควิซ": "(ไม่มีข้อมูล)" }])
  wsQz["!cols"] = autoCols(quizSheet)
  XLSX.utils.book_append_sheet(wb, wsQz, "ควิซ")

  const buf: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })

  const now = new Date()
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`
  const suffix = courseFilter ? `_course-${(courseById.get(courseFilter)?.title || courseFilter).slice(0, 30)}`
              : channelFilter ? `_channel-${(chanById.get(channelFilter)?.name || channelFilter).slice(0, 30)}`
              : ""
  const filename = `training_report${suffix}_${stamp}.xlsx`

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

// Auto-size columns by header & first 50 rows
function autoCols(rows: any[]) {
  if (!rows || rows.length === 0) return [{ wch: 24 }]
  const keys = Object.keys(rows[0])
  return keys.map(k => {
    let max = String(k).length
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const v = rows[i]?.[k]
      const len = v == null ? 0 : String(v).length
      if (len > max) max = len
    }
    return { wch: Math.min(Math.max(max + 2, 10), 40) }
  })
}
