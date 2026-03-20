"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useAttendance } from "@/lib/hooks/useAttendance"
import { useLeaveBalance } from "@/lib/hooks/useLeave"
import { formatTime } from "@/lib/utils/attendance"
import Link from "next/link"
import {
  Clock, ChevronRight, FileEdit, Timer, CalendarClock,
  AlertCircle, Shield, Users, TrendingUp, CalendarDays,
  Wallet, MapPin, LogOut, Sparkles, UserX, CheckCircle,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const DAY_CFG = [
  { gradient:"linear-gradient(135deg,#8b5cf6 0%,#a855f7 50%,#c084fc 100%)", accent:"#8b5cf6", tag:"วันหยุด 🌸", shadow:"rgba(139,92,246,.3)", quotes:[
    "วันอาทิตย์ไม่ต้องตื่นเช้า ถ้าตื่นเช้าแสดงว่าเป็น PM 😴",
    "โทรศัพท์ปิดเสียง กายบนโซฟา ใจสงบ 🛋️",
    "การพักผ่อนคือการลงทุนที่คืนทุนเร็วที่สุด 💤",
    "วันนี้ไม่มี meeting ไม่มี deadline มีแต่ความสุข 🌈",
    "นอนดึกได้เพราะพรุ่งนี้ก็ยังวันหยุด 🌙",
    "ชาร์จพลังให้เต็ม จันทร์นี้พร้อมสู้ 🔋",
    "ทำอาหารเอง ดูซีรีส์ ใช้ชีวิต 🍳",
    "วันอาทิตย์คือของขวัญที่ดีที่สุดของสัปดาห์ 🎁",
    "ปล่อยให้ตัวเองขี้เกียจได้บ้าง มันโอเคมาก 🐢",
    "ออกไปรับแดดอ่อนๆ แค่นั้นก็ดีแล้ว ☀️",
  ]},
  { gradient:"linear-gradient(135deg,#3b82f6 0%,#6366f1 50%,#8b5cf6 100%)", accent:"#3b82f6", tag:"เริ่มสัปดาห์ ☁️", shadow:"rgba(59,130,246,.3)", quotes:[
    "วันจันทร์ก็เหมือนกาแฟ ขมนิดหน่อยแต่ทำให้ตื่น ☕",
    "กาแฟ + จันทร์ = ยังไหวอยู่ 💪",
    "สัปดาห์ใหม่ บทเรียนใหม่ 📖",
    "จันทร์ไม่ได้น่ากลัว ถ้าคุณมีแผนที่ดี 🗺️",
    "เริ่มต้นดี ปลายทางย่อมดี 🚀",
    "ทุกจันทร์คือโอกาสใหม่ที่ซ่อนอยู่ 🌱",
    "อย่าคิดถึงศุกร์ตั้งแต่จันทร์ ใช้ชีวิตทีละวัน 🗓️",
    "จันทร์นี้เป็นจุดเริ่มต้นของความสำเร็จ 🏆",
    "ยิ้มให้จันทร์ก่อน จันทร์จะยิ้มตอบ 😊",
    "ถ้าผ่านจันทร์ได้ทุกอย่างก็ง่ายขึ้น 🎯",
  ]},
  { gradient:"linear-gradient(135deg,#f97316 0%,#ef4444 50%,#f43f5e 100%)", accent:"#f97316", tag:"ลุยเลย 🔥", shadow:"rgba(249,115,22,.3)", quotes:[
    "อังคารไฟแรง จันทร์ผ่านมาได้แล้ว! 🥊",
    "ถ้าผ่านจันทร์มาได้ อังคารก็แค่เรื่องเล็ก 😤",
    "สู้ๆ อีกสามวันก็ศุกร์แล้ว 🎉",
    "อังคารคือวันที่ขยันที่สุดในสัปดาห์ 💼",
    "ไฟมาแล้ว ลุยเลย ไม่มีหยุด 🔥",
    "วันนี้ต้องดีกว่าเมื่อวาน เริ่มเลย! ⚡",
    "อังคารคือวันที่ความฝันเริ่มกลายเป็นจริง 🌠",
    "กดไม่หยุด วันนี้ต้องปิดงานให้ได้ 🎯",
    "พลังเต็มถัง ออกรถเลย 🏎️",
    "ทำมากกว่าที่คาดหวัง ผลลัพธ์จะน่าประหลาดใจ 🌟",
  ]},
  { gradient:"linear-gradient(135deg,#10b981 0%,#14b8a6 50%,#06b6d4 100%)", accent:"#10b981", tag:"กึ่งกลาง 🌿", shadow:"rgba(16,185,129,.3)", quotes:[
    "พุธ = ครึ่งทาง อีกครึ่งทางง่ายกว่า 🏔️",
    "วันพุธคือยอดเขา ข้างหน้าลงเขา 🎿",
    "พุธ: วันที่กาแฟทำงานหนักที่สุด ☕",
    "ครึ่งทางแล้ว อย่าหยุดตอนนี้! 🏁",
    "พุธคือวันที่ดีที่สุดสำหรับการทบทวนเป้าหมาย 🎯",
    "ถึงกลางสัปดาห์แล้ว คุณทำได้ดีมาก 👏",
    "กึ่งกลางระหว่างสองสุดสัปดาห์ ใจชื้นขึ้นได้แล้ว 🌿",
    "พุธนี้เป็นวันที่ก้าวกระโดด ไม่ใช่ก้าวเล็กๆ 🦘",
    "หมดแรงนิดหน่อยก็ไม่เป็นไร พักแล้วลุยต่อ 🌱",
    "ทุกขั้นตอนสำคัญ แม้แต่ขั้นกลางๆ 🧩",
  ]},
  { gradient:"linear-gradient(135deg,#6366f1 0%,#818cf8 50%,#a78bfa 100%)", accent:"#6366f1", tag:"เกือบถึง ⭐", shadow:"rgba(99,102,241,.3)", quotes:[
    "พฤหัสฯ คือแสงสว่างปลายอุโมงค์ 🌟",
    "อีกวันเดียว! กำหมัดไว้ 👊",
    "ใกล้ๆ แล้ว เหนื่อยหน่อยแต่ถึง 🏅",
    "พรุ่งนี้ศุกร์แล้ว ทนได้แน่นอน 🎊",
    "พฤหัสฯ คือการบอกว่าคุณชนะแล้ว 90% 🏆",
    "อีกนิดเดียว ห้ามถอย! 💥",
    "พฤหัสนี้คือวันที่ความฝันอยู่ใกล้มือ ✨",
    "คุณมาไกลมากแล้ว อย่าหยุดตอนนี้ 🚀",
    "เหลือแค่ก้าวสุดท้าย ก้าวเลย 👣",
    "พฤหัสฯ คือวันที่นับถอยหลังสู่ศุกร์ ⏳",
  ]},
  { gradient:"linear-gradient(135deg,#f59e0b 0%,#f97316 50%,#ef4444 100%)", accent:"#f59e0b", tag:"ศุกร์!! 🎉", shadow:"rgba(245,158,11,.3)", quotes:[
    "ศุกร์แล้วว!! มาไกลมากนะเพื่อน 🎊",
    "TGIF — Thank God It's Friday 🙌",
    "ศุกร์: วันที่ประสิทธิภาพสูงสุดช่วง 17:00–17:30 น. 😂",
    "ทำงานให้เสร็จ แล้วออกไปฉลอง! 🥂",
    "ศุกร์นี้คุณทำได้ดีมากตลอดสัปดาห์ 🏆",
    "วันที่ทุกคนรอ มาถึงแล้ว!! 🎉",
    "กาแฟแก้วสุดท้ายของสัปดาห์ ดื่มแบบจุใจ ☕",
    "ศุกร์บ่ายเป็นช่วงเวลาที่ดีที่สุด 🌅",
    "ปิดงานให้หมด แล้วไปพัก! ✅",
    "ศุกร์คือรางวัลของคนที่สู้มาทั้งสัปดาห์ 🥇",
  ]},
  { gradient:"linear-gradient(135deg,#0ea5e9 0%,#06b6d4 50%,#14b8a6 100%)", accent:"#0ea5e9", tag:"วันหยุด 😴", shadow:"rgba(14,165,233,.3)", quotes:[
    "เสาร์คือวันที่ alarm ต้องหยุดพัก ⏰",
    "พักผ่อนเยอะๆ นะ จันทร์ยังอีกไกล 🌙",
    "วันนี้ห้ามคิดเรื่องงาน เด็ดขาด 🚫",
    "เสาร์คือวันที่ breakfast เป็น brunch ได้ 🥞",
    "ออกไปเที่ยว หรือนอนอยู่บ้านก็ดีทั้งนั้น 🏖️",
    "เสาร์นี้ทำในสิ่งที่รักสักอย่าง 🎨",
    "วันหยุดไม่ต้องรีบ ชีวิตไม่ได้มีแต่งาน 🌸",
    "ชาร์จแบตตัวเอง เหมือนชาร์จโทรศัพท์ 🔋",
    "เสาร์สบายๆ กาแฟร้อนๆ วิวดีๆ ☕",
    "วันนี้เวลาเป็นของคุณ ทำอะไรก็ได้ที่ชอบ 🌈",
  ]},
]
const DOW_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"]

export default function DashboardPage() {
  const { user } = useAuth()
  const { todayRecord, records } = useAttendance(user?.employee_id)
  const { balances } = useLeaveBalance(user?.employee_id)

  const role = (user as any)?.role || ""
  const emp  = user?.employee as any
  const isManager = ["manager","hr_admin","super_admin"].includes(role)
  const isAdmin   = ["hr_admin","super_admin"].includes(role)

  const [tick,    setTick]    = useState<Date|null>(null)
  const [mounted, setMounted] = useState(false)
  const [quote,   setQuote]   = useState("")
  const [qFade,   setQFade]   = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTick(new Date())
    setTimeout(() => setVisible(true), 60)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const now      = tick ?? new Date()
  const dow      = now.getDay()
  const cfg      = DAY_CFG[dow]
  const isWeekend = [0,6].includes(dow)

  useEffect(() => {
    if (!mounted) return
    setQuote(cfg.quotes[Math.floor(Math.random() * cfg.quotes.length)])
    const id = setInterval(() => {
      setQFade(false)
      setTimeout(() => {
        setQuote(q => { const qs=cfg.quotes; return qs[(qs.indexOf(q)+1)%qs.length] })
        setQFade(true)
      }, 350)
    }, 7000)
    return () => clearInterval(id)
  }, [dow, mounted]) // eslint-disable-line react-hooks/exhaustive-deps

  const hour     = now.getHours()
  /* ── Time-based greetings with unique emojis ── */
  const timeGreet = hour < 5
    ? { text:"ดึกแล้วนะ",       emoji:"🌙", sub:"พักผ่อนบ้างนะ" }
    : hour < 7
    ? { text:"ตื่นเช้าจัง",      emoji:"🌅", sub:"เริ่มต้นวันใหม่" }
    : hour < 9
    ? { text:"อรุณสวัสดิ์",      emoji:"☀️", sub:"วันนี้จะเป็นวันที่ดี" }
    : hour < 12
    ? { text:"สวัสดีตอนสาย",     emoji:"🌤️", sub:"สู้ๆ นะวันนี้" }
    : hour < 13
    ? { text:"พักเที่ยงก่อน",    emoji:"🍜", sub:"เติมพลังกันเถอะ" }
    : hour < 15
    ? { text:"สวัสดีตอนบ่าย",    emoji:"🌻", sub:"บ่ายนี้สดใส" }
    : hour < 17
    ? { text:"เกือบเย็นแล้ว",    emoji:"🧡", sub:"อีกนิดเดียว" }
    : hour < 19
    ? { text:"สวัสดีตอนเย็น",    emoji:"🌇", sub:"เย็นนี้ผ่อนคลาย" }
    : hour < 21
    ? { text:"ค่ำแล้ว",          emoji:"🌆", sub:"พักผ่อนได้แล้ว" }
    : { text:"ราตรีสวัสดิ์",     emoji:"🌜", sub:"ฝันดีนะ" }
  const greet = timeGreet.text
  const liveTime = mounted ? format(now, "HH:mm:ss") : "──:──:──"

  const present    = records.filter((r: any) => ["present","late"].includes(r.status)).length
  const late       = records.filter((r: any) => r.status === "late").length
  const absent     = records.filter((r: any) => r.status === "absent").length
  const totalLeave = balances.reduce((s:number,b:any) => s+(b.remaining_days??0), 0)

  const up = (d:number) => ({
    style: {
      opacity:   visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition:`opacity .5s cubic-bezier(.22,1,.36,1) ${d}ms, transform .5s cubic-bezier(.22,1,.36,1) ${d}ms`,
    }
  })

  /* ring helper for SVG circles */
  const Ring = ({ size, stroke, pct, color, bg }: { size:number; stroke:number; pct:number; color:string; bg:string }) => {
    const r = (size - stroke) / 2
    const c = Math.PI * 2 * r
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ position:"absolute", inset:0 }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={bg} strokeWidth={stroke}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${c * pct} ${c}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ transition:"stroke-dasharray 1s cubic-bezier(.22,1,.36,1)" }}/>
      </svg>
    )
  }

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Noto Sans Thai', sans-serif; }
        @keyframes pulseDot { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2);opacity:0} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes softPulse { 0%,100%{opacity:.45} 50%{opacity:1} }
        @keyframes twinkle1 {
          0%,100% { opacity:.15; transform:scale(.8) }
          50% { opacity:.9; transform:scale(1.2) }
        }
        @keyframes twinkle2 {
          0%,100% { opacity:.25; transform:scale(1) }
          50% { opacity:1; transform:scale(1.4) }
        }
        @keyframes twinkle3 {
          0%,100% { opacity:.1; transform:scale(.6) }
          50% { opacity:.7; transform:scale(1.1) }
        }
        @keyframes driftUp {
          0% { transform:translateY(0) rotate(0deg); opacity:.6 }
          100% { transform:translateY(-18px) rotate(20deg); opacity:0 }
        }
        @keyframes gradientShift {
          0% { background-position:0% 50% }
          25% { background-position:100% 50% }
          50% { background-position:100% 0% }
          75% { background-position:0% 100% }
          100% { background-position:0% 50% }
        }
        @keyframes shineSwipe {
          0% { transform:translateX(-100%) rotate(25deg) }
          100% { transform:translateX(200%) rotate(25deg) }
        }
        .s { background:#fff; border-radius:20px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .press { transition:opacity .12s ease, transform .12s ease }
        .press:active { opacity:.85; transform:scale(.97) }
        .star {
          position:absolute; border-radius:50%; background:#fff;
        }
        .star-glow {
          position:absolute; border-radius:50%;
          background:radial-gradient(circle,rgba(255,255,255,.6) 0%,transparent 70%);
        }
        .hero-card {
          border-radius:22px;
          background-size:300% 300%;
          animation:gradientShift 8s ease infinite;
          position:relative; overflow:hidden;
          box-shadow:
            0 8px 32px rgba(0,0,0,.18),
            0 2px 8px rgba(0,0,0,.1),
            inset 0 1px 0 rgba(255,255,255,.15);
          transform:perspective(800px) rotateX(1deg);
          transition:transform .3s ease;
        }
        .hero-card::before {
          content:''; position:absolute; inset:0;
          background:linear-gradient(135deg,rgba(255,255,255,.12) 0%,transparent 50%,rgba(255,255,255,.05) 100%);
          border-radius:22px; pointer-events:none; z-index:1;
        }
        .hero-card::after {
          content:''; position:absolute; top:-50%; left:-50%;
          width:60%; height:200%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);
          animation:shineSwipe 6s ease-in-out infinite;
          pointer-events:none; z-index:2;
        }
      `}</style>

      <div className="px-4 pt-3 pb-10 space-y-3 min-h-screen" style={{ background:"#f0f2f5" }}>

        {/* ── GREETING CARD (3D Credit Card) ──── */}
        <div {...up(0)}>
          <div className="hero-card" style={{
            padding:"22px 22px 18px",
            background: cfg.gradient,
          }}>
            {/* Glass circle decorations */}
            <div style={{ position:"absolute", top:-40, right:-30, width:140, height:140,
              borderRadius:"50%", background:"rgba(255,255,255,.06)", zIndex:0 }}/>
            <div style={{ position:"absolute", bottom:-30, left:-25, width:100, height:100,
              borderRadius:"50%", background:"rgba(255,255,255,.04)", zIndex:0 }}/>
            <div style={{ position:"absolute", top:"40%", right:"10%", width:60, height:60,
              borderRadius:"50%", background:"rgba(255,255,255,.03)", zIndex:0 }}/>

            {/* Top row: date + live clock */}
            <div className="flex items-center justify-between relative" style={{ zIndex:3 }}>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.6)", fontWeight:500, letterSpacing:"0.02em" }}>
                {mounted ? `วัน${DOW_TH[dow]} ${format(now,"d MMM yyyy",{locale:th})}` : ""}
              </p>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{
                background:"rgba(255,255,255,.1)", backdropFilter:"blur(12px)",
                border:"1px solid rgba(255,255,255,.08)",
              }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full" style={{ background:"rgba(255,255,255,.6)", animation:"pulseDot 1.6s ease-out infinite" }}/>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background:"#fff" }}/>
                </span>
                <p className="tabular-nums" style={{ fontSize:12, fontWeight:700, color:"rgba(255,255,255,.9)", letterSpacing:"-0.01em" }}>
                  {liveTime}
                </p>
              </div>
            </div>

            {/* Main greeting: name + sub on same line */}
            <div className="relative" style={{ zIndex:3, marginTop:16 }}>
              <h1 style={{
                fontSize:24, fontWeight:900, color:"#fff",
                letterSpacing:"-0.03em", lineHeight:1.2,
                textShadow:"0 2px 8px rgba(0,0,0,.15)",
              }}>
                {timeGreet.emoji} {greet}
              </h1>
              <p style={{ fontSize:15, fontWeight:600, color:"rgba(255,255,255,.9)", marginTop:4 }}>
                {emp?.first_name_th || "สวัสดี"} <span style={{ fontSize:12, fontWeight:400, color:"rgba(255,255,255,.5)", marginLeft:4 }}>{timeGreet.sub}</span>
              </p>
            </div>

            {/* Divider line + quote */}
            <div className="relative" style={{ zIndex:3, marginTop:16 }}>
              <div style={{ height:1, background:"linear-gradient(90deg,rgba(255,255,255,.15),rgba(255,255,255,.05),transparent)", marginBottom:12 }}/>
              <p className="italic leading-relaxed" style={{
                fontSize:12, color:"rgba(255,255,255,.6)",
                opacity: qFade ? 1 : 0, transition:"opacity .35s ease",
              }}>
                {quote || ""}
              </p>
            </div>

            {/* Card chip decoration (like credit card) */}
            <div style={{
              position:"absolute", bottom:18, right:22, zIndex:3,
              width:32, height:24, borderRadius:5,
              background:"linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04))",
              border:"1px solid rgba(255,255,255,.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
            }}>
              <Sparkles size={12} style={{ color:"rgba(255,255,255,.3)" }}/>
            </div>
          </div>
        </div>

        {/* ── ROLE SWITCHER ──────────────────────── */}
        {(isManager || isAdmin) && (
          <div {...up(40)} className={`grid gap-2.5 ${isManager && isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
            {isManager && (
              <Link href="/manager/dashboard" className="s press flex items-center gap-3 px-4 py-3.5">
                <div style={{ width:36, height:36, borderRadius:12, background:"rgba(99,102,241,.08)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Users size={16} style={{ color:"#6366f1" }}/>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize:13, fontWeight:700, color:"#1a1a1a" }}>หัวหน้าทีม</p>
                  <p style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>อนุมัติ · ดูทีม</p>
                </div>
                <ChevronRight size={14} style={{ color:"#d1d5db" }}/>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/dashboard" className="s press flex items-center gap-3 px-4 py-3.5">
                <div style={{ width:36, height:36, borderRadius:12, background:"rgba(16,185,129,.08)",
                  display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Shield size={16} style={{ color:"#10b981" }}/>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize:13, fontWeight:700, color:"#1a1a1a" }}>HR Admin</p>
                  <p style={{ fontSize:10, color:"#94a3b8", marginTop:1 }}>จัดการ · รายงาน</p>
                </div>
                <ChevronRight size={14} style={{ color:"#d1d5db" }}/>
              </Link>
            )}
          </div>
        )}

        {/* ── TODAY ATTENDANCE ────────────────────── */}
        {!isWeekend && (
          <div {...up(80)}>
            {todayRecord ? (
              <div className="s" style={{ overflow:"hidden" }}>
                <div className="px-5 pt-5 pb-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-1">
                    <p style={{ fontSize:16, fontWeight:800, color:"#1a1a1a", letterSpacing:"-0.02em" }}>
                      บันทึกเวลา
                    </p>
                    <Link href="/app/attendance" className="press flex items-center gap-0.5"
                      style={{ fontSize:12, fontWeight:600, color:"#94a3b8" }}>
                      ดูประวัติ <ChevronRight size={13}/>
                    </Link>
                  </div>
                  <p style={{ fontSize:11, color:"#b0b0b0", fontWeight:500, marginBottom:20 }}>
                    {mounted ? format(now,"d MMMM yyyy",{locale:th}) : ""}
                  </p>

                  {/* ── Clock circles ── */}
                  <div className="flex items-center justify-center gap-8 mb-5">
                    {/* Clock In */}
                    <div className="flex flex-col items-center">
                      <div className="relative" style={{ width:96, height:96, marginBottom:10 }}>
                        <Ring size={96} stroke={4} pct={todayRecord.clock_in ? 1 : 0} color="#3b82f6" bg="rgba(59,130,246,.08)"/>
                        <div style={{
                          position:"absolute", inset:0, display:"flex", flexDirection:"column",
                          alignItems:"center", justifyContent:"center",
                        }}>
                          <div style={{
                            width:28, height:28, borderRadius:10, background:"rgba(59,130,246,.1)",
                            display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4,
                          }}>
                            <Clock size={14} style={{ color:"#3b82f6" }}/>
                          </div>
                          <p className="tabular-nums" style={{
                            fontSize:18, fontWeight:900, color:"#1a1a1a",
                            letterSpacing:"-0.04em", lineHeight:1,
                          }}>
                            {formatTime(todayRecord.clock_in) || "—"}
                          </p>
                        </div>
                      </div>
                      <p style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>เข้างาน</p>
                    </div>

                    {/* Clock Out */}
                    <div className="flex flex-col items-center">
                      <div className="relative" style={{ width:96, height:96, marginBottom:10 }}>
                        <Ring size={96} stroke={4} pct={todayRecord.clock_out ? 1 : 0}
                          color={todayRecord.clock_out ? "#7c3aed" : "#e2e8f0"}
                          bg={todayRecord.clock_out ? "rgba(124,58,237,.08)" : "rgba(0,0,0,.03)"}/>
                        <div style={{
                          position:"absolute", inset:0, display:"flex", flexDirection:"column",
                          alignItems:"center", justifyContent:"center",
                        }}>
                          <div style={{
                            width:28, height:28, borderRadius:10,
                            background: todayRecord.clock_out ? "rgba(124,58,237,.1)" : "rgba(0,0,0,.04)",
                            display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4,
                          }}>
                            <LogOut size={14} style={{ color: todayRecord.clock_out ? "#7c3aed" : "#cbd5e1" }}/>
                          </div>
                          <p className="tabular-nums" style={{
                            fontSize:18, fontWeight:900,
                            color: todayRecord.clock_out ? "#1a1a1a" : "#d1d5db",
                            letterSpacing:"-0.04em", lineHeight:1,
                          }}>
                            {formatTime(todayRecord.clock_out) || "—"}
                          </p>
                        </div>
                      </div>
                      <p style={{ fontSize:12, color:"#64748b", fontWeight:600 }}>ออกงาน</p>
                    </div>
                  </div>

                  {/* Status pill */}
                  <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2 rounded-full px-4 py-2" style={{
                      background: todayRecord.late_minutes > 0 ? "rgba(239,68,68,.06)" : "rgba(34,197,94,.06)",
                    }}>
                      {todayRecord.late_minutes > 0
                        ? <AlertCircle size={14} style={{ color:"#ef4444" }}/>
                        : <CheckCircle size={14} style={{ color:"#22c55e" }}/>
                      }
                      <p style={{ fontSize:13, fontWeight:700, color: todayRecord.late_minutes > 0 ? "#dc2626" : "#16a34a" }}>
                        {todayRecord.late_minutes > 0 ? `มาสาย +${todayRecord.late_minutes} นาที` : "ตรงเวลา"}
                      </p>
                    </div>
                  </div>

                  {/* Checkout CTA */}
                  {todayRecord.clock_in && !todayRecord.clock_out && (
                    <Link href="/app/checkin" className="checkout-btn press flex items-center justify-center gap-2 w-full" style={{
                      background:"#1a1a1a", borderRadius:14, padding:"13px 0", marginTop:16,
                      fontSize:13, fontWeight:700, color:"#fff",
                      boxShadow:"0 2px 12px rgba(0,0,0,.12)",
                      position:"relative", overflow:"hidden",
                    }}>
                      <MapPin size={14} style={{ animation:"floatY 2s ease-in-out infinite" }}/> บันทึกเวลาออก
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <Link href="/app/checkin" className="press flex items-center gap-4 px-5 py-4" style={{
                borderRadius:20, overflow:"hidden", position:"relative",
                background:"linear-gradient(135deg,#f59e0b 0%,#f97316 50%,#ef4444 100%)",
                boxShadow:"0 4px 20px rgba(249,115,22,.3)",
              }}>
                {/* Decorative circle */}
                <div style={{ position:"absolute", top:-20, right:-20, width:80, height:80,
                  borderRadius:"50%", background:"rgba(255,255,255,.1)" }}/>
                <div style={{
                  width:44, height:44, borderRadius:14, background:"rgba(255,255,255,.18)",
                  display:"flex", alignItems:"center", justifyContent:"center", position:"relative", zIndex:1,
                }}>
                  <MapPin size={20} style={{ color:"#fff", animation:"floatY 2s ease-in-out infinite" }}/>
                </div>
                <div className="flex-1" style={{ position:"relative", zIndex:1 }}>
                  <p style={{ fontSize:14, fontWeight:800, color:"#fff" }}>เช็คอินเลย!</p>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,.65)", marginTop:2 }}>ยังไม่ได้บันทึกเวลาเข้างานวันนี้</p>
                </div>
                <ChevronRight size={16} style={{ color:"rgba(255,255,255,.4)", position:"relative", zIndex:1 }}/>
              </Link>
            )}
          </div>
        )}

        {/* ── STATS ─────────────────────────── */}
        <div {...up(120)} className="s">
          <div className="grid grid-cols-4">
            {[
              { label:"มาแล้ว",     val:present,    color:"#3b82f6" },
              { label:"มาสาย",      val:late,        color:"#f59e0b" },
              { label:"ขาดงาน",     val:absent,      color:"#ef4444" },
              { label:"วันลาเหลือ", val:totalLeave, color:"#10b981" },
            ].map((s,i) => (
              <div key={s.label} className="text-center py-3.5" style={{
                borderRight: i < 3 ? "1px solid rgba(0,0,0,.04)" : "none",
              }}>
                <p className="tabular-nums" style={{ fontSize:20, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</p>
                <p style={{ fontSize:9, color:"#94a3b8", fontWeight:600, marginTop:5 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SALARY (constellation / starfield) ── */}
        <div {...up(160)}>
          <Link href="/app/salary" className="press flex items-center gap-3.5 px-5 py-4" style={{
            borderRadius:20, color:"#fff", position:"relative", overflow:"hidden",
            background:"linear-gradient(135deg,#1e3a5f 0%,#1a2744 40%,#0f172a 100%)",
            boxShadow:"0 4px 24px rgba(15,23,42,.35)",
          }}>
            {/* ★ Stars scattered */}
            <span className="star" style={{ width:3, height:3, top:"18%", left:"12%", animation:"twinkle1 3s ease-in-out infinite" }}/>
            <span className="star" style={{ width:2, height:2, top:"30%", left:"28%", animation:"twinkle2 4s ease-in-out infinite .5s" }}/>
            <span className="star" style={{ width:2.5, height:2.5, top:"15%", left:"52%", animation:"twinkle3 3.5s ease-in-out infinite 1s" }}/>
            <span className="star" style={{ width:2, height:2, top:"65%", left:"40%", animation:"twinkle1 4.5s ease-in-out infinite 1.5s" }}/>
            <span className="star" style={{ width:3, height:3, top:"55%", left:"70%", animation:"twinkle2 3s ease-in-out infinite 2s" }}/>
            <span className="star" style={{ width:1.5, height:1.5, top:"25%", left:"82%", animation:"twinkle3 5s ease-in-out infinite .8s" }}/>
            <span className="star" style={{ width:2, height:2, top:"72%", left:"88%", animation:"twinkle1 3.8s ease-in-out infinite 1.2s" }}/>
            <span className="star" style={{ width:2.5, height:2.5, top:"45%", left:"20%", animation:"twinkle2 4.2s ease-in-out infinite 2.5s" }}/>
            <span className="star" style={{ width:1.5, height:1.5, top:"80%", left:"58%", animation:"twinkle3 3.2s ease-in-out infinite 0.3s" }}/>
            <span className="star" style={{ width:2, height:2, top:"10%", left:"95%", animation:"twinkle1 4s ease-in-out infinite 1.8s" }}/>

            {/* Soft glows */}
            <span className="star-glow" style={{ width:40, height:40, top:"-5%", right:"15%", opacity:.15 }}/>
            <span className="star-glow" style={{ width:30, height:30, bottom:"10%", left:"25%", opacity:.1 }}/>

            {/* Sparkle emoji drifting */}
            <span style={{ position:"absolute", top:"35%", right:"30%", fontSize:8, animation:"driftUp 4s ease-in-out infinite", opacity:.4 }}>✦</span>
            <span style={{ position:"absolute", top:"50%", right:"50%", fontSize:6, animation:"driftUp 5s ease-in-out infinite 1.5s", opacity:.3 }}>✧</span>

            <div style={{
              width:44, height:44, borderRadius:14, background:"rgba(255,255,255,.08)",
              display:"flex", alignItems:"center", justifyContent:"center",
              position:"relative", zIndex:1,
            }}>
              <Wallet size={20} style={{ color:"#93c5fd" }}/>
            </div>
            <div className="flex-1" style={{ position:"relative", zIndex:1 }}>
              <p style={{ fontSize:14, fontWeight:800 }}>สรุปเงินเดือน</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>รายได้ · การหัก · กราฟรายเดือน</p>
            </div>
            <ChevronRight size={16} style={{ color:"rgba(255,255,255,.3)", position:"relative", zIndex:1 }}/>
          </Link>
        </div>

        {/* ── QUICK ACTIONS ───────────────────── */}
        <div {...up(200)}>
          <p style={{ fontSize:12, fontWeight:700, color:"#94a3b8", marginBottom:10, letterSpacing:"0.03em" }}>
            ทำรายการ
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            {([
              { href:"/app/checkin",                   label:"เช็คอิน/เอ้าท์",  sub:"บันทึกเวลา",     icon:<MapPin size={16}/>,        color:"#3b82f6" },
              { href:"/app/leave/new",                 label:"ยื่นใบลา",          sub:"ป่วย · กิจ · พักร้อน",  icon:<CalendarClock size={16}/>, color:"#8b5cf6" },
              { href:"/app/leave/new?type=adjustment", label:"แก้ไขเวลา",          sub:"เวลาผิดพลาด",     icon:<FileEdit size={16}/>,      color:"#f59e0b" },
              { href:"/app/leave/new?type=overtime",   label:"ขอโอที",              sub:"เวลาล่วงเวลา",    icon:<Timer size={16}/>,         color:"#10b981" },
              { href:"/app/resignation",               label:"ลาออก",               sub:"ยื่น · ติดตาม",   icon:<UserX size={16}/>,         color:"#ef4444" },
              { href:"/app/leave",                     label:"ประวัติคำขอ",          sub:"สถานะ · โควต้า",  icon:<CalendarDays size={16}/>,  color:"#0ea5e9" },
            ] as {href:string;label:string;sub:string;icon:React.ReactNode;color:string}[]).map(a => (
              <Link key={a.href} href={a.href} className="s press flex items-center gap-3 px-4 py-3.5">
                <div style={{ width:36, height:36, borderRadius:12, background:`${a.color}0D`,
                  display:"flex", alignItems:"center", justifyContent:"center", color:a.color, flexShrink:0 }}>
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <p style={{ fontSize:12, fontWeight:700, color:"#1a1a1a" }}>{a.label}</p>
                  <p style={{ fontSize:10, color:"#b0b0b0", marginTop:1 }}>{a.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── LEAVE BALANCE ───────────────────── */}
        {balances.length > 0 && (
          <div {...up(260)} className="s">
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <p style={{ fontSize:14, fontWeight:700, color:"#1a1a1a" }}>โควต้าการลา</p>
              <Link href="/app/leave" className="press flex items-center gap-0.5"
                style={{ fontSize:12, fontWeight:600, color:"#94a3b8" }}>
                ดูทั้งหมด <ChevronRight size={12}/>
              </Link>
            </div>
            <div className="px-5 pb-4 space-y-3">
              {balances.slice(0,3).map((b:any) => {
                const pct = b.entitled_days > 0 ? Math.min(b.used_days/b.entitled_days*100, 100) : 0
                const col = b.leave_type?.color_hex || "#6366f1"
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div style={{ width:8, height:8, borderRadius:"50%", backgroundColor:col }}/>
                        <p style={{ fontSize:12, color:"#374151", fontWeight:600 }}>{b.leave_type?.name}</p>
                      </div>
                      <p className="tabular-nums" style={{ fontSize:13, fontWeight:800 }}>
                        <span style={{ color:col }}>{b.remaining_days}</span>
                        <span style={{ fontWeight:400, color:"#b0b0b0", fontSize:10 }}>/{b.entitled_days}</span>
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"rgba(0,0,0,.04)" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor:col, opacity:.7 }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── WEEKEND ─────────────────────────── */}
        {isWeekend && (
          <div {...up(80)} className="s flex items-center gap-3.5 px-5 py-4">
            <div style={{ width:44, height:44, borderRadius:14, background:"rgba(0,0,0,.03)",
              display:"flex", alignItems:"center", justifyContent:"center" }}>
              <span style={{ fontSize:22 }}>🛋️</span>
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:"#1a1a1a" }}>วันนี้วันหยุด!</p>
              <p style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>ไม่ต้องเช็คอิน พักผ่อนให้เต็มที่</p>
            </div>
          </div>
        )}

      </div>
    </>
  )
}
