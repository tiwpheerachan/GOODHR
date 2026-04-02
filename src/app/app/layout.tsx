"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  Home, Clock, Calendar, CalendarDays, CalendarClock, User, Bell, Users, Shield, Target,
  Megaphone, FileText, Grip, X, MessageCircle, Package,
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
      x: Math.max(8, Math.min(window.innerWidth - 56, dragRef.current.startPosX + dx)),
      y: Math.max(60, Math.min(window.innerHeight - 120, dragRef.current.startPosY + dy)),
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
        <div className={`w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center cursor-pointer transition-all duration-200 ${
          open
            ? "bg-slate-800 scale-110"
            : "bg-gradient-to-br from-indigo-500 to-violet-600 hover:shadow-2xl hover:scale-105 opacity-80 hover:opacity-100"
        }`}>
          {open ? <X size={20} className="text-white"/> : <Grip size={20} className="text-white"/>}
        </div>
        {!open && unreadAnn > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-sm animate-pulse">
            {unreadAnn}
          </span>
        )}
      </div>

      <style jsx global>{`
        @keyframes scaleIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
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

  return (
    <div className="mobile-container">
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 shadow-sm">
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
          {!isAdmin && isManager && (
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
