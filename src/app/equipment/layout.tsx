"use client"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  LayoutDashboard, Package, ClipboardList, FolderOpen,
  Menu, X, LogOut, ChevronRight,
} from "lucide-react"

const SIDEBAR = [
  { href: "/equipment/dashboard",  icon: LayoutDashboard, label: "ภาพรวม",      badge: null as string|null },
  { href: "/equipment/items",      icon: Package,         label: "รายการอุปกรณ์", badge: null as string|null },
  { href: "/equipment/requests",   icon: ClipboardList,   label: "คำขอยืม",      badge: null as string|null },
  { href: "/equipment/categories", icon: FolderOpen,      label: "หมวดหมู่",     badge: null as string|null },
]

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  hr_admin: "HR Admin",
  equipment_admin: "ผู้ดูแลอุปกรณ์",
}

export default function EquipmentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, loading: authLoading } = useAuth()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Load pending request count
  useEffect(() => {
    if (!user) return
    const companyId = user?.employee?.company_id || (user as any)?.company_id
    if (!companyId) return

    const load = async () => {
      const { count } = await supabase.from("equipment_requests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", companyId).eq("status", "pending")
      setPendingCount(count ?? 0)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [user]) // eslint-disable-line

  const items = SIDEBAR.map(s => ({
    ...s,
    badge: s.href === "/equipment/requests" && pendingCount > 0 ? String(pendingCount) : null,
  }))

  if (authLoading) return null

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar overlay (mobile) */}
      {open && <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <Package size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-slate-800">อุปกรณ์</p>
              <p className="text-[10px] text-slate-400">Equipment Management</p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} className="lg:hidden text-slate-400"><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {items.map(item => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + "/")
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active ? "bg-cyan-50 text-cyan-700 font-bold" : "text-slate-600 hover:bg-slate-50"}`}>
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{item.badge}</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-slate-100">
          <Link href="/app/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-50 mb-1">
            <ChevronRight size={14} /> User Mode
          </Link>
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-xs">
              {user?.employee?.first_name_th?.[0] || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">
                {user?.employee?.first_name_th} {user?.employee?.last_name_th}
              </p>
              <p className="text-[10px] text-slate-400">{ROLE_LABEL[(user as any)?.role] || (user as any)?.role}</p>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => window.location.href = "/login")}
              className="text-slate-400 hover:text-red-500"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100">
          <button onClick={() => setOpen(true)} className="text-slate-600"><Menu size={20} /></button>
          <span className="text-sm font-bold text-slate-700">อุปกรณ์</span>
          <Link href="/app/dashboard" className="text-xs text-slate-400">User Mode →</Link>
        </div>
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  )
}
