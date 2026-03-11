"use client"
import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { formatTime } from "@/lib/utils/attendance"
import Link from "next/link"
import { Clock, ChevronRight, FileEdit, Timer, CalendarClock, AlertCircle } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

// ─── Quotes per day ──────────────────────────────────────────
const QUOTES: Record<number, string[]> = {
  0: [ // อาทิตย์
    "วันอาทิตย์ไม่ต้องตื่นเช้า ถ้าตื่นเช้าแสดงว่าเป็น PM",
    "วันหยุดที่ดีต้องมีนอนเกินเที่ยง อย่างน้อยหนึ่งมื้อ",
    "การพักผ่อนคือการลงทุนที่คืนทุนเร็วที่สุด",
    "โทรศัพท์ปิดเสียง กายบนโซฟา ใจสงบ — นั่นคือสวรรค์",
    "วันอาทิตย์สอนให้รู้ว่า เราก็มีตัวตนนอกจากพนักงาน",
    "ถ้าชีวิตเป็นหนัง วันอาทิตย์คือฉากพักโฆษณา",
  ],
  1: [ // จันทร์
    "วันจันทร์ก็เหมือนกาแฟ ขมนิดหน่อยแต่ทำให้ตื่น",
    "ยิ้มสู้จันทร์สิ มันจะได้ไม่กลับมาเร็ว",
    "จันทร์มาอีกแล้ว แต่เราก็ผ่านมาทุกครั้ง",
    "แรงบันดาลใจหายไปวันจันทร์? ปกติมาก",
    "สัปดาห์ใหม่ บทเรียนใหม่ ค่าจ้างเดิม",
    "จันทร์ไม่ใช่ศัตรู มันแค่... มาเร็วไปหน่อย",
    "กาแฟ + จันทร์ = ยังไหวอยู่",
  ],
  2: [ // อังคาร
    "อังคารไฟแรง จันทร์ผ่านมาได้แล้ว!",
    "วันอังคารคือหลักฐานว่าคุณไม่ยอมแพ้วันจันทร์",
    "ถ้าผ่านจันทร์มาได้ อังคารก็แค่เรื่องเล็ก",
    "อังคาร — วันที่เงียบสงบที่สุดของสัปดาห์ ไม่มีใครพูดถึงมัน",
    "ไฟแรงวันอังคาร ดีกว่าหมดแรงวันพุธ",
    "สู้ๆ อีกสามวันก็ศุกร์แล้ว",
  ],
  3: [ // พุธ
    "พุธ = ครึ่งทาง อีกครึ่งทางนั้นง่ายกว่า",
    "กึ่งกลางสัปดาห์! ชีวิตยังดีอยู่",
    "วันพุธคือจุดสูงสุดของภูเขาแห่งสัปดาห์ ข้างหน้าลงเขา",
    "ผ่านกึ่งกลางมาได้แล้ว ทริปท้ายสัปดาห์กำลังรอ",
    "พุธ: วันที่กาแฟทำงานหนักที่สุด",
    "เกินครึ่งสัปดาห์แล้ว ไม่มีอะไรหยุดคุณได้แล้ว",
  ],
  4: [ // พฤหัส
    "พฤหัสฯ คือศุกร์ก่อนวัย ใจต้องถึงก่อน",
    "เกือบถึงแล้ว! ศุกร์อยู่ข้างหน้า",
    "วันพฤหัสฯ คือแสงสว่างปลายอุโมงค์สัปดาห์",
    "อีกวันเดียว! กำหมัดไว้",
    "พฤหัสฯ บอกว่า ศุกร์กำลังมา",
    "สู้ไปอีกหนึ่งวัน แล้วจะเข้าใจว่าทำไมถึงทน",
    "ใกล้ๆ แล้ว เหนื่อยหน่อยแต่ถึง",
  ],
  5: [ // ศุกร์
    "ศุกร์แล้วว!! มาไกลมากนะเพื่อน",
    "TGIF — Thank God It's Friday 🙏",
    "ศุกร์เที่ยงคืองานบ้าน ศุกร์เย็นคืองานปาร์ตี้",
    "วันนี้ทำงานด้วยแรงบวกของวันหยุด",
    "ศุกร์มาแล้ว ทุกอย่างดูเบาลงทันที",
    "เส้นชัยอยู่ตรงหน้า วิ่งเลย!",
    "อีกไม่กี่ชั่วโมง... อิสระ",
    "ศุกร์: วันที่ประสิทธิภาพสูงที่สุดช่วง 17:00-17:30 น.",
  ],
  6: [ // เสาร์
    "เสาร์ที่ดีไม่ต้องทำอะไร นอนก็คืองาน",
    "วันหยุดที่ดีต้องมีนอนอย่างน้อยหนึ่งรอบ",
    "เสาร์คือวันที่ alarm ต้องหยุดพัก",
    "พักผ่อนเยอะๆ นะ จันทร์ยังอีกไกล",
    "วันนี้ห้ามคิดเรื่องงาน — ไม่ฟัง ไม่รู้ ไม่สน",
    "ชาร์จพลังให้เต็ม สัปดาห์หน้ายังต้องสู้",
    "เสาร์: วันที่ทุกอย่างสามารถรอได้",
  ],
}

// ─── Day Visual Config ───────────────────────────────────────
const DAY_VISUAL = [
  { // อาทิตย์ — dreamy lavender dusk
    grad:    ["#c084fc","#f472b6","#fb923c"],
    orbs:    ["#e879f9","#f9a8d4","#fdba74"],
    emoji:   "🌸",
    tag:     "วันหยุด",
    tagBg:   "bg-pink-400/30",
  },
  { // จันทร์ — crisp morning sky
    grad:    ["#38bdf8","#818cf8","#6366f1"],
    orbs:    ["#7dd3fc","#a5b4fc","#c7d2fe"],
    emoji:   "☁️",
    tag:     "เริ่มสัปดาห์",
    tagBg:   "bg-sky-400/30",
  },
  { // อังคาร — warm energy
    grad:    ["#fb923c","#f43f5e","#e11d48"],
    orbs:    ["#fca5a5","#fda4af","#fed7aa"],
    emoji:   "🔥",
    tag:     "ลุยเลย",
    tagBg:   "bg-rose-400/30",
  },
  { // พุธ — midweek forest
    grad:    ["#34d399","#10b981","#0d9488"],
    orbs:    ["#6ee7b7","#99f6e4","#a7f3d0"],
    emoji:   "🌿",
    tag:     "กึ่งกลาง",
    tagBg:   "bg-emerald-400/30",
  },
  { // พฤหัส — deep violet dusk
    grad:    ["#818cf8","#a855f7","#7c3aed"],
    orbs:    ["#c4b5fd","#d8b4fe","#e9d5ff"],
    emoji:   "⭐",
    tag:     "เกือบถึงแล้ว",
    tagBg:   "bg-violet-400/30",
  },
  { // ศุกร์ — golden hour celebration
    grad:    ["#fbbf24","#f97316","#ef4444"],
    orbs:    ["#fde68a","#fed7aa","#fecaca"],
    emoji:   "🎉",
    tag:     "ศุกร์!",
    tagBg:   "bg-amber-400/30",
  },
  { // เสาร์ — midnight calm
    grad:    ["#6366f1","#3b82f6","#0ea5e9"],
    orbs:    ["#a5b4fc","#bfdbfe","#bae6fd"],
    emoji:   "😴",
    tag:     "วันหยุด",
    tagBg:   "bg-blue-400/30",
  },
]

const DAY_NAMES = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"]

// ─── Animated Background Canvas ─────────────────────────────
function AnimBg({ v }: { v: typeof DAY_VISUAL[0] }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* main gradient */}
      <div className="absolute inset-0"
        style={{ background:`linear-gradient(135deg,${v.grad[0]},${v.grad[1]},${v.grad[2]})` }}/>
      {/* shimmer overlay */}
      <div className="absolute inset-0 opacity-30"
        style={{ background:"radial-gradient(ellipse at 20% 20%,rgba(255,255,255,0.4),transparent 50%)" }}/>
      {/* animated orbs */}
      {v.orbs.map((c, i) => (
        <div key={i}
          className="absolute rounded-full mix-blend-soft-light"
          style={{
            width:  [140,100,80][i],
            height: [140,100,80][i],
            background: `radial-gradient(circle,${c},transparent 70%)`,
            top:    ["10%","55%","30%"][i],
            left:   ["60%","15%","75%"][i],
            animation: `orb${i+1} ${[8,12,10][i]}s ease-in-out infinite`,
            opacity: 0.7,
          }}/>
      ))}
      {/* grid lines */}
      <div className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage:"linear-gradient(rgba(255,255,255,0.8) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.8) 1px,transparent 1px)", backgroundSize:"40px 40px" }}/>
      {/* bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-16"
        style={{ background:"linear-gradient(to bottom,transparent,rgba(0,0,0,0.15))" }}/>
    </div>
  )
}

// ─── Main Greeting Card ──────────────────────────────────────
function DayCard({ name }: { name?: string }) {
  const dow    = new Date().getDay()
  const v      = DAY_VISUAL[dow]
  const quotes = QUOTES[dow]
  const [quote, setQuote] = useState("")
  const [fade, setFade]   = useState(true)

  // สุ่ม quote ตอน mount
  useEffect(() => {
    setQuote(quotes[Math.floor(Math.random() * quotes.length)])
  }, [dow])

  // สุ่มใหม่ทุก 8 วิ พร้อม fade
  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setQuote(quotes[Math.floor(Math.random() * quotes.length)])
        setFade(true)
      }, 400)
    }, 8000)
    return () => clearInterval(id)
  }, [dow])

  const hour = new Date().getHours()
  const greet = hour < 6 ? "ดึกแล้วนะ 🌙" : hour < 12 ? "อรุณสวัสดิ์ ☀️" : hour < 17 ? "สวัสดีตอนบ่าย 🌤️" : "สวัสดีตอนเย็น 🌆"

  return (
    <div className="relative rounded-3xl overflow-hidden shadow-2xl" style={{ minHeight: 188 }}>
      <AnimBg v={v}/>

      {/* top row */}
      <div className="relative z-10 flex items-start justify-between px-5 pt-5">
        <div>
          <p className="text-white/70 text-[11px] font-medium tracking-widest uppercase mb-0.5">
            {format(new Date(),"d MMMM yyyy",{locale:th})}
          </p>
          <p className="text-white/80 text-xs">{greet}</p>
        </div>
        {/* day tag */}
        <div className={`${v.tagBg} backdrop-blur-md border border-white/20 rounded-2xl px-3 py-1.5 flex items-center gap-1.5`}>
          <span className="text-base leading-none">{v.emoji}</span>
          <span className="text-white text-xs font-bold">{v.tag}</span>
        </div>
      </div>

      {/* name */}
      <div className="relative z-10 px-5 pt-3 pb-2">
        <div className="flex items-end gap-2">
          <h2 className="text-white font-black leading-none" style={{ fontSize: 28, textShadow:"0 2px 12px rgba(0,0,0,0.2)" }}>
            {name?.split(" ")[0] || "สวัสดี"}
          </h2>
          <span className="text-white/80 text-base mb-0.5">วัน{DAY_NAMES[dow]}</span>
        </div>
      </div>

      {/* quote bubble */}
      <div className="relative z-10 mx-5 mb-5">
        <div className="bg-black/20 backdrop-blur-sm border border-white/15 rounded-2xl px-4 py-3"
          style={{ transition: "opacity 0.4s ease", opacity: fade ? 1 : 0 }}>
          <p className="text-white/95 text-[12px] leading-relaxed italic">
            "{quote}"
          </p>
          {/* tap to shuffle hint */}
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ───────────────────────────────────────────────
export default function DashboardPage() {
  const { user }  = useAuth()
  const { todayRecord, records } = useAttendance(user?.employee_id)
  const { balances } = useLeaveBalance(user?.employee_id)
  const isWeekend = [0,6].includes(new Date().getDay())

  const stats = {
    present: records.filter(r => ["present","late"].includes(r.status)).length,
    late:    records.filter(r => r.status === "late").length,
    absent:  records.filter(r => r.status === "absent").length,
  }

  return (
    <>
      <style>{`
        @keyframes orb1 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(-20px,15px) scale(1.1)} }
        @keyframes orb2 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(15px,-20px) scale(0.9)} }
        @keyframes orb3 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-10px,10px) scale(1.05)} 66%{transform:translate(10px,-5px) scale(0.95)} }
      `}</style>

      <div className="p-4 space-y-3 pb-8">

        {/* ── Day Card ── */}
        <DayCard name={user?.employee?.first_name_th}/>

        {/* ── Weekend Banner ── */}
        {isWeekend && (
          <div className="rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 px-4 py-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-xl flex-shrink-0">🛋️</div>
            <div>
              <p className="font-bold text-indigo-700 text-sm">วันนี้วันหยุด!</p>
              <p className="text-xs text-indigo-400 mt-0.5">ไม่ต้องเช็คอิน พักผ่อนให้เต็มที่เลย 😌</p>
            </div>
          </div>
        )}

        {/* ── Today status ── */}
        {!isWeekend && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">สถานะวันนี้</p>
              <Link href="/app/checkin" className="text-xs text-blue-500 font-semibold flex items-center gap-1">
                ไปหน้าเช็คอิน <ChevronRight size={11}/>
              </Link>
            </div>
            {todayRecord ? (
              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {[
                  { label:"เข้างาน",  val:formatTime(todayRecord.clock_in)||"—",  c:"text-blue-600"   },
                  { label:"ออกงาน",   val:formatTime(todayRecord.clock_out)||"—", c:"text-emerald-600"},
                  { label:"สาย",      val:todayRecord.late_minutes>0?`${todayRecord.late_minutes}น.`:"ปกติ",
                    c:todayRecord.late_minutes>0?"text-orange-500":"text-slate-400"},
                ].map(s => (
                  <div key={s.label} className="px-4 py-4 text-center">
                    <p className="text-[10px] text-slate-400 mb-1">{s.label}</p>
                    <p className={`text-lg font-black tabular-nums leading-none ${s.c}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-5 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">⏰</div>
                <div className="flex-1">
                  <p className="font-bold text-slate-700 text-sm">ยังไม่ได้เช็คอิน</p>
                  <p className="text-xs text-slate-400 mt-0.5">อย่าลืมเช็คอินก่อนเริ่มงานนะ</p>
                </div>
                <Link href="/app/checkin"
                  className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-200 active:scale-95 transition-all">
                  <Clock size={12}/> เช็คอิน
                </Link>
              </div>
            )}
          </div>
        )}

        {/* ── ลืมเช็คเอ้าท์ ── */}
        {todayRecord?.clock_in && !todayRecord?.clock_out && !isWeekend && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <AlertCircle size={15} className="text-blue-500"/>
            </div>
            <p className="text-sm text-blue-800 flex-1 font-medium">ยังไม่ได้เช็คเอ้าท์นะ</p>
            <Link href="/app/leave/new?type=adjustment"
              className="text-xs font-bold text-blue-600 bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl whitespace-nowrap hover:bg-blue-200 transition-colors">
              แจ้งเวลา →
            </Link>
          </div>
        )}

        {/* ── Stats เดือนนี้ ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">สถิติเดือนนี้</p>
            <Link href="/app/attendance" className="text-xs text-blue-500 font-semibold">ดูประวัติ →</Link>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100">
            {[
              { label:"มาแล้ว",  val:stats.present, dot:"bg-blue-500",    num:"text-blue-600",    sub:"วัน" },
              { label:"มาสาย",   val:stats.late,    dot:"bg-sky-400",     num:"text-sky-600",     sub:"ครั้ง" },
              { label:"ขาดงาน",  val:stats.absent,  dot:"bg-slate-300",   num:"text-slate-500",   sub:"วัน" },
            ].map(s => (
              <div key={s.label} className="py-4 text-center">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>
                  <p className="text-[10px] text-slate-400">{s.label}</p>
                </div>
                <p className={`text-2xl font-black leading-none tabular-nums ${s.num}`}>{s.val}</p>
                <p className="text-[10px] text-slate-300 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Salary shortcut card ── */}
        <Link href="/app/salary" className="block active:scale-[0.98] transition-all">
          <div className="relative rounded-2xl overflow-hidden shadow-lg shadow-sky-200/60"
            style={{ background:"linear-gradient(135deg,#38bdf8 0%,#38bdf8 50%,#0ea5e9 100%)" }}>
            {/* shimmer dots */}
            <div className="absolute top-3 right-16 w-1.5 h-1.5 rounded-full bg-white/50"/>
            <div className="absolute bottom-4 right-28 w-2 h-2 rounded-full bg-white/30"/>
            <div className="absolute top-1/2 right-10 w-1 h-1 rounded-full bg-white/40"/>
            {/* content */}
            <div className="flex items-center gap-4 px-4 py-4">
              {/* icon box */}
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:"rgba(255,255,255,0.45)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.6)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 10l10 6 10-6"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white text-sm leading-tight">สรุปเงินเดือน</p>
                <p className="text-white/70 text-xs mt-0.5">ดูรายได้ การหัก และกราฟรายเดือน</p>
              </div>
              {/* arrow */}
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background:"rgba(255,255,255,0.5)", border:"1px solid rgba(255,255,255,0.7)" }}>
                <ChevronRight size={15} className="text-white"/>
              </div>
            </div>
          </div>
        </Link>

        {/* ── Leave balance ── */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">โควต้าการลา</p>
            <Link href="/app/leave" className="text-xs text-blue-500 font-semibold">ดูทั้งหมด →</Link>
          </div>
          <div className="space-y-3">
            {balances.slice(0,3).map(b => (
              <div key={b.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor:b.leave_type?.color_hex||"#3b82f6" }}/>
                    <span className="text-sm text-slate-600">{b.leave_type?.name}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700 tabular-nums">
                    {b.remaining_days}<span className="text-slate-300 font-normal text-xs">/{b.entitled_days} วัน</span>
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width:`${b.entitled_days>0?Math.min(b.used_days/b.entitled_days*100,100):0}%`,
                    backgroundColor:b.leave_type?.color_hex||"#3b82f6"
                  }}/>
                </div>
              </div>
            ))}
            {balances.length===0 && <p className="text-xs text-slate-300 text-center py-2">ไม่มีข้อมูล</p>}
          </div>
        </div>

        {/* ── Quick actions 2x2 grid ── */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 tracking-widest uppercase mb-2 px-1">ทำรายการ</p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { href:"/app/leave/new",                  icon:<CalendarClock size={16}/>, label:"ยื่นใบลา",         desc:"ป่วย กิจ พักร้อน",        bg:"bg-blue-600",    shadow:"shadow-blue-200"   },
              { href:"/app/leave/new?type=adjustment",  icon:<FileEdit size={16}/>,      label:"แก้ไขเวลา",        desc:"เวลาเข้า-ออกผิดพลาด",    bg:"bg-sky-500",     shadow:"shadow-sky-200"    },
              { href:"/app/leave/new?type=overtime",    icon:<Timer size={16}/>,          label:"ขอโอที",            desc:"บันทึกเวลาล่วงเวลา",     bg:"bg-indigo-500",  shadow:"shadow-indigo-200" },
              { href:"/app/attendance",                 icon:<Clock size={16}/>,          label:"ประวัติเข้างาน",   desc:"ดูสถิติย้อนหลัง",        bg:"bg-slate-600",   shadow:"shadow-slate-200"  },
            ] as {href:string;icon:React.ReactNode;label:string;desc:string;bg:string;shadow:string}[]).map(a=>(
              <Link key={a.href} href={a.href}
                className={`${a.bg} rounded-2xl p-4 shadow-lg ${a.shadow} flex flex-col gap-2 active:scale-95 transition-all`}>
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-white">{a.icon}</div>
                <div>
                  <p className="text-white font-bold text-sm leading-tight">{a.label}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </>
  )
}