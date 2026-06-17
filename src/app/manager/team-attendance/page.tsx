"use client"
import { useEffect, useState, useCallback, useMemo } from "react"
import {
  Loader2, RefreshCw, ChevronLeft, ChevronRight, Users, GitBranch,
  Camera, MapPin, Clock, LogIn, LogOut, Eye, X, Search,
  AlertCircle, CheckCircle2, CalendarDays, Plane, XCircle, ArrowLeft, ChevronDown,
} from "lucide-react"
import { format, addMonths, subMonths, getDay, getDaysInMonth, startOfMonth } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

type Member = {
  id: string
  employee_code: string
  full_name: string
  full_name_en?: string
  department: string | null
  position: string | null
  avatar_url: string | null
  employment_status?: string
  company_id?: string
  depth: number
}
type AttRec = {
  id: string
  employee_id: string
  work_date: string
  clock_in: string | null
  clock_out: string | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  clock_in_photo_url: string | null
  clock_out_photo_url: string | null
  clock_in_address: string | null
  clock_out_address: string | null
  clock_in_with_photo: boolean
  clock_out_with_photo: boolean
  is_offsite_in: boolean
  is_offsite_out: boolean
  offsite_in_status: string | null
  offsite_out_status: string | null
  late_minutes: number
  early_out_minutes: number
  work_minutes: number
  ot_minutes: number
  status: string
}
type Summary = {
  present: number; late: number; absent: number; early_out: number; on_leave: number
  normal_count: number; offsite_count: number; with_photo_count: number
  total_late_min: number; total_work_min: number; total_early_min: number; total_ot_min: number
  days_with_record: number
}
type Leave = { employee_id: string; start_date: string; end_date: string; status: string; leave_type: { name: string } | null; is_half_day?: boolean; half_day_period?: string }
type Holiday = { date: string; name: string; company_id?: string }

const STATUS_TH: Record<string, string> = {
  present: "มาทำงาน", late: "มาสาย", absent: "ขาดงาน",
  early_out: "ออกก่อน", leave: "ลา", holiday: "วันหยุด", wfh: "WFH",
}
const CAL_BG: Record<string, string> = {
  present:   "bg-indigo-100 text-indigo-700",
  late:      "bg-amber-100  text-amber-700",
  absent:    "bg-red-100    text-red-500",
  early_out: "bg-orange-100 text-orange-600",
  leave:     "bg-purple-100 text-purple-600",
  wfh:       "bg-violet-100 text-violet-700",
}

// ── default month: ถ้าวันนี้ > 21 ใช้รอบถัดไป ──
function getCurrentPeriodDate(): Date {
  const now = new Date()
  if (now.getDate() > 21) return new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}

function pad(n: number) { return String(n).padStart(2, "0") }
function monthKey(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}` }
function todayBKK() { return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" }) }

export default function TeamAttendancePage() {
  const [mode, setMode] = useState<"direct" | "chain">("direct")
  const [month, setMonth] = useState(() => new Date(2026, 0, 1))
  const [hydrated, setHydrated] = useState(false)
  const [members, setMembers] = useState<Member[]>([])
  const [records, setRecords] = useState<AttRec[]>([])
  const [summary, setSummary] = useState<{ [id: string]: Summary }>({})
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [leaves, setLeaves] = useState<Leave[]>([])
  const [calendar, setCalendar] = useState<{ start: string; end: string } | null>(null)
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [previewImg, setPreviewImg] = useState<{ url: string; meta?: string } | null>(null)

  useEffect(() => { setMonth(getCurrentPeriodDate()); setHydrated(true) }, [])

  const fetchData = useCallback(async () => {
    if (!hydrated) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ mode, month: monthKey(month) })
      const res = await fetch(`/api/manager/team-attendance?${params}`)
      const data = await res.json()
      if (data.success) {
        setMembers(data.members || [])
        setRecords(data.records || [])
        setSummary(data.summary || {})
        setHolidays(data.holidays || [])
        setLeaves(data.leaves || [])
        setCalendar(data.calendar)
        setPeriod(data.period)
      } else {
        toast.error(data.error || "โหลดข้อมูลไม่สำเร็จ")
      }
    } catch {
      toast.error("โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [mode, month, hydrated])

  useEffect(() => { fetchData() }, [fetchData])

  // ── filter members by search ──
  const filteredMembers = useMemo(() => {
    const lc = q.toLowerCase().trim()
    if (!lc) return members
    return members.filter(m =>
      m.full_name.toLowerCase().includes(lc) ||
      m.employee_code?.toLowerCase().includes(lc) ||
      (m.department || "").toLowerCase().includes(lc)
    )
  }, [members, q])

  // ── group records / holidays / leaves by employee ──
  const recordsByEmp = useMemo(() => {
    const map: { [id: string]: AttRec[] } = {}
    for (const r of records) {
      if (!map[r.employee_id]) map[r.employee_id] = []
      map[r.employee_id].push(r)
    }
    return map
  }, [records])

  const holidayMapByCompany = useMemo(() => {
    const map: { [companyId: string]: { [date: string]: string } } = {}
    for (const h of holidays) {
      const cid = h.company_id || "all"
      if (!map[cid]) map[cid] = {}
      map[cid][h.date] = h.name
    }
    return map
  }, [holidays])

  const leaveMapByEmp = useMemo(() => {
    const map: { [id: string]: { [date: string]: { type: string; status: string; isHalf?: boolean } } } = {}
    for (const l of leaves) {
      if (!map[l.employee_id]) map[l.employee_id] = {}
      let cur = l.start_date
      while (cur <= l.end_date) {
        map[l.employee_id][cur] = {
          type: l.leave_type?.name || "ลา",
          status: l.status,
          isHalf: l.is_half_day,
        }
        const d = new Date(cur + "T00:00:00")
        d.setDate(d.getDate() + 1)
        cur = format(d, "yyyy-MM-dd")
      }
    }
    return map
  }, [leaves])

  const periodLabel = period ? (() => {
    try {
      const s = new Date(period.start + "T00:00:00")
      const e = new Date(period.end + "T00:00:00")
      return `${format(s, "d MMM", { locale: th })} – ${format(e, "d MMM yy", { locale: th })}`
    } catch { return "" }
  })() : ""

  // ── overall team stats (period only) ──
  const overall = useMemo(() => {
    let p = 0, l = 0, a = 0, lv = 0, n = 0, off = 0, ph = 0
    for (const s of Object.values(summary)) {
      p += s.present; l += s.late; a += s.absent; lv += s.on_leave
      n += s.normal_count; off += s.offsite_count; ph += s.with_photo_count
    }
    return { present: p, late: l, absent: a, leave: lv, normal: n, offsite: off, with_photo: ph }
  }, [summary])

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-violet-50/30 pb-6">
      <style dangerouslySetInnerHTML={{ __html: `
        .cal-day { transition: transform 0.12s ease; }
        .cal-day:active { transform: scale(0.92); }
        @keyframes fadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .35s ease both; }
      ` }} />

      {/* ═════ Header ═════ */}
      <div className="sticky top-[51px] z-20 bg-white/95 backdrop-blur border-b border-slate-100 px-4 pt-3 pb-2.5 space-y-2.5 shadow-sm">
        <div className="flex items-center gap-2">
          {selectedMember ? (
            <button onClick={() => setSelectedMember(null)}
              className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 active:scale-95">
              <ArrowLeft size={14} />
            </button>
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}>
              <Users size={16} className="text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-black text-slate-800 leading-tight truncate">
              {selectedMember ? selectedMember.full_name : "การเข้างานของทีม"}
            </h1>
            <p className="text-[10px] text-slate-400 truncate">
              {selectedMember
                ? `${selectedMember.department || "—"} · ${selectedMember.position || "—"}`
                : "ปฏิทินตามรอบเงินเดือน · ดูเช็คอินแบบปกติ / นอกสถานที่ / แนบรูป"}
            </p>
          </div>
          <button onClick={fetchData}
            className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 active:scale-95">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* mode toggle — ซ่อนใน drill-in */}
        {!selectedMember && (
          <div className="flex gap-1.5">
            <button onClick={() => setMode("direct")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11.5px] font-bold border transition-all ${
                mode === "direct" ? "bg-indigo-50 border-indigo-200 text-indigo-700" : "bg-slate-50 border-slate-100 text-slate-400"
              }`}>
              <Users size={12} /> ลูกน้องตรง
            </button>
            <button onClick={() => setMode("chain")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[11.5px] font-bold border transition-all ${
                mode === "chain" ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-slate-50 border-slate-100 text-slate-400"
              }`}>
              <GitBranch size={12} /> ตามสายทั้งหมด
            </button>
          </div>
        )}

        {/* month nav */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl px-2 py-1.5">
          <button onClick={() => setMonth(m => subMonths(m, 1))}
            className="w-7 h-7 rounded-lg active:bg-white flex items-center justify-center text-slate-500">
            <ChevronLeft size={14} />
          </button>
          <div className="text-center">
            <p className="text-[12px] font-black text-slate-800 leading-none">
              {format(month, "MMMM yyyy", { locale: th })}
            </p>
            <p className="text-[9px] text-indigo-600 font-bold mt-0.5">
              รอบเงินเดือน {periodLabel}
            </p>
          </div>
          <button onClick={() => setMonth(m => addMonths(m, 1))}
            disabled={format(addMonths(month, 1), "yyyy-MM") > format(getCurrentPeriodDate(), "yyyy-MM")}
            className="w-7 h-7 rounded-lg active:bg-white flex items-center justify-center text-slate-500 disabled:opacity-25">
            <ChevronRight size={14} />
          </button>
        </div>

        {/* search — ซ่อนใน drill-in */}
        {!selectedMember && (
          <div className="relative">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ / รหัส / แผนก"
              className="w-full pl-7 pr-2 py-1.5 rounded-lg border border-slate-200 text-[11.5px] text-slate-700 placeholder-slate-300 outline-none focus:border-indigo-300" />
          </div>
        )}
      </div>

      {/* ═════ Content ═════ */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={22} className="animate-spin text-slate-300" />
        </div>
      ) : selectedMember ? (
        <MemberDetail
          member={selectedMember}
          records={recordsByEmp[selectedMember.id] || []}
          summary={summary[selectedMember.id]}
          leaveMap={leaveMapByEmp[selectedMember.id] || {}}
          holidayMap={holidayMapByCompany[selectedMember.company_id || "all"] || {}}
          calendar={calendar}
          period={period}
          month={month}
          selectedDay={selectedDay}
          onSelectDay={setSelectedDay}
          onPreview={setPreviewImg}
        />
      ) : (
        <>
          {/* ── Overall summary ── */}
          <div className="px-4 mt-3 grid grid-cols-3 gap-2 fade-up">
            <Chip label="ทีม" value={filteredMembers.length} color="bg-slate-100 text-slate-700" icon={<Users size={11} />} />
            <Chip label="ปกติ" value={overall.normal} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 size={11} />} />
            <Chip label="แนบรูป" value={overall.with_photo} color="bg-indigo-50 text-indigo-600" icon={<Camera size={11} />} />
            <Chip label="นอกสถานที่" value={overall.offsite} color="bg-orange-50 text-orange-600" icon={<MapPin size={11} />} />
            <Chip label="สาย" value={overall.late} color="bg-amber-50 text-amber-600" icon={<Clock size={11} />} />
            <Chip label="ขาด" value={overall.absent} color="bg-red-50 text-red-500" icon={<AlertCircle size={11} />} />
          </div>

          {/* ── Member list ── */}
          <div className="px-4 mt-3 space-y-2">
            {filteredMembers.length === 0 ? (
              <div className="text-center py-12">
                <Users size={28} className="text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-400">
                  {members.length === 0 ? "ยังไม่มีลูกน้อง" : "ไม่พบจากคำค้น"}
                </p>
              </div>
            ) : (
              filteredMembers.map(m => (
                <MemberRow
                  key={m.id}
                  member={m}
                  summary={summary[m.id]}
                  records={recordsByEmp[m.id] || []}
                  leaveMap={leaveMapByEmp[m.id] || {}}
                  holidayMap={holidayMapByCompany[m.company_id || "all"] || {}}
                  calendar={calendar}
                  period={period}
                  onOpen={() => { setSelectedMember(m); setSelectedDay(null) }}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* ═════ Image preview ═════ */}
      {previewImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setPreviewImg(null)}>
          <button onClick={() => setPreviewImg(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white">
            <X size={18} />
          </button>
          <div className="relative max-w-md w-full" onClick={e => e.stopPropagation()}>
            <img src={previewImg.url} alt="" className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl" />
            {previewImg.meta && <p className="text-center text-white/80 text-xs mt-2 font-medium">{previewImg.meta}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className={`rounded-xl p-2.5 ${color}`}>
      <div className="flex items-center gap-1 text-[10px] font-bold uppercase opacity-80">{icon}{label}</div>
      <p className="text-base font-black mt-0.5 leading-none">{value}</p>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// MemberRow — แสดงสรุป + mini-strip ของวันในเดือน
// ────────────────────────────────────────────────────────────────
function MemberRow({
  member, summary, records, leaveMap, holidayMap, calendar, period, onOpen,
}: {
  member: Member; summary?: Summary; records: AttRec[]
  leaveMap: { [date: string]: { type: string; status: string; isHalf?: boolean } }
  holidayMap: { [date: string]: string }
  calendar: { start: string; end: string } | null
  period: { start: string; end: string } | null
  onOpen: () => void
}) {
  const recMap = useMemo(() => Object.fromEntries(records.map(r => [r.work_date, r])), [records])

  // mini-strip — แสดงเฉพาะวันในรอบเงินเดือน
  const stripDays = useMemo(() => {
    if (!period) return []
    const out: Array<{ date: string; status: string; pill: string; hasPhoto: boolean; hasOffsite: boolean }> = []
    const start = new Date(period.start + "T00:00:00")
    const end = new Date(period.end + "T00:00:00")
    const todayStr = todayBKK()
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const ds = format(d, "yyyy-MM-dd")
      const rec = recMap[ds]
      const hol = holidayMap[ds]
      const dow = getDay(d)
      const wknd = dow === 0 || dow === 6
      const isFut = ds > todayStr
      const lv = leaveMap[ds]
      const hasLeave = lv && (lv.status === "approved" || lv.status === "pending")

      let pill = "bg-slate-100", status = ""
      if (hol)         { pill = "bg-rose-200"; status = "holiday" }
      else if (isFut)  { pill = "bg-slate-50"; status = "future" }
      else if (rec) {
        const eff = rec.clock_in && rec.status === "absent" ? "present" : rec.status
        status = eff
        pill = eff === "present"  ? "bg-indigo-300"
             : eff === "late"     ? "bg-amber-400"
             : eff === "early_out" ? "bg-orange-300"
             : eff === "absent"   ? "bg-red-300"
             : eff === "leave"    ? "bg-purple-300"
             : "bg-slate-200"
      }
      else if (hasLeave) { pill = "bg-purple-300"; status = "leave" }
      else if (wknd)   { pill = "bg-slate-100"; status = "weekend" }
      else             { pill = "bg-red-200"; status = "absent" }

      out.push({
        date: ds, status, pill,
        hasPhoto: !!(rec && (rec.clock_in_with_photo || rec.clock_out_with_photo)),
        hasOffsite: !!(rec && (rec.is_offsite_in || rec.is_offsite_out)),
      })
    }
    return out
  }, [period, recMap, holidayMap, leaveMap])

  const s = summary
  const workHr = s ? Math.floor(s.total_work_min / 60) : 0

  return (
    <button onClick={onOpen} className="w-full text-left bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm active:bg-slate-50 transition-colors">
      {/* top */}
      <div className="flex items-center gap-3 px-3.5 py-3">
        {member.avatar_url
          ? <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
          : <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black text-sm shrink-0">
              {member.full_name?.[0] || "?"}
            </div>}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-bold text-slate-800 truncate">{member.full_name}</p>
            {member.depth > 1 && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-violet-50 text-violet-600">L{member.depth}</span>}
          </div>
          <p className="text-[10px] text-slate-400 truncate">{member.department || "—"} · {member.position || "—"}</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 shrink-0" />
      </div>

      {/* mini strip */}
      {stripDays.length > 0 && (
        <div className="px-3.5 pb-2 flex gap-[3px] flex-wrap">
          {stripDays.map(d => (
            <div key={d.date} className={`relative h-3.5 flex-1 min-w-[6px] rounded-sm ${d.pill}`}
              title={`${d.date} — ${d.status}`}>
              {d.hasPhoto && <div className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-indigo-600" />}
              {d.hasOffsite && !d.hasPhoto && <div className="absolute -top-0.5 -right-0.5 w-1 h-1 rounded-full bg-orange-500" />}
            </div>
          ))}
        </div>
      )}

      {/* summary chips */}
      {s && (
        <div className="px-3.5 pb-3 flex flex-wrap gap-1">
          <ChipSmall color="bg-emerald-50 text-emerald-700">มา {s.present + s.late + s.early_out}</ChipSmall>
          {s.late > 0 && <ChipSmall color="bg-amber-50 text-amber-700">สาย {s.late}</ChipSmall>}
          {s.absent > 0 && <ChipSmall color="bg-red-50 text-red-600">ขาด {s.absent}</ChipSmall>}
          {s.on_leave > 0 && <ChipSmall color="bg-violet-50 text-violet-700">ลา {s.on_leave}</ChipSmall>}
          {s.with_photo_count > 0 && <ChipSmall color="bg-indigo-50 text-indigo-700"><Camera size={9} className="inline mr-0.5" />{s.with_photo_count}</ChipSmall>}
          {s.offsite_count > 0 && <ChipSmall color="bg-orange-50 text-orange-700"><MapPin size={9} className="inline mr-0.5" />{s.offsite_count}</ChipSmall>}
          <ChipSmall color="bg-slate-50 text-slate-500">{workHr} ชม.</ChipSmall>
          {s.total_late_min > 0 && <ChipSmall color="bg-rose-50 text-rose-600">{s.total_late_min} น.</ChipSmall>}
        </div>
      )}
    </button>
  )
}

function ChipSmall({ children, color }: { children: React.ReactNode; color: string }) {
  return <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>{children}</span>
}

// ────────────────────────────────────────────────────────────────
// MemberDetail — calendar เต็มเดือน + รายการเช็คอิน
// ────────────────────────────────────────────────────────────────
function MemberDetail({
  member, records, summary, leaveMap, holidayMap, calendar, period, month, selectedDay, onSelectDay, onPreview,
}: {
  member: Member; records: AttRec[]; summary?: Summary
  leaveMap: { [date: string]: { type: string; status: string; isHalf?: boolean } }
  holidayMap: { [date: string]: string }
  calendar: { start: string; end: string } | null
  period: { start: string; end: string } | null
  month: Date
  selectedDay: string | null
  onSelectDay: (d: string | null) => void
  onPreview: (p: { url: string; meta?: string }) => void
}) {
  const recMap = useMemo(() => Object.fromEntries(records.map(r => [r.work_date, r])), [records])
  const today = todayBKK()

  const periodLabel = period ? (() => {
    try {
      const s = new Date(period.start + "T00:00:00")
      const e = new Date(period.end + "T00:00:00")
      return `${format(s, "d MMM", { locale: th })} – ${format(e, "d MMM yy", { locale: th })}`
    } catch { return "" }
  })() : ""

  const dayInPeriod = (ds: string) => period && ds >= period.start && ds <= period.end
  const s = summary

  // record ของวันที่เลือก
  const selectedRec = selectedDay ? recMap[selectedDay] : null

  return (
    <div className="px-4 mt-3 space-y-3 fade-up">
      {/* ── Period summary ── */}
      {s && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">สรุปรอบ {periodLabel}</p>
          <div className="grid grid-cols-4 gap-2">
            <Mini c="text-indigo-600" v={s.present + s.late + s.early_out} l="มา" />
            <Mini c="text-amber-600" v={s.late} l="สาย" />
            <Mini c="text-red-500" v={s.absent} l="ขาด" />
            <Mini c="text-violet-600" v={s.on_leave} l="ลา" />
            <Mini c="text-indigo-600" v={s.with_photo_count} l="แนบรูป" />
            <Mini c="text-orange-600" v={s.offsite_count} l="นอก" />
            <Mini c="text-emerald-600" v={s.normal_count} l="ปกติ" />
            <Mini c="text-slate-600" v={`${Math.floor(s.total_work_min / 60)}ชม`} l="ทำงาน" />
          </div>
          {(s.total_late_min > 0 || s.total_early_min > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
              {s.total_late_min > 0 && <ChipSmall color="bg-amber-50 text-amber-700">สายรวม {s.total_late_min} นาที</ChipSmall>}
              {s.total_early_min > 0 && <ChipSmall color="bg-orange-50 text-orange-700">ออกก่อนรวม {s.total_early_min} นาที</ChipSmall>}
              {s.total_ot_min > 0 && <ChipSmall color="bg-purple-50 text-purple-700">OT {Math.floor(s.total_ot_min / 60)}:{pad(s.total_ot_min % 60)} ชม.</ChipSmall>}
            </div>
          )}
        </div>
      )}

      {/* ── Calendar ── */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-black text-slate-700">{format(month, "MMMM yyyy", { locale: th })}</p>
          <div className="flex gap-2 text-[8.5px] font-bold">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-300" />รอบเงินเดือน</span>
          </div>
        </div>

        {/* legend */}
        <div className="flex flex-wrap gap-x-2 gap-y-1 mb-2">
          {[
            { c: "bg-indigo-100 text-indigo-700", l: "มา" },
            { c: "bg-amber-100 text-amber-700", l: "สาย" },
            { c: "bg-red-100 text-red-500", l: "ขาด" },
            { c: "bg-orange-100 text-orange-600", l: "ออกก่อน" },
            { c: "bg-purple-100 text-purple-600", l: "ลา" },
            { c: "bg-rose-100 text-rose-600", l: "หยุด" },
          ].map(x => (
            <span key={x.l} className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${x.c}`}>{x.l}</span>
          ))}
        </div>

        {/* day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map(d => (
            <div key={d} className="text-center text-[9px] font-black text-slate-400">{d}</div>
          ))}
        </div>

        {/* grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array(getDay(startOfMonth(month))).fill(null).map((_, i) => <div key={"e" + i} />)}
          {Array.from({ length: getDaysInMonth(month) }, (_, i) => {
            const day = i + 1
            const ds = format(new Date(month.getFullYear(), month.getMonth(), day), "yyyy-MM-dd")
            const rec = recMap[ds]
            const hol = holidayMap[ds]
            const isT = ds === today
            const isFut = ds > today
            const dow = getDay(new Date(ds + "T00:00:00"))
            const wknd = dow === 0 || dow === 6
            const lv = leaveMap[ds]
            const hasLeave = lv && (lv.status === "approved" || lv.status === "pending")
            const isVAbs = !isFut && ds !== today && !wknd && !hol && !rec && !hasLeave
            const inPeriod = dayInPeriod(ds)
            const isSelected = selectedDay === ds

            const recStatus = rec && rec.clock_in && rec.status === "absent" ? "present" : rec?.status
            const hasPhoto = !!(rec && (rec.clock_in_with_photo || rec.clock_out_with_photo))
            const hasOffsite = !!(rec && (rec.is_offsite_in || rec.is_offsite_out))

            let cls = "", sub = ""
            if (isSelected) { cls = "bg-slate-900 text-white shadow-md" }
            else if (isT)    { cls = "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-md" }
            else if (hol)    { cls = "bg-rose-100 text-rose-600"; sub = "หยุด" }
            else if (isFut)  { cls = "text-slate-300" }
            else if (rec)    { cls = CAL_BG[recStatus] ?? "bg-slate-100 text-slate-500"; sub = (STATUS_TH[recStatus] || "").slice(0, 2) }
            else if (hasLeave) { cls = "bg-purple-100 text-purple-600"; sub = lv.status === "pending" ? "รอ" : "ลา" }
            else if (isVAbs) { cls = "bg-red-100 text-red-500"; sub = "ขาด" }
            else if (wknd)   { cls = "text-slate-300" }
            else             { cls = "text-slate-400" }

            const ringForPeriod = !inPeriod ? "opacity-50" : ""

            return (
              <button key={day} type="button"
                onClick={() => onSelectDay(isSelected ? null : ds)}
                className={`cal-day aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-bold relative ${cls} ${ringForPeriod}`}>
                <span>{day}</span>
                {sub && <span className="text-[7px] leading-none mt-0.5 font-semibold">{sub}</span>}
                {(hasPhoto || hasOffsite) && (
                  <div className={`absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full ${hasPhoto ? "bg-indigo-600" : "bg-orange-500"}`} />
                )}
              </button>
            )
          })}
        </div>

        <p className="text-[9px] text-slate-400 mt-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 align-middle mr-1" />แนบรูป
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500 align-middle ml-2 mr-1" />นอกสถานที่
          · กดวันที่เพื่อดูรายละเอียด
        </p>
      </div>

      {/* ── Selected day detail ── */}
      {selectedDay && (
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100 fade-up">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[12px] font-black text-slate-800">
              {format(new Date(selectedDay + "T00:00:00"), "EEEE d MMM yyyy", { locale: th })}
            </p>
            <button onClick={() => onSelectDay(null)} className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center">
              <X size={12} className="text-slate-500" />
            </button>
          </div>
          {selectedRec ? (
            <RecordDetail r={selectedRec} fullName={member.full_name} onPreview={onPreview} />
          ) : holidayMap[selectedDay] ? (
            <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1.5"><CalendarDays size={12} /> {holidayMap[selectedDay]}</p>
          ) : leaveMap[selectedDay] ? (
            <p className="text-[11px] text-purple-600 font-bold flex items-center gap-1.5">
              <Plane size={12} /> {leaveMap[selectedDay].type} ({leaveMap[selectedDay].status === "pending" ? "รออนุมัติ" : "อนุมัติแล้ว"})
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              {selectedDay > today ? "ยังไม่ถึงวันที่นี้" : "ไม่มีบันทึก (ขาดงาน)"}
            </p>
          )}
        </div>
      )}

      {/* ── List of records this period (newest first) ── */}
      {!selectedDay && records.filter(r => dayInPeriod(r.work_date)).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1">ประวัติในรอบนี้</p>
          <div className="space-y-2">
            {records.filter(r => dayInPeriod(r.work_date)).map(r => (
              <CompactRecord key={r.id} r={r} fullName={member.full_name} onPreview={onPreview} onOpenDay={() => onSelectDay(r.work_date)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Mini({ c, v, l }: { c: string; v: number | string; l: string }) {
  return (
    <div>
      <p className={`text-base font-black leading-none ${c}`}>{v}</p>
      <p className="text-[9px] text-slate-400 font-medium mt-0.5">{l}</p>
    </div>
  )
}

function RecordDetail({ r, fullName, onPreview }: { r: AttRec; fullName: string; onPreview: (p: { url: string; meta?: string }) => void }) {
  const kindLabel =
    r.clock_in_with_photo || r.clock_out_with_photo ? { l: "แนบรูป", c: "bg-indigo-100 text-indigo-700" }
    : r.is_offsite_in || r.is_offsite_out ? { l: "นอกสถานที่", c: "bg-orange-100 text-orange-700" }
    : { l: "ปกติ", c: "bg-emerald-100 text-emerald-700" }

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${kindLabel.c}`}>{kindLabel.l}</span>
        <span className="text-[10px] text-slate-500 font-bold">
          {r.work_minutes > 0 && `${Math.floor(r.work_minutes / 60)}:${pad(r.work_minutes % 60)} ชม.`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <TimeBlock isIn={true} time={r.clock_in} photo={r.clock_in_photo_url} address={r.clock_in_address}
          lat={r.clock_in_lat} lng={r.clock_in_lng}
          extra={r.late_minutes > 0 ? `สาย ${r.late_minutes} นาที` : null} extraColor="text-amber-600"
          status={r.is_offsite_in ? r.offsite_in_status : null}
          onPreview={(url) => onPreview({ url, meta: `${fullName} · เช็คอิน` })} />
        <TimeBlock isIn={false} time={r.clock_out} photo={r.clock_out_photo_url} address={r.clock_out_address}
          lat={r.clock_out_lat} lng={r.clock_out_lng}
          extra={r.early_out_minutes > 0 ? `ออกก่อน ${r.early_out_minutes} นาที` : null} extraColor="text-orange-600"
          status={r.is_offsite_out ? r.offsite_out_status : null}
          onPreview={(url) => onPreview({ url, meta: `${fullName} · เช็คเอ้าท์` })} />
      </div>
    </>
  )
}

function CompactRecord({ r, fullName, onPreview, onOpenDay }: { r: AttRec; fullName: string; onPreview: (p: { url: string; meta?: string }) => void; onOpenDay: () => void }) {
  const kindLabel =
    r.clock_in_with_photo || r.clock_out_with_photo ? { l: "แนบรูป", c: "text-indigo-600" }
    : r.is_offsite_in || r.is_offsite_out ? { l: "นอกสถานที่", c: "text-orange-600" }
    : { l: "ปกติ", c: "text-emerald-600" }
  return (
    <button onClick={onOpenDay} className="w-full text-left bg-white rounded-xl border border-slate-100 p-2.5 active:bg-slate-50">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-slate-50 flex flex-col items-center justify-center shrink-0">
          <span className="text-[8px] text-slate-400 font-bold leading-none">{format(new Date(r.work_date + "T00:00:00"), "MMM", { locale: th })}</span>
          <span className="text-[12px] font-black text-slate-700 leading-none mt-0.5">{format(new Date(r.work_date + "T00:00:00"), "d")}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px]">
            <span className={`font-bold ${kindLabel.c}`}>{kindLabel.l}</span>
            {r.late_minutes > 0 && <span className="text-amber-600 font-bold">· สาย {r.late_minutes}น</span>}
            {r.early_out_minutes > 0 && <span className="text-orange-600 font-bold">· ออกก่อน {r.early_out_minutes}น</span>}
          </div>
          <p className="text-[10.5px] text-slate-500 mt-0.5">
            <LogIn size={9} className="inline mr-0.5 text-emerald-500" />
            {r.clock_in ? format(new Date(r.clock_in), "HH:mm") : "—"}
            <span className="mx-1.5 text-slate-300">·</span>
            <LogOut size={9} className="inline mr-0.5 text-rose-500" />
            {r.clock_out ? format(new Date(r.clock_out), "HH:mm") : "—"}
          </p>
        </div>
        {(r.clock_in_photo_url || r.clock_out_photo_url) && (
          <img src={r.clock_in_photo_url || r.clock_out_photo_url || ""} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
        )}
        <ChevronRight size={12} className="text-slate-300 shrink-0" />
      </div>
    </button>
  )
}

function TimeBlock({ isIn, time, photo, address, lat, lng, extra, extraColor, status, onPreview }: {
  isIn: boolean; time: string | null; photo: string | null; address: string | null
  lat: number | null; lng: number | null; extra: string | null; extraColor?: string
  status?: string | null; onPreview: (url: string) => void
}) {
  if (!time) {
    return (
      <div className="bg-slate-50 rounded-lg p-2 flex items-center justify-center min-h-[64px]">
        <span className="text-[10px] text-slate-300 font-medium">{isIn ? "ยังไม่เช็คอิน" : "ยังไม่เช็คเอ้าท์"}</span>
      </div>
    )
  }
  return (
    <div className={`rounded-lg p-2 ${isIn ? "bg-emerald-50/40" : "bg-rose-50/40"}`}>
      <div className="flex items-center gap-2">
        {photo ? (
          <button onClick={() => onPreview(photo)} className="relative w-11 h-11 rounded-md overflow-hidden bg-slate-100 shrink-0">
            <img src={photo} alt="" className="w-full h-full object-cover" />
          </button>
        ) : (
          <div className="w-11 h-11 rounded-md bg-slate-50 shrink-0 flex items-center justify-center text-slate-300">
            {isIn ? <LogIn size={14} /> : <LogOut size={14} />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-[11px] font-black ${isIn ? "text-emerald-700" : "text-rose-700"}`}>
            {format(new Date(time), "HH:mm:ss")}
          </p>
          {extra && <p className={`text-[9px] font-bold ${extraColor || "text-slate-500"}`}>{extra}</p>}
          {status && (
            <p className={`text-[9px] font-bold ${
              status === "approved" ? "text-emerald-600"
              : status === "rejected" ? "text-red-500" : "text-amber-600"
            }`}>
              {status === "approved" ? "✓ อนุมัติ" : status === "rejected" ? "✗ ปฏิเสธ" : "⏳ รออนุมัติ"}
            </p>
          )}
        </div>
      </div>
      {address && (
        <div className="mt-1.5 flex items-start gap-1 text-[9px] text-slate-500">
          <MapPin size={9} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{address}</span>
        </div>
      )}
      {!address && lat && lng && (
        <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
          className="mt-1.5 flex items-center gap-1 text-[9px] text-indigo-500 hover:underline">
          <MapPin size={9} /> {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
        </a>
      )}
    </div>
  )
}
