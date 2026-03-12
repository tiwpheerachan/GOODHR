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
  Wallet, MapPin, LogOut, RefreshCw,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"

const DAY_CFG = [
  { accent:"#8b5cf6", tag:"วันหยุด 🌸", quotes:[
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
    "วันหยุดคือวันที่นาฬิกาหยุดเดิน 🕰️",
    "พักเพื่อกลับมาแข็งแกร่งกว่าเดิม 💪",
    "กินอร่อย นอนหลับ ไม่คิดเรื่องงาน ✅",
    "วันอาทิตย์ที่ดีคือวันที่ทำในสิ่งที่รัก 🎨",
    "รีชาร์จ รีเซ็ต พร้อมสำหรับสัปดาห์ใหม่ 🌟",
  ]},
  { accent:"#3b82f6", tag:"เริ่มสัปดาห์ ☁️", quotes:[
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
    "จันทร์คือหน้าแรกของนิยายที่ยังไม่ได้เขียน ✍️",
    "เปิดสัปดาห์ด้วยพลังบวก ปิดสัปดาห์ด้วยความสำเร็จ ✨",
    "ทำงานด้วยใจ ผลลัพธ์จะตามมาเอง 💫",
    "วันจันทร์คือแรงผลักดันที่ดีที่สุด 🔥",
    "เริ่มใหม่ได้เสมอ แม้แต่ในวันจันทร์ 🌅",
  ]},
  { accent:"#f97316", tag:"ลุยเลย 🔥", quotes:[
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
    "โฟกัส ลงมือ ไม่ผัดวันประกันพรุ่ง 📌",
    "อังคารนี้ทุกอุปสรรคคือบทเรียนที่ดี 💡",
    "ความสำเร็จชอบคนที่ลงมือทำก่อน 🏃",
    "วันนี้เหนื่อยได้ แต่อย่าหยุด 💪",
    "ไปต่อ อีกนิดเดียวก็ถึงแล้ว ✅",
  ]},
  { accent:"#10b981", tag:"กึ่งกลาง 🌿", quotes:[
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
    "มาถึงตรงนี้แล้ว ก็แค่เดินต่อไป 🚶",
    "พุธคือสัญญาณว่าคุณแข็งแกร่งกว่าที่คิด 💚",
    "โปรเจกต์ไหนค้างอยู่บ้าง? วันนี้ปิดได้เลย 📋",
    "ครึ่งหลังของสัปดาห์มักจะดีกว่าครึ่งแรก 🌈",
    "ถึงพุธแล้ว นั่นแปลว่าคุณเก่งมาก 🌟",
  ]},
  { accent:"#6366f1", tag:"เกือบถึง ⭐", quotes:[
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
    "ทำให้ดีที่สุดวันนี้ พรุ่งนี้จะมีรางวัล 🎁",
    "เกือบถึงแล้ว พลังอีกนิดนะ ⚡",
    "พฤหัสฯ ให้กำลังใจตัวเองบ้างก็ดีนะ 💜",
    "อดทนอีกหน่อย ศุกร์อยู่แค่มือเอื้อม 🌸",
    "คุณผ่านมาได้ถึงตรงนี้ นั่นคือความสำเร็จ 🥇",
  ]},
  { accent:"#f59e0b", tag:"ศุกร์!! 🎉", quotes:[
    "ศุกร์แล้วว!! มาไกลมากนะเพื่อน 🎊",
    "TGIF — Thank God It's Friday 🙌",
    "ศุกร์: วันที่ประสิทธิภาพสูงสุดช่วง 17:00–17:30 น. 😂",
    "ทำงานให้เสร็จ แล้วออกไปฉลอง! 🥂",
    "ศุกร์นี้คุณทำได้ดีมากตลอดสัปดาห์ 🏆",
    "วันที่ทุกคนรอ มาถึงแล้ว!! 🎉",
    "กาแฟแก้วสุดท้ายของสัปดาห์ ดื่มแบบจุใจ ☕",
    "ศุกร์บ่ายเป็นช่วงเวลาที่ดีที่สุด 🌅",
    "อีก X ชั่วโมงก็ weekend แล้ว นับได้เลย ⏰",
    "ปิดงานให้หมด แล้วไปพัก! ✅",
    "ศุกร์คือรางวัลของคนที่สู้มาทั้งสัปดาห์ 🥇",
    "เย้! ผ่านมาได้อีกสัปดาห์แล้ว! 🎈",
    "วันศุกร์คือ playlist เพลงสนุกๆ ที่ดัง 🎵",
    "ทุกสัปดาห์มีศุกร์ นั่นคือเหตุผลที่ต้องสู้ต่อ 💛",
    "ยิ้มได้กว้างหน่อยนะ วันนี้สมควรแล้ว 😄",
  ]},
  { accent:"#0ea5e9", tag:"วันหยุด 😴", quotes:[
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
    "เสาร์คือการอนุญาตให้ตัวเองเป็นตัวเอง 💙",
    "นอนตื่นสาย กินข้าวช้า ใช้ชีวิตสบายๆ 🐌",
    "วันหยุดสมองจากงาน แต่ไม่หยุดความสุข 😊",
    "เสาร์นี้ขอแค่มีความสุขเล็กๆ ก็พอ 🌟",
    "พักผ่อนให้เต็มที่ เพราะคุณสมควรได้รับมัน 💫",
  ]},
]
const DOW_TH = ["อาทิตย์","จันทร์","อังคาร","พุธ","พฤหัสบดี","ศุกร์","เสาร์"]
const STATUS_LABEL: Record<string,string> = {
  active:"ทำงานปกติ", probation:"ทดลองงาน", on_leave:"ลาพัก",
  resigned:"ลาออก", terminated:"เลิกจ้าง", suspended:"พักงาน",
}

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
  }, [dow, mounted])

  const hour     = now.getHours()
  const greet    = hour < 6 ? "ดึกแล้วนะ" : hour < 12 ? "อรุณสวัสดิ์" : hour < 17 ? "สวัสดีตอนบ่าย" : "สวัสดีตอนเย็น"
  const liveTime = mounted ? format(now, "HH:mm:ss") : "──:──:──"

  const present    = records.filter(r => ["present","late"].includes(r.status)).length
  const late       = records.filter(r => r.status === "late").length
  const absent     = records.filter(r => r.status === "absent").length
  const totalLeave = balances.reduce((s:number,b:any) => s+(b.remaining_days??0), 0)

  const up = (d:number) => ({
    style: {
      opacity:   visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(12px)",
      transition:`opacity .45s ease ${d}ms, transform .45s ease ${d}ms`,
    }
  })

  return (
    <>
      <style suppressHydrationWarning>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&display=swap');
        * { font-family: 'Noto Sans Thai', sans-serif; }
        @keyframes pulseDot { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(2);opacity:0} }
        @keyframes fadeQ    { from{opacity:0} to{opacity:1} }
        @keyframes checkoutPulse { 0%,100%{box-shadow:0 4px 14px rgba(14,165,233,.35)} 50%{box-shadow:0 4px 22px rgba(14,165,233,.65)} }
        @keyframes checkoutShimmer { 0%{left:-60%} 100%{left:130%} }
        .checkout-btn { animation: checkoutPulse 2s ease-in-out infinite; transition: transform .15s ease, opacity .15s ease }
        .checkout-btn:active { transform:scale(.96); opacity:.9 }
        .checkout-btn::after {
          content:""; position:absolute; top:0; bottom:0; width:35%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.25),transparent);
          transform:skewX(-15deg);
          animation: checkoutShimmer 2.2s ease-in-out infinite;
        }
        .page { background:#f5f6fa; min-height:100%; }
        .c {
          background:#fff;
          border:1px solid #e8eaed;
          border-radius:14px;
        }
        .press { transition:opacity .15s ease, transform .15s ease }
        .press:active { opacity:.85; transform:scale(.98) }
      `}</style>

      <div className="page px-4 pt-4 pb-10 space-y-3">

        {/* ── HEADER HERO ───────────────────────── */}
        <div {...up(0)} className="relative overflow-hidden rounded-2xl" style={{
          background:`linear-gradient(135deg, ${cfg.accent}ee 0%, ${cfg.accent}bb 100%)`,
          boxShadow:`0 8px 32px ${cfg.accent}40`
        }}>
          <div className="absolute inset-0 pointer-events-none" style={{
            background:`radial-gradient(ellipse at 90% -10%, rgba(255,255,255,.22) 0%, transparent 55%),
                        radial-gradient(ellipse at -5% 110%, rgba(0,0,0,.12) 0%, transparent 45%)`
          }}/>
          <div className="absolute inset-0 pointer-events-none" style={{
            backgroundImage:`radial-gradient(circle, rgba(255,255,255,.15) 1px, transparent 1px)`,
            backgroundSize:"20px 20px"
          }}/>
          <div className="absolute bottom-0 inset-x-0 h-px" style={{
            background:"linear-gradient(90deg,transparent,rgba(255,255,255,.3),transparent)"
          }}/>

          <div className="relative z-10 px-4 pt-4 pb-3.5">
            <div className="flex items-start justify-between mb-3">
              <p style={{ fontSize:11, color:"rgba(255,255,255,.7)", fontWeight:500, letterSpacing:"0.02em" }}>
                {mounted ? `วัน${DOW_TH[dow]} ${format(now,"d MMM yyyy",{locale:th})}` : ""}
              </p>
              <div className="flex items-center gap-1.5 rounded-full px-3 py-1" style={{
                background:"rgba(0,0,0,.18)", border:"1px solid rgba(255,255,255,.18)"
              }}>
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-emerald-300" style={{ animation:"pulseDot 1.6s ease-out infinite" }}/>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300"/>
                </span>
                <p className="tabular-nums font-black text-white" style={{ fontSize:13, letterSpacing:"-0.02em" }}>
                  {liveTime}
                </p>
              </div>
            </div>

            <div className="mb-3.5">
              <p style={{ fontSize:12, color:"rgba(255,255,255,.75)", fontWeight:500 }}>{greet}</p>
              <h1 style={{ fontSize:22, fontWeight:900, color:"#fff", letterSpacing:"-0.025em", lineHeight:1.15, marginTop:2,
                textShadow:"0 2px 12px rgba(0,0,0,.15)" }}>
                {emp?.first_name_th || "สวัสดี"} {emp?.last_name_th || ""} 👋
              </h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {emp?.position?.name && (
                  <span style={{
                    fontSize:10, fontWeight:600, color:"rgba(255,255,255,.9)",
                    background:"rgba(0,0,0,.18)", border:"1px solid rgba(255,255,255,.2)",
                    borderRadius:99, padding:"2px 10px"
                  }}>{emp.position.name}</span>
                )}
                {emp?.department?.name && (
                  <span style={{
                    fontSize:10, color:"rgba(255,255,255,.65)",
                    background:"rgba(0,0,0,.12)", border:"1px solid rgba(255,255,255,.14)",
                    borderRadius:99, padding:"2px 10px"
                  }}>{emp.department.name}</span>
                )}
              </div>
            </div>

            <div className="rounded-xl px-3 py-2.5 flex items-center gap-2.5" style={{
              background:"rgba(0,0,0,.15)", border:"1px solid rgba(255,255,255,.12)"
            }}>
              <p className="flex-1 italic leading-relaxed" style={{
                fontSize:11, color:"rgba(255,255,255,.75)",
                opacity: qFade ? 1 : 0, transition:"opacity .35s ease"
              }}>
                {quote || ""}
              </p>
              <span style={{
                fontSize:10, fontWeight:700, color:"rgba(255,255,255,.9)",
                background:"rgba(255,255,255,.15)", borderRadius:99, padding:"2px 8px",
                whiteSpace:"nowrap", flexShrink:0
              }}>
                {cfg.tag}
              </span>
            </div>
          </div>
        </div>

        {/* ── ROLE SWITCHER ──────────────────────── */}
        {(isManager || isAdmin) && (
          <div {...up(60)} className={`grid gap-2 ${isManager && isAdmin ? "grid-cols-2" : "grid-cols-1"}`}>
            {isManager && (
              <Link href="/manager/dashboard" className="c press flex items-center gap-2.5 px-3.5 py-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background:"#3b82f6" }}>
                  <Users size={14}/>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize:12, fontWeight:700, color:"#111827" }}>หัวหน้าทีม</p>
                  <p style={{ fontSize:10, color:"#9ca3af" }}>อนุมัติ · ดูทีม</p>
                </div>
                <ChevronRight size={14} style={{ color:"#d1d5db" }}/>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin/dashboard" className="c press flex items-center gap-2.5 px-3.5 py-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background:"#10b981" }}>
                  <Shield size={14}/>
                </div>
                <div className="min-w-0 flex-1">
                  <p style={{ fontSize:12, fontWeight:700, color:"#111827" }}>HR Admin</p>
                  <p style={{ fontSize:10, color:"#9ca3af" }}>จัดการ · รายงาน</p>
                </div>
                <ChevronRight size={14} style={{ color:"#d1d5db" }}/>
              </Link>
            )}
          </div>
        )}

        {/* ── TODAY CHECK-IN ─────────────────────── */}
        {!isWeekend && (
          <div {...up(100)}>
            {todayRecord ? (
              <div className="c overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-4 pt-3.5 pb-3" style={{ borderBottom:"1px solid #f3f4f6" }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize:15 }}>🗓️</span>
                    <p style={{ fontSize:13, fontWeight:700, color:"#111827" }}>บันทึกเวลาวันนี้</p>
                  </div>
                  <span style={{ fontSize:11, color:"#9ca3af" }}>
                    {mounted ? format(now,"d MMM yyyy",{locale:th}) : ""}
                  </span>
                </div>

                {/* 3 stat cols */}
                <div className="grid grid-cols-3" style={{ borderBottom:"1px solid #f3f4f6" }}>
                  {[
                    { icon:<Clock size={13} style={{ color:"#ea580c" }}/>,     label:"เข้างาน",  val:formatTime(todayRecord.clock_in)||"—",  accent:"#111827" },
                    { icon:<LogOut size={13} style={{ color:"#0369a1" }}/>,    label:"ออกงาน",  val:formatTime(todayRecord.clock_out)||"—", accent:"#111827" },
                    { icon: todayRecord.late_minutes>0
                        ? <AlertCircle size={13} style={{ color:"#ea580c" }}/>
                        : <TrendingUp size={13} style={{ color:"#16a34a" }}/>,
                      label:"สถานะ",
                      val: todayRecord.late_minutes>0 ? `+${todayRecord.late_minutes}น.` : "ตรงเวลา",
                      accent:"#111827",
                      sub: todayRecord.late_minutes>0 ? "มาสาย" : "",
                      subColor: todayRecord.late_minutes>0 ? "#ea580c" : "#16a34a" },
                  ].map((s:any,i) => (
                    <div key={i} className="flex flex-col items-center py-4"
                      style={{ borderRight: i<2 ? "1px solid #f3f4f6" : "none" }}>
                      <div style={{ marginBottom:5 }}>{s.icon}</div>
                      <p style={{ fontSize:9, color:"#9ca3af", fontWeight:600, letterSpacing:"0.06em", textTransform:"uppercase", marginBottom:5 }}>{s.label}</p>
                      <p className="tabular-nums font-black" style={{ fontSize:17, color:s.accent, letterSpacing:"-0.02em", lineHeight:1 }}>{s.val}</p>
                      {s.sub ? <p style={{ fontSize:9, color:s.subColor, marginTop:3, fontWeight:600, opacity:.75 }}>{s.sub}</p> : null}
                    </div>
                  ))}
                </div>

                {/* checkout row */}
                {todayRecord.clock_in && !todayRecord.clock_out && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background:"#fff7ed" }}>
                        <AlertCircle size={15} style={{ color:"#f97316" }}/>
                      </div>
                      <div>
                        <p style={{ fontSize:12, fontWeight:700, color:"#111827" }}>ยังไม่ได้เช็คเอ้าท์</p>
                        <p style={{ fontSize:10, color:"#9ca3af", marginTop:1 }}>อย่าลืมบันทึกเวลาออกนะ</p>
                      </div>
                    </div>
                    <Link href="/app/checkin" className="checkout-btn flex items-center gap-1.5 rounded-xl px-3.5 py-2" style={{
                      background:"linear-gradient(135deg,#0ea5e9,#0891b2)",
                      fontSize:12, fontWeight:700, color:"#fff",
                      boxShadow:"0 4px 14px rgba(14,165,233,.35)",
                      position:"relative", overflow:"hidden"
                    }}>
                      <MapPin size={12}/> เช็คเอ้าท์
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/app/checkin" className="press flex items-center gap-3.5 px-4 py-3.5 rounded-[14px]"
                style={{ background:"linear-gradient(135deg,#0ea5e9,#14b8a6,#10b981)", boxShadow:"0 4px 16px rgba(14,165,233,.25)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                  style={{ background:"rgba(255,255,255,.2)", border:"1px solid rgba(255,255,255,.25)" }}>
                  <MapPin size={19}/>
                </div>
                <div className="flex-1">
                  <p style={{ fontSize:14, fontWeight:800, color:"#fff" }}>เช็คอินเลย!</p>
                  <p style={{ fontSize:11, color:"rgba(255,255,255,.75)", marginTop:2 }}>ยังไม่ได้บันทึกเวลาเข้างานวันนี้</p>
                </div>
                <ChevronRight size={18} style={{ color:"rgba(255,255,255,.7)" }}/>
              </Link>
            )}
          </div>
        )}

        {/* ── STATS ROW ──────────────────────────── */}
        <div {...up(150)} className="c overflow-hidden">
          <div className="grid grid-cols-4">
            {[
              { label:"มาแล้ว",     val:present,    color:"#0369a1" },
              { label:"มาสาย",      val:late,        color:"#d97706" },
              { label:"ขาดงาน",     val:absent,      color:"#dc2626" },
              { label:"วันลาเหลือ", val:totalLeave, color:"#0f766e" },
            ].map((s,i) => (
              <div key={s.label} className="py-3.5 text-center"
                style={{ borderRight:i<3?"1px solid #f3f4f6":"none" }}>
                <p className="tabular-nums font-black" style={{ fontSize:21, color:s.color, letterSpacing:"-0.02em" }}>{s.val}</p>
                <p style={{ fontSize:9, color:"#9ca3af", fontWeight:500, marginTop:3 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── SALARY ─────────────────────────────── */}
        <div {...up(190)}>
          <Link href="/app/salary" className="press flex items-center gap-3 px-4 py-3.5 rounded-[14px]"
            style={{ background:"linear-gradient(135deg,#0ea5e9,#14b8a6,#10b981)", boxShadow:"0 4px 16px rgba(14,165,233,.22)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
              style={{ background:"rgba(255,255,255,.2)", border:"1px solid rgba(255,255,255,.25)" }}>
              <Wallet size={18}/>
            </div>
            <div className="flex-1">
              <p style={{ fontSize:14, fontWeight:800, color:"#fff" }}>สรุปเงินเดือน</p>
              <p style={{ fontSize:11, color:"rgba(255,255,255,.75)", marginTop:2 }}>รายได้ · การหัก · กราฟรายเดือน</p>
            </div>
            <ChevronRight size={18} style={{ color:"rgba(255,255,255,.7)" }}/>
          </Link>
        </div>

        {/* ── QUICK ACTIONS ──────────────────────── */}
        <div {...up(230)}>
          <p style={{ fontSize:11, fontWeight:700, color:"#9ca3af", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>
            ทำรายการ
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([
              { href:"/app/checkin",                   label:"เช็คอิน/เอ้าท์",  desc:"บันทึกเวลาเข้า-ออก",    icon:<MapPin size={16}/>,        color:"#0ea5e9" },
              { href:"/app/leave/new",                 label:"ยื่นใบลา",          desc:"ป่วย · กิจ · พักร้อน",  icon:<CalendarClock size={16}/>, color:"#6366f1" },
              { href:"/app/leave/new?type=adjustment", label:"แก้ไขเวลา",          desc:"เวลาเข้า-ออกผิดพลาด",    icon:<FileEdit size={16}/>,      color:"#f97316" },
              { href:"/app/leave/new?type=overtime",   label:"ขอโอที",              desc:"บันทึกเวลาล่วงเวลา",     icon:<Timer size={16}/>,         color:"#10b981" },
            ] as {href:string;label:string;desc:string;icon:React.ReactNode;color:string}[]).map(a => (
              <Link key={a.href} href={a.href} className="c press flex items-center gap-3 px-3.5 py-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                  style={{ background:a.color }}>
                  {a.icon}
                </div>
                <div className="min-w-0">
                  <p style={{ fontSize:12, fontWeight:700, color:"#111827", lineHeight:1.2 }}>{a.label}</p>
                  <p style={{ fontSize:10, color:"#9ca3af", marginTop:2 }}>{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── LEAVE BALANCE ──────────────────────── */}
        {balances.length > 0 && (
          <div {...up(290)} className="c overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:"1px solid #f3f4f6" }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#374151" }}>โควต้าการลา</p>
              <Link href="/app/leave" className="press flex items-center gap-0.5"
                style={{ fontSize:11, fontWeight:600, color:"#0ea5e9" }}>
                ดูทั้งหมด <ChevronRight size={11}/>
              </Link>
            </div>
            <div className="px-4 py-3 space-y-3">
              {balances.slice(0,3).map((b:any) => {
                const pct = b.entitled_days > 0 ? Math.min(b.used_days/b.entitled_days*100, 100) : 0
                const col = b.leave_type?.color_hex || "#0ea5e9"
                return (
                  <div key={b.id}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor:col }}/>
                        <p style={{ fontSize:12, color:"#374151", fontWeight:500 }}>{b.leave_type?.name}</p>
                      </div>
                      <p className="tabular-nums" style={{ fontSize:12, color:"#374151", fontWeight:700 }}>
                        {b.remaining_days}
                        <span style={{ fontWeight:400, color:"#9ca3af", fontSize:10 }}>/{b.entitled_days}</span>
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:"#f3f4f6" }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width:`${pct}%`, backgroundColor:col }}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── WEEKEND ────────────────────────────── */}
        {isWeekend && (
          <div {...up(100)} className="c flex items-center gap-3 px-4 py-3.5">
            <span style={{ fontSize:22 }}>🛋️</span>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:"#111827" }}>วันนี้วันหยุด!</p>
              <p style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>ไม่ต้องเช็คอิน พักผ่อนให้เต็มที่ 😌</p>
            </div>
          </div>
        )}

      </div>
    </>
  )
}