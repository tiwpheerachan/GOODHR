"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Home, Clock, Calendar, CalendarDays, CalendarClock, User, Bell, Users, Shield, Target,
  Megaphone, FileText, Grip, X, MessageCircle, Package, GraduationCap, Store, ScanLine,
} from "lucide-react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useEffect, useState, useRef, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

// ── Bottom Nav (7 main items) ──
const NAV = [
  { href: "/app/dashboard",      icon: Home,           label: "หน้าหลัก" },
  { href: "/app/checkin",        icon: Clock,          label: "เช็คอิน"  },
  { href: "/app/announcements",  icon: Megaphone,      label: "ประกาศ"   },
  { href: "/app/chat",           icon: MessageCircle,  label: "แชท"      },
  { href: "/app/leave",          icon: CalendarDays,   label: "การลา"    },
  { href: "/app/attendance",     icon: Calendar,       label: "เข้างาน"  },
  { href: "/app/profile",        icon: User,           label: "โปรไฟล์" },
]

// ── AssistiveTouch Menu Items ──
const FLOAT_MENU = [
  { href: "/app/schedule",          icon: CalendarClock, label: "ตารางกะ",     color: "from-violet-500 to-purple-500" },
  { href: "/app/kpi",               icon: Target,        label: "KPI",         color: "from-amber-500 to-orange-500" },
  { href: "/app/probation-eval",   icon: Shield,        label: "ทดลองงาน",   color: "from-rose-500 to-pink-500" },
  { href: "/app/equipment",         icon: Package,       label: "ยืมอุปกรณ์",  color: "from-cyan-500 to-teal-500" },
  { href: "/app/training",          icon: GraduationCap, label: "ห้องเรียน",   color: "from-sky-500 to-blue-500" },
  { href: "/app/branch-eval",       icon: Store,         label: "ประเมินสาขา",  color: "from-indigo-500 to-violet-500" },
  { href: "/app/sales",             icon: ScanLine,      label: "ขายสินค้า",    color: "from-pink-500 to-rose-500" },
  { href: "/app/payslip",           icon: FileText,      label: "สลิป",        color: "from-emerald-500 to-green-500" },
]

// ── AssistiveTouch Component ──
function AssistiveTouch({ unreadAnn }: { unreadAnn: number }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ x: -1, y: -1 })
  const [dragging, setDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0, moved: false })

  useEffect(() => {
    if (pos.x === -1) setPos({ x: window.innerWidth - 64, y: window.innerHeight - 200 })
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = { startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, moved: false }
    setDragging(true)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) dragRef.current.moved = true
    setPos({
      x: Math.max(8, Math.min(window.innerWidth - 68, dragRef.current.startPosX + dx)),
      y: Math.max(60, Math.min(window.innerHeight - 130, dragRef.current.startPosY + dy)),
    })
  }

  const onPointerUp = () => {
    setDragging(false)
    setPos(prev => ({
      x: prev.x < window.innerWidth / 2 ? 8 : window.innerWidth - 56,
      y: prev.y,
    }))
    if (!dragRef.current.moved) setOpen(o => !o)
    dragRef.current.moved = false
  }

  if (pos.x === -1) return null

  return (
    <>
      {open && <div className="fixed inset-0 z-[998]" onClick={() => setOpen(false)}/>}

      {open && (
        <div className="fixed z-[999]" style={{ left: pos.x + (pos.x < window.innerWidth / 2 ? -10 : -140), top: pos.y - 100 }}>
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200 p-3 grid grid-cols-2 gap-2 w-[160px] animate-[scaleIn_0.15s_ease]">
            {FLOAT_MENU.map(item => {
              const Icon = item.icon
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all relative">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} text-white flex items-center justify-center shadow-md`}>
                    <Icon size={18}/>
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">{item.label}</span>
{/* no badge needed here anymore */}
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div
        className="fixed z-[1000] select-none touch-none"
        style={{ left: pos.x, top: pos.y, transition: dragging ? "none" : "left 0.3s ease" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* ── น้อง SHD Mascot ── */}
        <div className={`shd-mascot ${open ? "shd-open" : ""} ${dragging ? "shd-drag" : ""}`}>
          {/* Outer aura — เปล่งแสงทอง */}
          <span className="shd-aura"/>

          {/* Rotating halo ring — สีทอง */}
          <span className="shd-halo"/>

          {/* Orbiting sparkles — ดาวๆ หมุนรอบ */}
          <span className="shd-orbit">
            <span className="shd-sparkle s1"/>
            <span className="shd-sparkle s2"/>
            <span className="shd-sparkle s3"/>
            <span className="shd-sparkle s4"/>
          </span>

          {/* Antenna */}
          <span className="shd-antenna">
            <span className="shd-antenna-dot"/>
          </span>

          {/* Body / Face */}
          <div className="shd-body">
            {open ? (
              <X size={22} className="text-white relative z-10"/>
            ) : (
              <>
                {/* Eyes */}
                <span className="shd-eye shd-eye-left"/>
                <span className="shd-eye shd-eye-right"/>
                {/* Cheeks */}
                <span className="shd-cheek shd-cheek-left"/>
                <span className="shd-cheek shd-cheek-right"/>
                {/* Mouth */}
                <span className="shd-mouth"/>
                {/* Label */}
                <span className="shd-label">SHD</span>
              </>
            )}
          </div>

          {/* Shadow on ground */}
          <span className="shd-shadow"/>
        </div>

        {!open && unreadAnn > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-md animate-pulse z-20 ring-2 ring-white">
            {unreadAnn}
          </span>
        )}
      </div>

      <style jsx global>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* ── น้อง SHD — Living Mascot ── */
        .shd-mascot {
          position: relative;
          width: 60px; height: 60px;
          cursor: pointer;
          animation: shd-bob 2.4s ease-in-out infinite;
          transition: transform .2s ease;
        }
        .shd-mascot:hover { animation-play-state: paused; transform: scale(1.1); }
        .shd-mascot:active { transform: scale(0.92); }
        .shd-drag { animation: none !important; transform: scale(1.08); }
        .shd-drag .shd-body { animation: none !important; }

        /* Pulsing aura — เปล่งแสงทองรอบนอก */
        .shd-aura {
          position: absolute;
          inset: -14px;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(251, 191, 36, 0.5) 0%,
            rgba(245, 158, 11, 0.3) 30%,
            rgba(139, 92, 246, 0.15) 55%,
            transparent 75%);
          filter: blur(8px);
          animation: shd-aura-pulse 2.6s ease-in-out infinite;
          z-index: -2;
          pointer-events: none;
        }

        /* Rotating halo ring — แหวนทองหมุน */
        .shd-halo {
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            #fbbf24 0%,
            #fde047 12%,
            #f59e0b 25%,
            #fbbf24 38%,
            #ec4899 50%,
            #8b5cf6 65%,
            #fbbf24 80%,
            #fde047 92%,
            #fbbf24 100%);
          animation: shd-halo-spin 6s linear infinite;
          z-index: -1;
          mask: radial-gradient(circle, transparent 56%, black 60%, black 96%, transparent 100%);
          -webkit-mask: radial-gradient(circle, transparent 56%, black 60%, black 96%, transparent 100%);
          filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.6));
          pointer-events: none;
        }

        /* Orbiting sparkles */
        .shd-orbit {
          position: absolute;
          inset: -8px;
          z-index: 3;
          animation: shd-halo-spin 8s linear infinite reverse;
          pointer-events: none;
        }
        .shd-sparkle {
          position: absolute;
          width: 5px; height: 5px;
          border-radius: 50%;
          background: radial-gradient(circle, #fffbeb 0%, #fbbf24 50%, transparent 80%);
          box-shadow:
            0 0 6px rgba(251, 191, 36, 1),
            0 0 12px rgba(251, 191, 36, 0.7);
          animation: shd-sparkle-twinkle 1.8s ease-in-out infinite;
        }
        .shd-sparkle.s1 { top: 0; left: 50%; transform: translateX(-50%); animation-delay: 0s; }
        .shd-sparkle.s2 { right: 0; top: 50%; transform: translateY(-50%); animation-delay: 0.45s; width: 3px; height: 3px; }
        .shd-sparkle.s3 { bottom: 0; left: 50%; transform: translateX(-50%); animation-delay: 0.9s; }
        .shd-sparkle.s4 { left: 0; top: 50%; transform: translateY(-50%); animation-delay: 1.35s; width: 3px; height: 3px; }

        /* Body — gold + purple gradient + gold rim */
        .shd-body {
          position: relative;
          width: 60px; height: 60px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 25%,
            #fde047 0%,
            #fbbf24 18%,
            #a78bfa 40%,
            #8b5cf6 65%,
            #6d28d9 100%);
          box-shadow:
            0 8px 24px rgba(251, 191, 36, 0.45),
            0 4px 14px rgba(109, 40, 217, 0.4),
            inset 0 -8px 14px rgba(67, 20, 154, 0.35),
            inset 0 2px 4px rgba(255, 251, 235, 0.5),
            inset 0 0 0 1.5px rgba(251, 191, 36, 0.55);
          animation: shd-wobble 4s ease-in-out infinite;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden;
          z-index: 2;
        }
        .shd-mascot:hover .shd-body { animation-play-state: paused; }

        /* Glossy highlight overlay */
        .shd-body::before {
          content: '';
          position: absolute; top: 4px; left: 8px;
          width: 18px; height: 12px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.45);
          filter: blur(2px);
          z-index: 1;
        }

        /* Eyes */
        .shd-eye {
          position: absolute;
          width: 7px; height: 9px;
          background: #1e1b4b;
          border-radius: 50%;
          top: 22px;
          animation: shd-blink 3.8s ease-in-out infinite;
          z-index: 2;
        }
        .shd-eye::after {
          content: '';
          position: absolute;
          top: 1px; left: 1px;
          width: 3px; height: 3px;
          background: white;
          border-radius: 50%;
        }
        .shd-eye-left { left: 17px; }
        .shd-eye-right { right: 17px; animation-delay: 0.04s; }

        /* Cheeks */
        .shd-cheek {
          position: absolute;
          width: 7px; height: 5px;
          background: rgba(244, 114, 182, 0.7);
          border-radius: 50%;
          top: 35px;
          filter: blur(1px);
          z-index: 2;
          animation: shd-cheek-glow 2.6s ease-in-out infinite;
        }
        .shd-cheek-left { left: 10px; }
        .shd-cheek-right { right: 10px; }
        .shd-mascot:hover .shd-cheek {
          background: rgba(244, 114, 182, 0.95);
          width: 9px; height: 6px;
        }

        /* Mouth — small smile */
        .shd-mouth {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%);
          width: 10px; height: 5px;
          border-bottom: 2px solid #1e1b4b;
          border-radius: 0 0 10px 10px;
          z-index: 2;
          transition: all .2s ease;
        }
        .shd-mascot:hover .shd-mouth {
          width: 14px; height: 6px;
          border-bottom-width: 2.5px;
        }

        /* SHD label — subtle text below smile */
        .shd-label {
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 7px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.55);
          letter-spacing: 1px;
          z-index: 2;
        }

        /* Antenna */
        .shd-antenna {
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 2px; height: 10px;
          background: linear-gradient(to top, #8b5cf6, #c4b5fd);
          border-radius: 2px;
          z-index: 1;
          animation: shd-antenna-sway 2.4s ease-in-out infinite;
          transform-origin: bottom center;
        }
        .shd-antenna-dot {
          position: absolute;
          top: -5px;
          left: 50%;
          transform: translateX(-50%);
          width: 7px; height: 7px;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fef3c7 0%, #fbbf24 70%, #f59e0b 100%);
          box-shadow: 0 0 8px rgba(251, 191, 36, 0.8), 0 0 16px rgba(251, 191, 36, 0.5);
          animation: shd-antenna-glow 1.8s ease-in-out infinite;
        }

        /* Shadow on ground */
        .shd-shadow {
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px; height: 6px;
          background: radial-gradient(ellipse, rgba(0,0,0,0.18) 0%, transparent 70%);
          z-index: -1;
          animation: shd-shadow-scale 2.4s ease-in-out infinite;
        }

        /* Open state — transform to red close button */
        .shd-open .shd-body {
          background: radial-gradient(circle at 30% 25%, #fb7185 0%, #e11d48 60%, #9f1239 100%);
          animation: none;
          transform: rotate(90deg);
        }
        .shd-open .shd-antenna { display: none; }

        /* Keyframes */
        @keyframes shd-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes shd-wobble {
          0%, 100% { transform: rotate(-3deg); }
          50%      { transform: rotate(3deg); }
        }
        @keyframes shd-blink {
          0%, 92%, 100% { transform: scaleY(1); }
          94%, 98%      { transform: scaleY(0.1); }
        }
        @keyframes shd-cheek-glow {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        @keyframes shd-antenna-sway {
          0%, 100% { transform: translateX(-50%) rotate(-8deg); }
          50%      { transform: translateX(-50%) rotate(8deg); }
        }
        @keyframes shd-antenna-glow {
          0%, 100% { box-shadow: 0 0 6px rgba(251, 191, 36, 0.7), 0 0 12px rgba(251, 191, 36, 0.5); transform: translateX(-50%) scale(1); }
          50%      { box-shadow: 0 0 14px rgba(251, 191, 36, 1), 0 0 28px rgba(251, 191, 36, 0.85); transform: translateX(-50%) scale(1.2); }
        }
        @keyframes shd-shadow-scale {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.6; }
          50%      { transform: translateX(-50%) scale(0.85); opacity: 0.4; }
        }
        @keyframes shd-aura-pulse {
          0%, 100% { transform: scale(1);   opacity: 0.6; }
          50%      { transform: scale(1.18); opacity: 1; }
        }
        @keyframes shd-halo-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes shd-sparkle-twinkle {
          0%, 100% { opacity: 0.4; filter: blur(0px); }
          50%      { opacity: 1;   filter: blur(0.5px); }
        }
      `}</style>
    </>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const supabase  = useRef(createClient()).current
  const emp       = user?.employee as any
  const role      = (user as any)?.role || ""
  const isManager        = ["manager","hr_admin","super_admin"].includes(role)
  const isAdmin          = ["hr_admin","super_admin"].includes(role)
  const isEquipmentAdmin = ["equipment_admin","hr_admin","super_admin"].includes(role)
  // ผู้ที่ได้รับสิทธิ์ประเมิน (additional / KPI / direct manager) แต่ role=employee
  // ให้แสดงปุ่ม "TL" และเข้า /manager ได้
  const isEvaluator      = isManager || !!(user as any)?.is_evaluator
  const empId     = (user as any)?.employee_id ?? emp?.id
  const [unread, setUnread] = useState(0)
  const [unreadAnn, setUnreadAnn] = useState(0)
  const [unreadChat, setUnreadChat] = useState(0)

  useEffect(() => {
    if (!empId) return
    const fetchCount = () =>
      supabase.from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("employee_id", empId).eq("is_read", false)
        .then(({ count: c }) => setUnread(c ?? 0))
    fetchCount()
    const ch = supabase.channel(`badge-${empId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications",
        filter: `employee_id=eq.${empId}` }, fetchCount)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [empId])

  useEffect(() => {
    fetch("/api/announcements").then(r => r.json()).then(d => setUnreadAnn(d.unreadCount ?? 0)).catch(() => {})
    fetch("/api/chat").then(r => r.json()).then(d => setUnreadChat(d.unreadCount ?? 0)).catch(() => {})
  }, [pathname])

  useEffect(() => {
    if (pathname === "/app/notifications") setUnread(0)
  }, [pathname])

  const initials = emp?.first_name_th?.[0] ?? (user as any)?.email?.[0]?.toUpperCase() ?? "U"
  const displayName = emp ? `${emp.first_name_th} ${emp.last_name_th}` : (user as any)?.email?.split("@")[0] ?? "HRMS"

  // ทุกหน้าใน /app/training/* + /app/branch-eval/manage/* ใช้ responsive layout
  // (เดสก์ท็อป ≥1024 = เต็มจอ, มือถือ ≤430px = column เหมือนเดิม)
  const isWideLayout =
    pathname.startsWith("/app/training") ||
    pathname.startsWith("/app/branch-eval/manage")

  return (
    <div className={isWideLayout ? "responsive-container" : "mobile-container"}>
      <header className={`bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm ${isWideLayout ? "lg:px-8" : ""}`}>
        <Link href="/app/profile" className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center shadow-sm">
              {emp?.avatar_url
                ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover"/>
                : <span className="text-white text-sm font-black">{initials}</span>}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 border-2 border-white rounded-full"/>
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-[13px] font-black text-slate-800 leading-none truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5 truncate">{emp?.position?.name ?? role}</p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isAdmin && (
            <Link href="/admin/dashboard"
              className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm shadow-blue-200 hover:shadow-md hover:scale-105 transition-all active:scale-95">
              <Shield size={10}/><span>Admin</span>
            </Link>
          )}
          {!isAdmin && isEvaluator && (
            <Link href="/manager/dashboard"
              className="flex items-center gap-1.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm shadow-violet-200 hover:shadow-md hover:scale-105 transition-all active:scale-95">
              <Users size={10}/><span>TL</span>
            </Link>
          )}
          {isEquipmentAdmin && (
            <Link href="/equipment/dashboard"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-sm shadow-amber-200 hover:shadow-md hover:scale-105 transition-all active:scale-95">
              <Package size={10}/><span>อุปกรณ์</span>
            </Link>
          )}
          <Link href="/app/notifications" className="relative w-9 h-9 flex items-center justify-center rounded-2xl hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-500"/>
            {unread > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        </div>
      </header>

      <main className="pb-20 min-h-[calc(100vh-60px)]">{children}</main>

      <AssistiveTouch unreadAnn={unreadAnn}/>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white/95 backdrop-blur-sm border-t border-slate-100 safe-bottom z-40">
        <div className="flex px-1 py-1">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/app/dashboard" && pathname.startsWith(href))
            return (
              <Link key={href} href={href} className="flex-1 flex flex-col items-center gap-0.5 py-2 relative">
                <div className="relative">
                  <Icon size={18} strokeWidth={active ? 2.5 : 1.5}
                    style={{ color: active ? "#3b82f6" : "#cbd5e1", transition:"color .2s ease" }}/>
                  {href === "/app/announcements" && unreadAnn > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm">
                      {unreadAnn > 99 ? "99+" : unreadAnn}
                    </span>
                  )}
                  {href === "/app/chat" && unreadChat > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[14px] h-3.5 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center px-0.5 shadow-sm">
                      {unreadChat > 99 ? "99+" : unreadChat}
                    </span>
                  )}
                </div>
                <span style={{ fontSize:9, fontWeight: active ? 800 : 500, color: active ? "#3b82f6" : "#cbd5e1", transition:"color .2s ease" }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
