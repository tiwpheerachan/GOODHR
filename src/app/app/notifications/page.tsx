"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types/database"
import { Bell, CheckCheck, Trash2, RefreshCw, BellOff } from "lucide-react"
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns"
import { th } from "date-fns/locale"

// ── Config ──────────────────────────────────────────────────────────
const TYPE_CFG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  leave:        { icon: "📋", color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-100"   },
  attendance:   { icon: "⏰", color: "text-amber-600",  bg: "bg-amber-50",  border: "border-amber-100"  },
  payroll:      { icon: "💰", color: "text-emerald-600",bg: "bg-emerald-50",border: "border-emerald-100"},
  announcement: { icon: "📢", color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  system:       { icon: "⚙️", color: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200"  },
}
const DEFAULT_CFG = { icon: "🔔", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" }

function getTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    if (isToday(d))     return formatDistanceToNow(d, { locale: th, addSuffix: true })
    if (isYesterday(d)) return "เมื่อวาน " + format(d, "HH:mm")
    return format(d, "d MMM HH:mm", { locale: th })
  } catch { return "" }
}

// ── Group by date ──────────────────────────────────────────────────
function groupByDay(items: Notification[]): { label: string; items: Notification[] }[] {
  const map = new Map<string, Notification[]>()
  for (const n of items) {
    try {
      const d = new Date(n.created_at)
      const key = isToday(d) ? "วันนี้" : isYesterday(d) ? "เมื่อวาน" : format(d, "d MMMM yyyy", { locale: th })
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(n)
    } catch { /* skip */ }
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }))
}

export default function NotificationsPage() {
  const { user }   = useAuth()
  const supabase   = useRef(createClient()).current
  const empId      = (user as any)?.employee_id ?? (user as any)?.employee?.id

  const [items,   setItems]   = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<"all" | "unread">("all")

  // โหลด + mark all read ──────────────────────────────────────────
  const load = useCallback(async () => {
    if (!empId) return
    setLoading(true)
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("employee_id", empId)
      .order("created_at", { ascending: false })
      .limit(100)
    setItems((data as Notification[]) ?? [])
    setLoading(false)

    // ✅ mark all unread → read ทันทีที่เปิดหน้า
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("employee_id", empId)
      .eq("is_read", false)
  }, [empId]) // eslint-disable-line

  useEffect(() => { if (empId) load() }, [empId, load])

  // Realtime: รับการแจ้งเตือนใหม่แบบ live ─────────────────────────
  useEffect(() => {
    if (!empId) return
    const channel = supabase
      .channel(`notif-page-${empId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "notifications",
        filter: `employee_id=eq.${empId}`,
      }, payload => {
        const newItem = { ...payload.new, is_read: true } as Notification
        setItems(prev => [newItem, ...prev])
        // mark read ทันที
        supabase.from("notifications")
          .update({ is_read: true, read_at: new Date().toISOString() })
          .eq("id", newItem.id)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [empId]) // eslint-disable-line

  // mark single read ─────────────────────────────────────────────
  const markOne = async (id: string) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    await supabase.from("notifications").update({ is_read: true, read_at: new Date().toISOString() }).eq("id", id)
  }

  // delete single ────────────────────────────────────────────────
  const deleteOne = async (id: string) => {
    setItems(prev => prev.filter(n => n.id !== id))
    await supabase.from("notifications").delete().eq("id", id)
  }

  // clear all read ───────────────────────────────────────────────
  const clearRead = async () => {
    setItems(prev => prev.filter(n => !n.is_read))
    await supabase.from("notifications").delete().eq("employee_id", empId).eq("is_read", true)
  }

  const shown    = filter === "unread" ? items.filter(n => !n.is_read) : items
  const unread   = items.filter(n => !n.is_read).length
  const hasRead  = items.some(n => n.is_read)
  const grouped  = groupByDay(shown)

  return (
    <>
      <style>{`
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
        .notif-item { animation: slideIn 0.2s ease both; }
        .notif-swipe { transition: all 0.2s ease; }
      `}</style>

      <div className="min-h-screen bg-slate-50 pb-12">

        {/* ── Header ───────────────────────────────────────────── */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-5 pt-6 pb-14 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 80% 20%,#fff,transparent 60%)" }}/>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">การแจ้งเตือน</h1>
              <p className="text-blue-200 text-xs mt-0.5">
                {unread > 0 ? `ยังไม่อ่าน ${unread} รายการ` : "อ่านทั้งหมดแล้ว ✓"}
              </p>
            </div>
            <button onClick={load} disabled={loading}
              className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors">
              <RefreshCw size={16} className={`text-white ${loading ? "animate-spin" : ""}`}/>
            </button>
          </div>
        </div>

        <div className="px-4 -mt-8 space-y-3 relative z-10">

          {/* ── Filter + Actions ─────────────────────────────── */}
          <div className="bg-white rounded-2xl shadow-lg shadow-blue-100/50 p-1 flex border border-slate-100">
            {([ ["all","ทั้งหมด"], ["unread","ยังไม่อ่าน"] ] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  filter === k ? "bg-blue-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                }`}>
                {l}
                {k === "unread" && unread > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                    filter === "unread" ? "bg-white/30 text-white" : "bg-red-100 text-red-600"
                  }`}>{unread}</span>
                )}
              </button>
            ))}
          </div>

          {/* clear read button */}
          {hasRead && filter === "all" && (
            <div className="flex justify-end">
              <button onClick={clearRead}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-3 py-1.5 rounded-xl hover:bg-red-50">
                <Trash2 size={11}/> ลบที่อ่านแล้ว
              </button>
            </div>
          )}

          {/* ── Loading ────────────────────────────────────────── */}
          {loading && (
            <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
              <RefreshCw size={16} className="animate-spin"/><span className="text-sm">กำลังโหลด...</span>
            </div>
          )}

          {/* ── Empty ─────────────────────────────────────────── */}
          {!loading && shown.length === 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 py-16 text-center shadow-sm">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BellOff size={28} className="text-slate-300"/>
              </div>
              <p className="text-slate-500 font-semibold">
                {filter === "unread" ? "ไม่มีการแจ้งเตือนที่ยังไม่อ่าน" : "ไม่มีการแจ้งเตือน"}
              </p>
              <p className="text-slate-400 text-xs mt-1">ระบบจะแจ้งเตือนเมื่อมีการเคลื่อนไหว</p>
            </div>
          )}

          {/* ── Grouped list ──────────────────────────────────── */}
          {!loading && grouped.map(group => (
            <div key={group.label}>
              {/* group header */}
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">
                {group.label}
              </p>

              <div className="space-y-2">
                {group.items.map((n, i) => {
                  const cfg = TYPE_CFG[n.type] ?? DEFAULT_CFG
                  return (
                    <div key={n.id}
                      className={`notif-item bg-white rounded-2xl border overflow-hidden shadow-sm transition-all
                        ${!n.is_read ? `${cfg.border} ring-1 ${cfg.border.replace("border-","ring-")}` : "border-slate-100"}
                      `}
                      style={{ animationDelay: `${i * 0.03}s` }}
                      onClick={() => !n.is_read && markOne(n.id)}
                    >
                      <div className="flex items-start gap-3 px-4 py-3.5">
                        {/* icon */}
                        <div className={`w-10 h-10 rounded-2xl ${cfg.bg} flex items-center justify-center text-lg flex-shrink-0 shadow-sm`}>
                          {cfg.icon}
                        </div>

                        {/* content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-snug ${!n.is_read ? "font-black text-slate-800" : "font-semibold text-slate-600"}`}>
                              {n.title}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!n.is_read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"/>
                              )}
                              <button onClick={e => { e.stopPropagation(); deleteOne(n.id) }}
                                className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-400 text-slate-300 transition-all">
                                <Trash2 size={11}/>
                              </button>
                            </div>
                          </div>
                          {(n as any).body && (
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{(n as any).body}</p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-[10px] text-slate-400">{getTimestamp(n.created_at)}</p>
                            {!n.is_read && (
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                                ใหม่
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {/* stats footer */}
          {!loading && items.length > 0 && (
            <div className="flex items-center justify-center gap-4 py-2">
              <p className="text-[10px] text-slate-400">
                ทั้งหมด {items.length} รายการ · อ่านแล้ว {items.filter(n => n.is_read).length}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}