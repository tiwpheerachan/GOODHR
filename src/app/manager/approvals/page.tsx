"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { useLanguage, useEmployeeName, useLeaveTypeName } from "@/lib/i18n"
import { createClient } from "@/lib/supabase/client"
import { Check, X, Clock, CalendarDays, Loader2, UserX, ChevronDown, ChevronUp, Bell, ArrowRightLeft, Paperclip, AlertTriangle, Users, Camera, MapPin } from "lucide-react"
import toast from "react-hot-toast"
import { format } from "date-fns"
import { th, enUS, zhCN } from "date-fns/locale"

type Tab = "leave" | "overtime" | "adjustment" | "resignation" | "shift_change" | "offsite"

const DATE_LOCALES = { th, en: enUS, cn: zhCN } as const

export default function ApprovalsPage() {
  const { user } = useAuth()
  const { t, T, lang } = useLanguage()
  const empName = useEmployeeName()
  const leaveTypeName = useLeaveTypeName()
  const [tab, setTab] = useState<Tab>("leave")
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [counts, setCounts] = useState({ leave: 0, overtime: 0, adjustment: 0, resignation: 0, shift_change: 0, offsite: 0 })
  // ── ป้องกัน double-click: เก็บ ID ที่ดำเนินการแล้ว ──
  const processedRef = useRef(new Set<string>())
  // ── realtime: แสดง badge "คำร้องใหม่" ──
  const [newRequestAlert, setNewRequestAlert] = useState(false)
  // ── super_admin toggle: "myteam" = เฉพาะทีม, "company" = ทั้งบริษัท ──
  const isSuperAdmin = (user as any)?.role === "super_admin"
  const [viewMode, setViewMode] = useState<"myteam" | "company">("myteam")
  // ── Team quota cache for leave items ──
  const [quotaCache, setQuotaCache] = useState<Record<string, { team_size: number; working: number; on_leave: number; pending_leave: number; quota_pct: number; quota_ok: boolean }>>({})

  const fetchQuotaForDate = useCallback(async (date: string) => {
    if (quotaCache[date]) return
    try {
      const res = await fetch("/api/leave/team-quota", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      })
      const json = await res.json()
      if (res.ok && !json.error) {
        setQuotaCache(prev => ({ ...prev, [date]: json }))
      }
    } catch {}
  }, [quotaCache])

  // ── helpers ──────────────────────────────────────────────────────────────
  const fmtTime = (iso?: string | null) => {
    if (!iso) return "--:--"
    return new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Bangkok" })
  }

  const fmtDate = (dateStr?: string | null, fmt = "d MMM") => {
    if (!dateStr) return "-"
    const d = new Date(dateStr + "T00:00:00")
    if (isNaN(d.getTime())) return "-"
    return format(d, fmt, { locale: DATE_LOCALES[lang] || th })
  }

  const Avatar = ({ emp, size = "sm", bgColor = "bg-gray-100", textColor = "text-gray-600" }: {
    emp: any; size?: "sm" | "md"; bgColor?: string; textColor?: string
  }) => {
    const dim = size === "md" ? "w-10 h-10" : "w-9 h-9"
    return (
      <div className={`${dim} rounded-full ${bgColor} ${textColor} flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden`}>
        {emp?.avatar_url
          ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
          : emp?.first_name_th?.[0]}
      </div>
    )
  }

  // ── load items ────────────────────────────────────────────────────────────
  const loadItems = async () => {
    const supabase = createClient()
    const role = (user as any)?.role ?? "employee"
    const empId: string | undefined = (user as any)?.employee_id ?? (user as any)?.employee?.id
    let companyId: string | undefined =
      (user as any)?.company_id ?? (user as any)?.employee?.company_id ?? (user as any)?.employee?.company?.id

    if (!companyId && empId) {
      const { data: empRow } = await supabase.from("employees").select("company_id").eq("id", empId).single()
      companyId = empRow?.company_id
    }
    if (!companyId) {
      const { data: co } = await supabase.from("companies").select("id").limit(1).single()
      companyId = co?.id
    }
    if (!companyId) return
    setLoading(true)

    try {
      const isAdminRole = ["super_admin", "hr_admin"].includes(role)
      // super_admin สามารถเลือก viewMode ได้ | hr_admin เห็นทั้งบริษัทเสมอ | manager เห็นเฉพาะทีม
      const useCompanyWide = isAdminRole && (role !== "super_admin" || viewMode === "company")

      let teamIds: string[] = []
      if (!useCompanyWide && empId) {
        const { data: teamRows } = await supabase
          .from("employee_manager_history").select("employee_id")
          .eq("manager_id", empId).is("effective_to", null)
        teamIds = (teamRows ?? []).map((r: any) => String(r.employee_id))
      }

      const fetchPending = async (table: string, selectStr: string) => {
        if (useCompanyWide) {
          return supabase.from(table).select(selectStr)
            .eq("company_id", companyId).eq("status", "pending")
            .order("created_at", { ascending: true })
        }
        if (teamIds.length === 0) return { data: [], error: null }
        return supabase.from(table).select(selectStr)
          .in("employee_id", teamIds).eq("status", "pending")
          .order("created_at", { ascending: true })
      }

      if (tab === "leave") {
        const { data, error } = await fetchPending(
          "leave_requests",
          "*, employee:employees!employee_id(id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code,avatar_url,position:positions(name)), leave_type:leave_types(*)"
        )
        if (error) toast.error(error.message)
        setItems(data ?? [])

      } else if (tab === "overtime") {
        const { data, error } = await fetchPending(
          "overtime_requests",
          "*, employee:employees!employee_id(id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code,avatar_url,position:positions(name))"
        )
        if (error) toast.error(error.message)
        setItems(data ?? [])

      } else if (tab === "adjustment") {
        const { data, error } = await fetchPending(
          "time_adjustment_requests",
          "*, employee:employees!employee_id(id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code,avatar_url,position:positions(name),department:departments(name))"
        )
        if (error) { toast.error(error.message); setItems([]); return }
        if (!data || data.length === 0) { setItems([]); return }
        const enriched = await Promise.all(data.map(async (item: any) => {
          const { data: rec } = await supabase.from("attendance_records")
            .select("clock_in, clock_out, late_minutes, status")
            .eq("employee_id", item.employee_id).eq("work_date", item.work_date).maybeSingle()
          return { ...item, actual_record: rec }
        }))
        setItems(enriched)

      } else if (tab === "resignation") {
        let q = supabase.from("resignation_requests")
          .select(`*, employee:employees!resignation_requests_employee_id_fkey(
            id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code,avatar_url,hire_date,
            position:positions(name),department:departments(name))`)
          .eq("status", "pending_manager").order("created_at", { ascending: true })
        if (useCompanyWide) q = (q as any).eq("company_id", companyId)
        else if (teamIds.length > 0) q = (q as any).in("employee_id", teamIds)
        else { setItems([]); return }
        const { data, error } = await q
        if (error) toast.error(error.message)
        setItems(data ?? [])

      } else if (tab === "shift_change") {
        const res = await fetch(`/api/shifts/self-schedule/pending?status=pending`)
        const json = await res.json()
        if (json.success) {
          setItems(json.requests ?? [])
        } else {
          toast.error(json.error ?? t("approvals.toast_error"))
          setItems([])
        }

      } else if (tab === "offsite") {
        const { data, error } = await fetchPending(
          "offsite_checkin_requests",
          "*, employee:employees!employee_id(id,first_name_th,last_name_th,first_name_en,last_name_en,nickname,nickname_en,employee_code,avatar_url,position:positions(name),department:departments(name))"
        )
        if (error) toast.error(error.message)
        setItems(data ?? [])
      }
    } catch (e: any) {
      console.error("Load approvals error:", e)
      toast.error(t("approvals.toast_failed"))
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  // ── load badge counts ─────────────────────────────────────────────────────
  const loadCounts = async () => {
    const supabase = createClient()
    const empId: string | undefined = (user as any)?.employee_id ?? (user as any)?.employee?.id
    const role = (user as any)?.role ?? "employee"
    const isAdminRole = ["super_admin", "hr_admin"].includes(role)
    let companyId: string | undefined = (user as any)?.company_id ?? (user as any)?.employee?.company_id
    if (!companyId && empId) {
      const { data: empRow } = await supabase.from("employees").select("company_id").eq("id", empId).single()
      companyId = empRow?.company_id
    }
    if (!companyId) return

    const useCompanyWide = isAdminRole && (role !== "super_admin" || viewMode === "company")

    let teamIds: string[] = []
    if (!useCompanyWide && empId) {
      const { data: teamRows } = await supabase.from("employee_manager_history")
        .select("employee_id").eq("manager_id", empId).is("effective_to", null)
      teamIds = (teamRows ?? []).map((r: any) => String(r.employee_id))
    }

    const countQuery = (table: string, statusField = "pending") => {
      if (useCompanyWide) return supabase.from(table).select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", statusField)
      if (teamIds.length > 0) return supabase.from(table).select("id", { count: "exact", head: true }).in("employee_id", teamIds).eq("status", statusField)
      return Promise.resolve({ count: 0 })
    }

    const [lv, ot, adj, offsite] = await Promise.all([
      countQuery("leave_requests"),
      countQuery("overtime_requests"),
      countQuery("time_adjustment_requests"),
      countQuery("offsite_checkin_requests"),
    ])

    const resResult = await countQuery("resignation_requests", "pending_manager")
    const resCount = resResult.count ?? 0

    let shiftChangeCount = 0
    if (useCompanyWide) {
      const { count: sc } = await supabase.from("shift_change_requests")
        .select("id", { count: "exact", head: true }).eq("company_id", companyId).eq("status", "pending")
      shiftChangeCount = sc ?? 0
    } else if (teamIds.length > 0) {
      const { count: sc } = await supabase.from("shift_change_requests")
        .select("id", { count: "exact", head: true }).in("employee_id", teamIds).eq("status", "pending")
      shiftChangeCount = sc ?? 0
    }

    setCounts({ leave: lv.count ?? 0, overtime: ot.count ?? 0, adjustment: adj.count ?? 0, resignation: resCount, shift_change: shiftChangeCount, offsite: offsite.count ?? 0 })
  }

  // ── เปลี่ยน tab → reset state + โหลดใหม่ ──
  useEffect(() => {
    if (!user) return
    setActing(null)
    processedRef.current.clear()
    setNewRequestAlert(false)
    loadItems()
    loadCounts()
  }, [tab, user?.role, (user as any)?.employee_id, (user as any)?.employee?.id, viewMode])

  // ── Fetch quota for visible leave items ──
  useEffect(() => {
    if (tab !== "leave" || items.length === 0) return
    const dates = Array.from(new Set(items.map((i: any) => i.start_date).filter(Boolean)))
    dates.forEach(d => fetchQuotaForDate(d))
  }, [tab, items]) // eslint-disable-line

  // ── Realtime: ลูกน้องส่งคำร้องใหม่ → แสดง alert + auto reload ──
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    const tables = ["leave_requests", "overtime_requests", "time_adjustment_requests", "resignation_requests", "shift_change_requests"]
    const channel = supabase.channel("manager-approvals-realtime")

    for (const table of tables) {
      channel.on("postgres_changes", { event: "INSERT", schema: "public", table }, () => {
        setNewRequestAlert(true)
        loadCounts()
        // Auto-refresh ถ้า tab ตรง
        const tabMap: Record<string, Tab> = {
          leave_requests: "leave", overtime_requests: "overtime",
          time_adjustment_requests: "adjustment", resignation_requests: "resignation",
          shift_change_requests: "shift_change",
        }
        if (tabMap[table] === tab) {
          setTimeout(() => loadItems(), 500)
        }
      })
    }
    channel.subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user, tab])

  // ── helper: optimistic remove + ป้องกัน double-click ─────────────────────
  const optimisticRemove = (id: string) => {
    processedRef.current.add(id)
    setItems(prev => prev.filter(i => i.id !== id))
    setCounts(prev => ({ ...prev, [tab]: Math.max(0, prev[tab] - 1) }))
    // ── แจ้ง layout ให้ refresh badge ทันที ──
    if (typeof window !== "undefined") window.dispatchEvent(new Event("approval-action"))
  }

  // ── approve/reject leave & overtime ──────────────────────────────────────
  const handleLeaveOT = async (id: string, action: "approved" | "rejected") => {
    if (processedRef.current.has(id)) return  // ป้องกัน double-click
    setActing(id)
    const item = items.find(i => i.id === id)
    try {
      const res = await fetch("/api/admin/approvals", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: action === "approved" ? "approve" : "reject",
          request_id: id,
          request_type: tab === "leave" ? "leave" : "overtime",
          note: notes[id] || null,
        }),
      })
      const json = await res.json()
      if (!res.ok || json.error) { toast.error(json.error ?? t("approvals.toast_error")); setActing(null); return }

      // ✅ Optimistic: ลบออกจากลิสต์ทันที
      optimisticRemove(id)

      // ส่ง notification
      const supabase = createClient()
      const tbl = tab === "leave" ? "leave_requests" : "overtime_requests"
      if (item) {
        await supabase.from("notifications").insert({
          employee_id: item.employee_id, type: "leave",
          title: action === "approved" ? "คำร้องได้รับการอนุมัติ" : "คำร้องถูกปฏิเสธ",
          body: notes[id] || "", ref_table: tbl, ref_id: id,
        })
      }
      toast.success(action === "approved" ? t("approvals.toast_approved") : t("approvals.toast_rejected"))
    } catch (err: any) { toast.error(err.message || t("approvals.toast_failed")) }
    setActing(null)
  }

  // ── approve/reject adjustment ─────────────────────────────────────────────
  const handleAdjustment = async (id: string, action: "approve" | "reject") => {
    if (processedRef.current.has(id)) return  // ป้องกัน double-click
    setActing(id)
    const supabase = createClient()
    const item = items.find(i => i.id === id)
    try {
      const res = await fetch("/api/correction", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, request_id: id, review_note: notes[id] || null }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || t("approvals.toast_error"))

      // ✅ Optimistic: ลบออกจากลิสต์ทันที
      optimisticRemove(id)

      if (action === "approve" && json.updated) {
        const { late_minutes, status } = json.updated
        toast.success(status === "present"
          ? t("approvals.toast_adj_on_time")
          : t("approvals.toast_adj_still_late", { count: late_minutes }), { duration: 4000 })
      } else {
        toast.success(action === "approve" ? t("approvals.toast_approved") : t("approvals.toast_rejected"))
      }
      if (item) {
        await supabase.from("notifications").insert({
          employee_id: item.employee_id, type: "leave",
          title: action === "approve" ? "คำขอแก้ไขเวลาได้รับการอนุมัติ" : "คำขอแก้ไขเวลาถูกปฏิเสธ",
          body: notes[id] || "", ref_table: "time_adjustment_requests", ref_id: id,
        })
      }
    } catch (err: any) { toast.error(err.message) }
    setActing(null)
  }

  // ── approve/reject shift change ───────────────────────────────────────────
  const handleShiftChange = async (id: string, action: "approve" | "reject") => {
    if (processedRef.current.has(id)) return
    setActing(id)
    try {
      const res = await fetch("/api/shifts/self-schedule/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, request_id: id, review_note: notes[id] || null }),
      })
      const json = await res.json()
      if (json.success) {
        optimisticRemove(id)
        toast.success(action === "approve" ? t("approvals.toast_shift_approved") : t("approvals.toast_shift_rejected"))
      } else {
        toast.error(json.error || t("approvals.toast_error"))
      }
    } catch (err: any) { toast.error(err.message || t("approvals.toast_failed")) }
    setActing(null)
  }

  // ── approve/reject resignation ────────────────────────────────────────────
  const handleResignation = async (id: string, action: "approved" | "rejected") => {
    if (processedRef.current.has(id)) return  // ป้องกัน double-click
    setActing(id)
    const supabase = createClient()
    const empId = (user as any)?.employee_id ?? (user as any)?.employee?.id
    const nextStatus = action === "approved" ? "pending_hr" : "rejected"
    const { error } = await supabase.from("resignation_requests").update({
      status: nextStatus, manager_id: empId,
      manager_approved_at: new Date().toISOString(), manager_note: notes[id] || null,
    }).eq("id", id)
    if (error) { toast.error(error.message); setActing(null); return }

    // ✅ Optimistic: ลบออกจากลิสต์ทันที
    optimisticRemove(id)

    const item = items.find(i => i.id === id)
    if (item) {
      await supabase.from("notifications").insert({
        employee_id: item.employee_id, type: "resignation",
        title: action === "approved" ? "ใบลาออกผ่านหัวหน้าแล้ว รอ HR อนุมัติ" : "ใบลาออกถูกปฏิเสธจากหัวหน้า",
        body: notes[id] || "",
      })
      if (action === "approved") {
        const { data: hrList } = await supabase.from("users").select("employee_id")
          .in("role", ["hr_admin", "super_admin"]).eq("company_id", item.company_id).not("employee_id", "is", null)
        for (const h of hrList ?? []) {
          await supabase.from("notifications").insert({
            employee_id: h.employee_id, type: "resignation",
            title: `ใบลาออก ${item.employee?.first_name_th} ${item.employee?.last_name_th} รอ HR อนุมัติ`,
            body: `วันสุดท้าย ${fmtDate(item.last_work_date, "d MMM yyyy")}`,
          })
        }
      }
    }
    toast.success(action === "approved" ? t("approvals.toast_resign_sent_hr") : t("approvals.toast_resign_rejected"))
    setActing(null)
  }

  // ── shared components ─────────────────────────────────────────────────────
  const inputCls = "w-full mt-3 px-3 py-2.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-white transition-all placeholder:text-gray-400"

  const ActionButtons = ({ id, onReject, onApprove, approveLabel = undefined }: {
    id: string; onReject: () => void; onApprove: () => void; approveLabel?: string
  }) => {
    const label = approveLabel ?? t("approvals.approve")
    const isActing = acting === id
    const isProcessed = processedRef.current.has(id)
    const disabled = isActing || isProcessed

    if (isProcessed) {
      return (
        <div className="flex items-center justify-center gap-2 mt-3 py-3 rounded-xl bg-green-50 border border-green-200">
          <Check size={14} className="text-green-600" />
          <span className="text-sm font-semibold text-green-700">{t("approvals.processed")}</span>
        </div>
      )
    }

    return (
      <div className="flex gap-2 mt-3">
        <button onClick={onReject} disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 bg-white text-gray-500 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none">
          {isActing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
          {t("approvals.reject")}
        </button>
        <button onClick={onApprove} disabled={disabled}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm shadow-blue-200 disabled:opacity-50 disabled:pointer-events-none">
          {isActing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          {label}
        </button>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; color: string }[] = [
    { key: "leave",        label: t("approvals.tab_leave"),    color: "bg-sky-500" },
    { key: "overtime",     label: t("approvals.tab_ot"),       color: "bg-amber-500" },
    { key: "adjustment",   label: t("approvals.tab_adjustment"), color: "bg-violet-500" },
    { key: "offsite",      label: "นอกสถานที่",                color: "bg-teal-500" },
    { key: "shift_change", label: t("approvals.tab_shift_change"), color: "bg-emerald-500" },
    { key: "resignation",  label: t("approvals.tab_resignation"),   color: "bg-rose-500" },
  ]

  return (
    <div className="flex flex-col bg-gray-50 min-h-screen">

      {/* ── Header ── */}
      <div className="bg-white px-4 pt-5 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-bold text-gray-900 tracking-tight">{t("approvals.title")}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {!loading && (items.length > 0 ? t("approvals.pending_count", { count: items.length }) : t("approvals.no_pending"))}
            </p>
          </div>
          {newRequestAlert && (
            <button onClick={() => { setNewRequestAlert(false); loadItems(); loadCounts() }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-blue-600 animate-pulse hover:bg-blue-100 transition-colors">
              <Bell size={12} /> {t("approvals.new_request_alert")}
            </button>
          )}
        </div>

        {/* Toggle: ทีมของฉัน / ทั้งบริษัท (super_admin เท่านั้น) */}
        {isSuperAdmin && (
          <div className="mt-3 flex rounded-xl bg-gray-100 p-0.5">
            <button onClick={() => setViewMode("myteam")}
              className={"flex-1 py-1.5 text-xs font-bold rounded-lg transition-all " + (viewMode === "myteam" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}>
              {t("approvals.view_my_team")}
            </button>
            <button onClick={() => setViewMode("company")}
              className={"flex-1 py-1.5 text-xs font-bold rounded-lg transition-all " + (viewMode === "company" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400")}>
              {t("approvals.view_company")}
            </button>
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white px-4 pb-3 border-b border-gray-100">
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={"relative flex-1 py-2 text-xs font-semibold rounded-xl transition-all " +
                (tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600")}>
              {t.label}
              {counts[t.key] > 0 && (
                <span className={"absolute -top-1 -right-0.5 w-[18px] h-[18px] text-white text-[9px] font-black rounded-full flex items-center justify-center " + t.color}>
                  {counts[t.key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 pb-8">

        {loading && (
          <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">{t("approvals.loading")}</span>
          </div>
        )}

        {/* ── LEAVE ── */}
        {!loading && tab === "leave" && items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar emp={item.employee} bgColor="bg-sky-100" textColor="text-sky-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{empName(item.employee)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.employee?.position?.name}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{fmtDate(item.created_at?.split("T")[0])}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 mb-0.5">{t("approvals.type")}</p>
                  <p className="font-bold text-gray-800">{leaveTypeName(item.leave_type?.code) || item.leave_type?.name}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 mb-0.5">{t("approvals.amount")}</p>
                  <p className="font-bold text-gray-800">{item.total_days} {t("approvals.days_unit")}</p>
                </div>
              </div>
              <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                <p className="text-gray-400 mb-0.5">{t("approvals.date_range")}</p>
                <p className="font-semibold text-gray-700">{fmtDate(item.start_date)} – {fmtDate(item.end_date, "d MMM yyyy")}</p>
              </div>
              {item.reason && (
                <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                  <p className="text-gray-400 mb-0.5">{t("approvals.reason")}</p>
                  <p className="text-gray-700">{item.reason}</p>
                </div>
              )}
              {/* Quota warning banner */}
              {item.start_date && quotaCache[item.start_date] && !quotaCache[item.start_date].quota_ok && (
                <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-amber-700">{t("approvals.quota_low", { pct: quotaCache[item.start_date].quota_pct })}</p>
                    <p className="text-amber-600">{t("approvals.quota_detail", { size: quotaCache[item.start_date].team_size, working: quotaCache[item.start_date].working, leave: quotaCache[item.start_date].on_leave, pending: quotaCache[item.start_date].pending_leave })}</p>
                  </div>
                </div>
              )}
              {item.start_date && quotaCache[item.start_date] && quotaCache[item.start_date].quota_ok && (
                <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs">
                  <Users size={12} className="text-emerald-500 flex-shrink-0" />
                  <span className="text-emerald-700">{t("approvals.quota_ok", { pct: quotaCache[item.start_date].quota_pct, working: quotaCache[item.start_date].working, size: quotaCache[item.start_date].team_size })}</span>
                </div>
              )}

              {/* Multi-file attachments */}
              {(item.attachment_urls?.length > 0 ? item.attachment_urls : item.attachment_url ? [item.attachment_url] : []).map((url: string, idx: number) => (
                <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                  className="mt-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2.5 text-xs hover:bg-blue-100 transition-colors">
                  <Paperclip size={13} className="text-blue-500 flex-shrink-0" />
                  <span className="text-blue-700 font-semibold truncate">
                    {(item.attachment_names?.[idx]) || (item.attachment_name) || t("approvals.attachment_count", { idx: idx + 1 })}
                  </span>
                  <span className="text-blue-400 text-[10px] ml-auto flex-shrink-0">{t("approvals.view_file")}</span>
                </a>
              ))}

              <input placeholder={t("approvals.note_placeholder")} value={notes[item.id] || ""}
                onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                className={inputCls} />
              <ActionButtons id={item.id}
                onReject={() => handleLeaveOT(item.id, "rejected")}
                onApprove={() => handleLeaveOT(item.id, "approved")} />
            </div>
          </div>
        ))}

        {/* ── OVERTIME ── */}
        {!loading && tab === "overtime" && items.map(item => (
          <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Avatar emp={item.employee} bgColor="bg-amber-100" textColor="text-amber-600" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-tight">{empName(item.employee)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.employee?.position?.name}</p>
                </div>
                <span className="text-[11px] text-gray-400 shrink-0">{fmtDate(item.created_at?.split("T")[0])}</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 mb-0.5">{t("approvals.date_label")}</p>
                  <p className="font-bold text-gray-800">{fmtDate(item.work_date, "d MMM yyyy")}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                  <p className="text-gray-400 mb-0.5">{t("approvals.ot_time")}</p>
                  <p className="font-bold text-gray-800 tabular-nums">{fmtTime(item.ot_start)} – {fmtTime(item.ot_end)}</p>
                </div>
                <div className="bg-amber-50 rounded-xl px-3 py-2.5">
                  <p className="text-amber-500 mb-0.5">อัตรา OT</p>
                  <p className="font-bold text-amber-700">{item.ot_rate || 1.5}×</p>
                </div>
              </div>
              {item.reason && (
                <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                  <p className="text-gray-400 mb-0.5">{t("approvals.reason")}</p>
                  <p className="text-gray-700">{item.reason}</p>
                </div>
              )}

              <input placeholder={t("approvals.note_placeholder")} value={notes[item.id] || ""}
                onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                className={inputCls} />
              <ActionButtons id={item.id}
                onReject={() => handleLeaveOT(item.id, "rejected")}
                onApprove={() => handleLeaveOT(item.id, "approved")} />
            </div>
          </div>
        ))}

        {/* ── ADJUSTMENT ── */}
        {!loading && tab === "adjustment" && items.map(item => {
          const actual = item.actual_record
          const isLate = (actual?.late_minutes ?? 0) > 0
          const isOpen = expanded === item.id
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-4">
                <div className="flex items-start gap-3">
                  <Avatar emp={item.employee} bgColor="bg-violet-100" textColor="text-violet-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{empName(item.employee)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.employee?.position?.name} · {item.employee?.department?.name}</p>
                  </div>
                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[11px] text-gray-400">{fmtDate(item.created_at?.split("T")[0])}</span>
                    {isLate && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                        {t("approvals.late_minutes", { count: actual.late_minutes })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
                  <CalendarDays size={12} className="text-gray-400" />
                  <span className="font-semibold text-gray-700">{fmtDate(item.work_date, "EEEE d MMMM yyyy")}</span>
                </div>

                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 rounded-xl px-3 py-3 border border-gray-100">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-widest mb-2">{t("approvals.actual_time")}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-gray-400">{t("approvals.clock_in_short")}</span>
                        <span className="text-sm font-black tabular-nums text-gray-700">{fmtTime(actual?.clock_in)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-gray-400">{t("approvals.clock_out_short")}</span>
                        <span className="text-sm font-black tabular-nums text-gray-700">{fmtTime(actual?.clock_out)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-xl px-3 py-3 border border-blue-100">
                    <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-widest mb-2">{t("approvals.requested_time")}</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-blue-400">{t("approvals.clock_in_short")}</span>
                        <span className={"text-sm font-black tabular-nums " + (item.requested_clock_in ? "text-blue-700" : "text-gray-300")}>
                          {item.requested_clock_in ? fmtTime(item.requested_clock_in) : "--:--"}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-blue-400">{t("approvals.clock_out_short")}</span>
                        <span className={"text-sm font-black tabular-nums " + (item.requested_clock_out ? "text-blue-700" : "text-gray-300")}>
                          {item.requested_clock_out ? fmtTime(item.requested_clock_out) : "--:--"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <button onClick={() => setExpanded(isOpen ? null : item.id)}
                  className="mt-3 w-full flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5 hover:bg-gray-100 transition-colors">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Clock size={11} className="text-gray-400 shrink-0" />
                    <span className="truncate">{item.reason || t("approvals.no_reason")}</span>
                  </span>
                  {isOpen ? <ChevronUp size={12} className="text-gray-400 shrink-0" /> : <ChevronDown size={12} className="text-gray-400 shrink-0" />}
                </button>

                {isOpen && (
                  <input placeholder={t("approvals.note_placeholder")} value={notes[item.id] || ""}
                    onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                    className={inputCls} />
                )}

                <ActionButtons id={item.id}
                  onReject={() => handleAdjustment(item.id, "reject")}
                  onApprove={() => handleAdjustment(item.id, "approve")} />
              </div>
            </div>
          )
        })}

        {/* ── OFFSITE CHECK-IN ── */}
        {!loading && tab === "offsite" && items.map(item => {
          const emp = item.employee
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-gray-50">
                <Camera size={13} className="text-teal-500 shrink-0" />
                <span className="text-xs font-bold text-teal-600">
                  {item.check_type === "clock_in" ? "เช็คอิน" : "เช็คเอาท์"} นอกสถานที่
                </span>
                <span className="ml-auto text-[10px] text-gray-400">{fmtDate(item.work_date)}</span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar emp={emp} bgColor="bg-teal-100" textColor="text-teal-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{empName(emp)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{emp?.employee_code} · {emp?.department?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{fmtTime(item.checked_at)}</p>
                  </div>
                </div>

                {/* Photo */}
                {(item.photo_url || item.photo_stamped_url) && (
                  <div className="mt-3">
                    <img src={item.photo_stamped_url || item.photo_url} alt="offsite" className="w-full max-h-48 object-cover rounded-xl border border-gray-100" />
                  </div>
                )}

                {/* Location */}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <MapPin size={12} className="text-teal-500 shrink-0" />
                  {item.latitude && item.longitude ? (
                    <a href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noopener noreferrer"
                      className="text-teal-600 font-medium hover:underline">
                      {item.location_name || `${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`}
                    </a>
                  ) : (
                    <span className="text-gray-400">{item.location_name || "ไม่ระบุตำแหน่ง"}</span>
                  )}
                </div>

                {item.note && (
                  <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                    <p className="text-gray-400 mb-0.5">หมายเหตุ</p>
                    <p className="text-gray-700">{item.note}</p>
                  </div>
                )}

                <ActionButtons id={item.id}
                  onReject={async () => {
                    setActing(item.id)
                    try {
                      const res = await fetch("/api/checkin/offsite/review", {
                        method: "PATCH", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ request_id: item.id, action: "reject", reject_reason: notes[item.id] || "หัวหน้าปฏิเสธ" }),
                      })
                      if (!res.ok) throw new Error("ปฏิเสธไม่สำเร็จ")
                      optimisticRemove(item.id)
                      toast.success("ปฏิเสธแล้ว")
                    } catch (e: any) { toast.error(e.message) }
                    setActing(null)
                  }}
                  onApprove={async () => {
                    setActing(item.id)
                    try {
                      const res = await fetch("/api/checkin/offsite/review", {
                        method: "PATCH", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ request_id: item.id, action: "approve" }),
                      })
                      if (!res.ok) throw new Error("อนุมัติไม่สำเร็จ")
                      optimisticRemove(item.id)
                      toast.success("อนุมัติแล้ว")
                    } catch (e: any) { toast.error(e.message) }
                    setActing(null)
                  }}
                />
              </div>
            </div>
          )
        })}

        {/* ── SHIFT CHANGE ── */}
        {!loading && tab === "shift_change" && items.map(item => {
          const emp = item.employee
          const curShift = item.current_shift
          const reqShift = item.requested_shift
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-gray-50">
                <ArrowRightLeft size={13} className="text-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-emerald-600">{t("approvals.shift_change_title")}</span>
                <span className="ml-auto text-[10px] text-gray-400">{fmtDate(item.submitted_at?.split("T")[0])}</span>
              </div>
              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar emp={emp} bgColor="bg-emerald-100" textColor="text-emerald-600" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{empName(emp)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{emp?.employee_code}</p>
                  </div>
                </div>

                <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                  <p className="text-gray-400 mb-0.5">{t("approvals.date_label")}</p>
                  <p className="font-bold text-gray-800">{fmtDate(item.work_date, "EEEE d MMMM yyyy")}</p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                    <p className="text-gray-400 mb-0.5">{t("approvals.current_shift")}</p>
                    <p className="font-bold text-gray-700">
                      {item.current_assignment_type === "dayoff" ? t("approvals.day_off") :
                        curShift ? `${curShift.work_start?.substring(0,5)} - ${curShift.work_end?.substring(0,5)}` : "-"}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl px-3 py-2.5 border border-emerald-100">
                    <p className="text-emerald-500 mb-0.5">{t("approvals.requested_shift")}</p>
                    <p className="font-bold text-emerald-700">
                      {item.requested_assignment_type === "dayoff" ? t("approvals.day_off") :
                        reqShift ? `${reqShift.work_start?.substring(0,5)} - ${reqShift.work_end?.substring(0,5)}` : "-"}
                    </p>
                  </div>
                </div>

                {item.reason && (
                  <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                    <p className="text-gray-400 mb-0.5">{t("approvals.reason")}</p>
                    <p className="text-gray-700">{item.reason}</p>
                  </div>
                )}

                <input placeholder={t("approvals.note_placeholder")} value={notes[item.id] || ""}
                  onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                  className={inputCls} />
                <ActionButtons id={item.id}
                  onReject={() => handleShiftChange(item.id, "reject")}
                  onApprove={() => handleShiftChange(item.id, "approve")} />
              </div>
            </div>
          )
        })}

        {/* ── RESIGNATION ── */}
        {!loading && tab === "resignation" && items.map(item => {
          const isExpanded = expanded === item.id
          return (
            <div key={item.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-gray-50">
                <UserX size={13} className="text-rose-400 shrink-0" />
                <span className="text-xs font-bold text-rose-500">{t("approvals.resign_title")}</span>
                <span className="ml-auto text-[10px] text-gray-400">{fmtDate(item.created_at?.split("T")[0])}</span>
              </div>

              <div className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <Avatar emp={item.employee} size="md" bgColor="bg-rose-100" textColor="text-rose-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm leading-tight">{empName(item.employee)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.employee?.position?.name} · {item.employee?.department?.name}</p>
                    <p className="text-xs text-gray-400">
                      {t("approvals.employee_code")} {item.employee?.employee_code}
                      {item.employee?.hire_date ? ` · ${t("approvals.hire_date")} ${fmtDate(item.employee.hire_date, "d MMM yyyy")}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-gray-400 mb-0.5">{t("approvals.last_work_date")}</p>
                    <p className="font-bold text-gray-900">{fmtDate(item.last_work_date, "d MMM yyyy")}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2.5">
                    <p className="text-gray-400 mb-0.5">{t("approvals.effective_date")}</p>
                    <p className="font-bold text-gray-900">{fmtDate(item.effective_date, "d MMM yyyy")}</p>
                  </div>
                </div>

                <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2.5 text-xs">
                  <p className="text-gray-400 mb-1">{t("approvals.resign_reason_label")}</p>
                  <p className="font-semibold text-gray-700">
                    {(item.reasons ?? []).map((k: string) => (T as any).approvals?.resign_reasons?.[k] || k).join("  ·  ") || "-"}
                  </p>
                  {item.other_reason && <p className="text-gray-400 italic mt-1">&ldquo;{item.other_reason}&rdquo;</p>}
                </div>

                <button onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue-500 font-semibold hover:text-blue-700 transition-colors">
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {isExpanded ? t("approvals.hide_exit_interview") : t("approvals.show_exit_interview")}
                </button>

                {isExpanded && item.exit_interview && Object.keys(item.exit_interview).length > 0 && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs space-y-1.5">
                    {["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"].map((k, i) =>
                      item.exit_interview[k] ? (
                        <div key={k} className="flex gap-2">
                          <span className="text-blue-400 font-bold shrink-0">{t("approvals.exit_question", { num: i + 1 })}</span>
                          <span className="text-gray-700">{Array.isArray(item.exit_interview[k]) ? item.exit_interview[k].join(", ") : item.exit_interview[k]}</span>
                        </div>
                      ) : null
                    )}
                    {item.exit_interview.suggestion && (
                      <div className="flex gap-2">
                        <span className="text-blue-400 font-bold shrink-0">{t("approvals.exit_suggestion")}</span>
                        <span className="text-gray-600">{item.exit_interview.suggestion}</span>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  placeholder={t("approvals.note_placeholder_resign")}
                  value={notes[item.id] || ""}
                  onChange={e => setNotes(n => ({ ...n, [item.id]: e.target.value }))}
                  className={inputCls + " resize-none h-16"}
                />

                <ActionButtons id={item.id}
                  onReject={() => handleResignation(item.id, "rejected")}
                  onApprove={() => handleResignation(item.id, "approved")}
                  approveLabel={t("approvals.approve_send_hr")} />
              </div>
            </div>
          )
        })}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Clock size={28} strokeWidth={1.5} className="text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-400">{t("approvals.no_requests")}</p>
          </div>
        )}

      </div>
    </div>
  )
}