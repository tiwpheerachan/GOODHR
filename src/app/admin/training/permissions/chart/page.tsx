"use client"
import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft, Loader2, Network, Shield, ShieldCheck, Eye, Users,
  Layers, ChevronDown, ChevronRight, Crown, Building2, Briefcase,
  Search, X, Sparkles, RefreshCw, BookOpen, Globe2, Plus, Trash2, Check, UserPlus,
} from "lucide-react"
import toast from "react-hot-toast"
import { createClient } from "@/lib/supabase/client"

type Emp = {
  id: string
  first_name_th: string; last_name_th: string
  nickname?: string | null; employee_code?: string | null
  avatar_url?: string | null
  position?: { name: string } | null
  department?: { name: string } | null
}
type Perm = {
  id: string; role: string; scope: string | null; channel_id: string | null
  granted_at: string; employee: Emp | null
}
type Viewer = Perm & { subordinates: Emp[] }
type ChannelBlock = {
  channel: { id: string; name: string; brand?: string | null; thumbnail_url?: string | null; description?: string | null }
  supervisors: Perm[]
  viewers: Viewer[]
  stats: { course_count: number; total_enrollments: number }
}

type AddTarget = {
  role: "training_admin" | "training_supervisor" | "training_viewer"
  channelId: string | null
  channelName?: string
  scope?: "all" | "subordinates"
}

type AddSubordinatesTarget = {
  permissionId: string
  viewerName: string
  existingIds: string[]   // already-assigned learner ids (to hide)
}

export default function TrainingPermissionsChartPage() {
  const [data, setData] = useState<{ training_admins: Perm[]; channels: ChannelBlock[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [expandedViewer, setExpandedViewer] = useState<Set<string>>(new Set())
  const [me, setMe] = useState<any>(null)
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null)
  const [addSubTarget, setAddSubTarget] = useState<AddSubordinatesTarget | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [busySubKey, setBusySubKey] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [chart, meRes] = await Promise.all([
      fetch("/api/training/permissions/chart").then(r => r.json()),
      fetch("/api/training/me").then(r => r.json()),
    ])
    setData(chart); setMe(meRes); setLoading(false)
  }
  useEffect(() => { load() }, [])

  const toggleViewer = (id: string) => {
    setExpandedViewer(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  // ── Edit handlers ─────────────────────────────────────────────
  const revoke = async (perm: Perm) => {
    const who = perm.employee
      ? `${perm.employee.first_name_th} ${perm.employee.last_name_th}`
      : "คนนี้"
    if (!confirm(`ถอนสิทธิ์ของ ${who}?`)) return
    setBusyId(perm.id)
    const t = toast.loading("กำลังถอนสิทธิ์...")
    try {
      const res = await fetch(`/api/training/permissions?id=${perm.id}`, { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ถอนไม่สำเร็จ", { id: t }); return }
      toast.success("ถอนสิทธิ์แล้ว", { id: t })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "ถอนไม่สำเร็จ", { id: t })
    } finally { setBusyId(null) }
  }

  const removeSubordinate = async (permissionId: string, learnerId: string, learnerName: string) => {
    if (!confirm(`เอา ${learnerName} ออกจากลูกน้องในสาย?`)) return
    const key = `${permissionId}::${learnerId}`
    setBusySubKey(key)
    const t = toast.loading("กำลังลบ...")
    try {
      const res = await fetch(`/api/training/permissions/subordinates?permission_id=${permissionId}&employee_id=${learnerId}`,
        { method: "DELETE" })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "ลบไม่สำเร็จ", { id: t }); return }
      toast.success("ลบแล้ว", { id: t })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "ลบไม่สำเร็จ", { id: t })
    } finally { setBusySubKey(null) }
  }

  const changeViewerScope = async (perm: Perm, scope: "all" | "subordinates") => {
    setBusyId(perm.id)
    const t = toast.loading("กำลังบันทึก...")
    try {
      const res = await fetch("/api/training/permissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: perm.id, scope }),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "เปลี่ยนไม่สำเร็จ", { id: t }); return }
      toast.success(`เปลี่ยนเป็น ${scope === "all" ? "ทุกคนในช่อง" : "เฉพาะลูกน้อง"} แล้ว`, { id: t })
      await load()
    } catch (e: any) {
      toast.error(e?.message || "เปลี่ยนไม่สำเร็จ", { id: t })
    } finally { setBusyId(null) }
  }

  // permission helpers based on current user
  const isBaseAdmin = !!me?.is_base_admin
  const isTrainingAdmin = !!me?.is_training_admin
  const supervisorChannels: string[] = me?.supervisor_channel_ids ?? []

  const canRevoke = (perm: Perm) => {
    if (isBaseAdmin || isTrainingAdmin) return true
    if (perm.role === "training_viewer" && perm.channel_id && supervisorChannels.includes(perm.channel_id)) return true
    return false
  }
  const canEditScope = canRevoke
  const canAddSupervisor = isBaseAdmin || isTrainingAdmin
  const canAddViewer = (channelId: string) =>
    isBaseAdmin || isTrainingAdmin || supervisorChannels.includes(channelId)
  const canAddAdmin = isBaseAdmin
  const showEditControls = isBaseAdmin || isTrainingAdmin || (supervisorChannels.length > 0)

  // Filter channels by search (matches channel name/brand or any name within)
  const filteredChannels = useMemo(() => {
    if (!data) return []
    const s = search.trim().toLowerCase()
    if (!s) return data.channels
    return data.channels.filter(cb => {
      const haystack = [
        cb.channel.name, cb.channel.brand ?? "",
        ...cb.supervisors.map(p => empName(p.employee)),
        ...cb.viewers.flatMap(v => [empName(v.employee), ...v.subordinates.map(e => empName(e))]),
      ].join(" ").toLowerCase()
      return haystack.includes(s)
    })
  }, [data, search])

  if (loading) return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="h-12 bg-slate-100 rounded-xl animate-pulse mb-4" />
      <div className="grid gap-4">
        {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 rounded-2xl animate-pulse" />)}
      </div>
    </div>
  )

  if (!data) return (
    <div className="p-6 text-center text-slate-400">โหลดข้อมูลไม่สำเร็จ</div>
  )

  const totalViewers = data.channels.reduce((s, c) => s + c.viewers.length, 0)
  const totalSupervisors = data.channels.reduce((s, c) => s + c.supervisors.length, 0)

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-4 pb-32">
      <Link href="/admin/training/permissions" className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> สิทธิ์ระบบเรียนรู้
      </Link>

      {/* Title bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 lg:p-5 shadow-sm">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Network size={22} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-wider text-slate-400">PERMISSIONS CHART</p>
              <h1 className="text-xl lg:text-2xl font-black text-slate-800">ผังสิทธิ์ระบบเรียนรู้</h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {data.training_admins.length} admin · {totalSupervisors} supervisor · {totalViewers} viewer · {data.channels.length} ช่อง
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/admin/training/permissions"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
              จัดการสิทธิ์ →
            </Link>
            <button onClick={load}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50">
              <RefreshCw size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Search + legend */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-2 flex-wrap shadow-sm">
        <div className="relative flex-1 min-w-44">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาช่อง · พนักงาน · ลูกน้อง..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm outline-none focus:border-indigo-400" />
        </div>
        {search && (
          <button onClick={() => setSearch("")} className="text-xs text-slate-500 hover:text-rose-600 px-2 inline-flex items-center gap-1">
            <X size={11} /> ล้าง
          </button>
        )}
        <div className="flex items-center gap-2 text-[10px] ml-auto flex-wrap">
          <LegendChip color="rose" icon={<Shield size={9} />} label="Training Admin" />
          <LegendChip color="amber" icon={<ShieldCheck size={9} />} label="Supervisor (CRUD)" />
          <LegendChip color="sky" icon={<Eye size={9} />} label="Viewer · all" />
          <LegendChip color="emerald" icon={<Users size={9} />} label="Viewer · subordinates" />
        </div>
      </div>

      {/* ── Global Training Admins (above all channels) ── */}
      {(data.training_admins.length > 0 || canAddAdmin) && (
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-2xl border border-rose-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <Crown size={13} className="text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="font-black text-rose-900 text-sm">🛡 Training Admin (เห็นทุก channel)</p>
              <p className="text-[11px] text-rose-700">CRUD ได้ทุกอย่าง · มอบสิทธิ์ได้</p>
            </div>
            <span className="px-2 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black">
              {data.training_admins.length} คน
            </span>
            {canAddAdmin && (
              <button onClick={() => setAddTarget({ role: "training_admin", channelId: null })}
                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black inline-flex items-center gap-1">
                <Plus size={11} /> เพิ่ม Admin
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {data.training_admins.map(p => p.employee && (
              <EmpChip key={p.id} emp={p.employee} variant="rose"
                onRevoke={canRevoke(p) ? () => revoke(p) : undefined}
                busy={busyId === p.id} />
            ))}
            {data.training_admins.length === 0 && (
              <p className="text-[11px] text-rose-700 italic">— ยังไม่มี Training Admin —</p>
            )}
          </div>
        </div>
      )}

      {/* ── Channels ── */}
      {filteredChannels.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-16 text-center">
          <Layers size={36} className="mx-auto mb-2 text-slate-300" />
          <p className="font-black text-slate-700">{search ? "ไม่พบช่อง" : "ยังไม่มีช่อง"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredChannels.map(cb => (
            <ChannelTree key={cb.channel.id} block={cb}
              expandedViewer={expandedViewer} onToggleViewer={toggleViewer}
              canAddSupervisor={canAddSupervisor}
              canAddViewer={canAddViewer(cb.channel.id)}
              onAddSupervisor={() => setAddTarget({
                role: "training_supervisor", channelId: cb.channel.id, channelName: cb.channel.name,
              })}
              onAddViewer={(scope) => setAddTarget({
                role: "training_viewer", channelId: cb.channel.id, channelName: cb.channel.name, scope,
              })}
              canRevoke={canRevoke}
              onRevoke={revoke}
              canEditScope={canEditScope}
              onChangeViewerScope={changeViewerScope}
              onAddSubordinates={(v) => setAddSubTarget({
                permissionId: v.id,
                viewerName: `${v.employee?.first_name_th ?? ""} ${v.employee?.last_name_th ?? ""}`.trim(),
                existingIds: v.subordinates.map(s => s.id),
              })}
              onRemoveSubordinate={removeSubordinate}
              busyId={busyId}
              busySubKey={busySubKey}
            />
          ))}
        </div>
      )}

      {/* Add permission modal */}
      {addTarget && (
        <AddPermissionModal
          target={addTarget}
          onClose={() => setAddTarget(null)}
          onSuccess={async () => { setAddTarget(null); await load() }}
        />
      )}

      {/* Add subordinates modal */}
      {addSubTarget && (
        <AddSubordinatesModal
          target={addSubTarget}
          onClose={() => setAddSubTarget(null)}
          onSuccess={async () => { setAddSubTarget(null); await load() }}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Channel block — channel card + tree branches
// ─────────────────────────────────────────────────────────────────
function ChannelTree({
  block, expandedViewer, onToggleViewer,
  canAddSupervisor, canAddViewer, onAddSupervisor, onAddViewer,
  canRevoke, onRevoke, canEditScope, onChangeViewerScope,
  onAddSubordinates, onRemoveSubordinate,
  busyId, busySubKey,
}: {
  block: ChannelBlock
  expandedViewer: Set<string>
  onToggleViewer: (id: string) => void
  canAddSupervisor: boolean
  canAddViewer: boolean
  onAddSupervisor: () => void
  onAddViewer: (scope: "subordinates" | "all") => void
  canRevoke: (p: Perm) => boolean
  onRevoke: (p: Perm) => void
  canEditScope: (p: Perm) => boolean
  onChangeViewerScope: (p: Perm, scope: "all" | "subordinates") => void
  onAddSubordinates: (v: Viewer) => void
  onRemoveSubordinate: (permissionId: string, learnerId: string, learnerName: string) => void
  busyId: string | null
  busySubKey: string | null
}) {
  const { channel, supervisors, viewers, stats } = block
  const isOrphan = supervisors.length === 0 && viewers.length === 0
  const viewersAll = viewers.filter(v => v.scope === "all")
  const viewersSub = viewers.filter(v => v.scope === "subordinates")
  const canEditAnything = canAddSupervisor || canAddViewer

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Channel header */}
      <div className="relative p-4 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 text-white">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-center gap-3 flex-wrap">
          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center overflow-hidden">
            {channel.thumbnail_url
              ? <img src={channel.thumbnail_url} alt="" className="w-full h-full object-cover" />
              : <Layers size={22} />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[10px] font-bold tracking-wider opacity-80">CHANNEL</p>
              {channel.brand && <span className="text-[10px] font-black opacity-90">· {channel.brand}</span>}
            </div>
            <h3 className="text-lg font-black truncate">{channel.name}</h3>
            <div className="flex items-center gap-3 text-[11px] opacity-90 mt-0.5">
              <span className="flex items-center gap-1"><BookOpen size={11} /> {stats.course_count} คอร์ส</span>
              <span className="flex items-center gap-1"><Users size={11} /> {stats.total_enrollments} ผู้เรียน</span>
            </div>
          </div>
          {isOrphan && (
            <span className="text-[10px] font-black px-2 py-1 bg-amber-300 text-amber-900 rounded-full inline-flex items-center gap-1">
              ⚠ ยังไม่มีใครดูแล
            </span>
          )}
        </div>
      </div>

      {/* Tree body */}
      {(!isOrphan || canEditAnything) && (
        <div className="p-4 lg:p-5 space-y-3">
          {/* Supervisors row */}
          {(supervisors.length > 0 || canAddSupervisor) && (
            <RoleRow
              color="amber"
              icon={<ShieldCheck size={13} className="text-amber-600" />}
              title="Supervisor"
              subtitle="CRUD เต็ม · ดูทุกคน · มอบ viewer ได้"
              count={supervisors.length}
              actionLabel={canAddSupervisor ? "เพิ่ม Supervisor" : undefined}
              onAction={canAddSupervisor ? onAddSupervisor : undefined}
            >
              {supervisors.length === 0 ? (
                <p className="text-[11px] text-amber-700 italic">— ยังไม่มี Supervisor — กดเพิ่มได้ที่ปุ่มขวาบน —</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {supervisors.map(p => p.employee && (
                    <EmpChip key={p.id} emp={p.employee} variant="amber"
                      onRevoke={canRevoke(p) ? () => onRevoke(p) : undefined}
                      busy={busyId === p.id} />
                  ))}
                </div>
              )}
            </RoleRow>
          )}

          {/* Viewers — scope=all */}
          {(viewersAll.length > 0 || canAddViewer) && (
            <RoleRow
              color="sky"
              icon={<Globe2 size={13} className="text-sky-600" />}
              title="Viewer · ทุกคนในช่อง"
              subtitle="อ่านอย่างเดียว · เห็นข้อมูลผู้เรียนทุกคน · ดาวน์โหลด Excel"
              count={viewersAll.length}
              actionLabel={canAddViewer ? "เพิ่ม" : undefined}
              onAction={canAddViewer ? () => onAddViewer("all") : undefined}
            >
              {viewersAll.length === 0 ? (
                <p className="text-[11px] text-sky-700 italic">— ยังไม่มี Viewer แบบเห็นทุกคน —</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {viewersAll.map(v => v.employee && (
                    <EmpChip key={v.id} emp={v.employee} variant="sky"
                      onRevoke={canRevoke(v) ? () => onRevoke(v) : undefined}
                      onSwitchScope={canEditScope(v) ? () => onChangeViewerScope(v, "subordinates") : undefined}
                      switchLabel="↻ subordinates"
                      busy={busyId === v.id} />
                  ))}
                </div>
              )}
            </RoleRow>
          )}

          {/* Viewers — scope=subordinates (expandable subtree) */}
          {(viewersSub.length > 0 || canAddViewer) && (
            <RoleRow
              color="emerald"
              icon={<Users size={13} className="text-emerald-600" />}
              title="Viewer · เฉพาะลูกน้องในสาย"
              subtitle="เห็นเฉพาะคนใต้บังคับบัญชา (recursive) · ดาวน์โหลด Excel เฉพาะลูกน้อง"
              count={viewersSub.length}
              actionLabel={canAddViewer ? "เพิ่ม" : undefined}
              onAction={canAddViewer ? () => onAddViewer("subordinates") : undefined}
            >
              {viewersSub.length === 0 ? (
                <p className="text-[11px] text-emerald-700 italic">— ยังไม่มี Viewer แบบ subordinates —</p>
              ) : (
                <div className="space-y-2">
                  {viewersSub.map(v => v.employee && (
                    <SubordinateBranch key={v.id} viewer={v}
                      expanded={expandedViewer.has(v.id)}
                      onToggle={() => onToggleViewer(v.id)}
                      onRevoke={canRevoke(v) ? () => onRevoke(v) : undefined}
                      onSwitchToAll={canEditScope(v) ? () => onChangeViewerScope(v, "all") : undefined}
                      onAddSubordinates={canEditScope(v) ? () => onAddSubordinates(v) : undefined}
                      onRemoveSubordinate={canEditScope(v) ? onRemoveSubordinate : undefined}
                      busy={busyId === v.id}
                      busySubKey={busySubKey} />
                  ))}
                </div>
              )}
            </RoleRow>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Row showing a role group
// ─────────────────────────────────────────────────────────────────
function RoleRow({ color, icon, title, subtitle, count, children, actionLabel, onAction }: {
  color: "amber" | "sky" | "emerald"
  icon: React.ReactNode
  title: string
  subtitle: string
  count: number
  children: React.ReactNode
  actionLabel?: string
  onAction?: () => void
}) {
  const tone: Record<string, { bg: string; bar: string; text: string; pill: string; btn: string }> = {
    amber:   { bg: "bg-amber-50",   bar: "bg-amber-400",   text: "text-amber-900",   pill: "bg-amber-500 text-white",   btn: "bg-amber-600 hover:bg-amber-700" },
    sky:     { bg: "bg-sky-50",     bar: "bg-sky-400",     text: "text-sky-900",     pill: "bg-sky-500 text-white",     btn: "bg-sky-600 hover:bg-sky-700" },
    emerald: { bg: "bg-emerald-50", bar: "bg-emerald-400", text: "text-emerald-900", pill: "bg-emerald-500 text-white", btn: "bg-emerald-600 hover:bg-emerald-700" },
  }
  const t = tone[color]
  return (
    <div className={`${t.bg} rounded-xl p-3 border border-slate-100`}>
      <div className="flex items-center gap-2 mb-2.5 flex-wrap">
        {icon}
        <p className={`font-black text-sm ${t.text}`}>{title}</p>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${t.pill}`}>{count}</span>
        <span className="text-[10px] text-slate-500 ml-1 hidden md:inline">{subtitle}</span>
        {actionLabel && onAction && (
          <button onClick={onAction}
            className={`ml-auto px-2.5 py-1 ${t.btn} text-white rounded-lg text-[11px] font-black inline-flex items-center gap-1`}>
            <Plus size={11} /> {actionLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Viewer (subordinates) with expandable subordinate tree
// ─────────────────────────────────────────────────────────────────
function SubordinateBranch({ viewer, expanded, onToggle, onRevoke, onSwitchToAll, onAddSubordinates, onRemoveSubordinate, busy, busySubKey }: {
  viewer: Viewer
  expanded: boolean
  onToggle: () => void
  onRevoke?: () => void
  onSwitchToAll?: () => void
  onAddSubordinates?: () => void
  onRemoveSubordinate?: (permissionId: string, learnerId: string, learnerName: string) => void
  busy?: boolean
  busySubKey?: string | null
}) {
  const subCount = viewer.subordinates.length
  return (
    <div className="bg-white rounded-xl border border-emerald-100 overflow-hidden">
      <div className="w-full p-2.5 flex items-center gap-2 hover:bg-emerald-50 transition-colors">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          {expanded
            ? <ChevronDown size={14} className="text-emerald-600 flex-shrink-0" />
            : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
          <Avatar emp={viewer.employee!} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 truncate">
              {viewer.employee!.first_name_th} {viewer.employee!.last_name_th}
              {viewer.employee!.nickname && (
                <span className="text-[11px] text-slate-400 font-normal ml-1">({viewer.employee!.nickname})</span>
              )}
            </p>
            <p className="text-[10px] text-slate-500 truncate">
              {viewer.employee!.position?.name ?? "—"} · {viewer.employee!.department?.name ?? "—"}
            </p>
          </div>
          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full inline-flex items-center gap-1 border border-emerald-200 flex-shrink-0">
            <Users size={9} /> เห็น {subCount} คน
          </span>
        </button>
        {(onSwitchToAll || onRevoke) && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onSwitchToAll && (
              <button onClick={onSwitchToAll} disabled={busy}
                title="เปลี่ยนเป็น 'เห็นทุกคนในช่อง'"
                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg disabled:opacity-50">
                <Globe2 size={13} />
              </button>
            )}
            {onRevoke && (
              <button onClick={onRevoke} disabled={busy}
                title="ถอนสิทธิ์"
                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-50">
                {busy ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-emerald-50 bg-emerald-50/40">
          {/* Action row */}
          {onAddSubordinates && (
            <div className="flex justify-end pt-2">
              <button onClick={onAddSubordinates}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black inline-flex items-center gap-1">
                <Plus size={11} /> เพิ่มลูกน้องในสาย
              </button>
            </div>
          )}

          {subCount === 0 ? (
            <p className="text-[11px] text-slate-400 italic py-3 text-center">
              ยังไม่มีลูกน้อง — {onAddSubordinates ? "กดเพิ่มได้ที่ปุ่มด้านบน" : "ติดต่อ admin เพื่อมอบหมาย"}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pt-2">
              {viewer.subordinates.map(e => {
                const key = `${viewer.id}::${e.id}`
                const isBusy = busySubKey === key
                return (
                  <div key={e.id}
                    className="group flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-100 hover:border-emerald-200 transition-colors">
                    <Avatar emp={e} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">
                        {e.first_name_th} {e.last_name_th}
                        {e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {e.employee_code} · {e.position?.name ?? "—"}
                      </p>
                    </div>
                    {onRemoveSubordinate && (
                      <button onClick={() => onRemoveSubordinate(viewer.id, e.id, `${e.first_name_th} ${e.last_name_th}`)}
                        disabled={isBusy}
                        title="เอาออกจากลูกน้อง"
                        className="p-1 text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30 flex-shrink-0">
                        {isBusy ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Small chip showing one employee — color variants per role
// ─────────────────────────────────────────────────────────────────
function EmpChip({ emp, variant, onRevoke, onSwitchScope, switchLabel, busy }: {
  emp: Emp
  variant: "rose" | "amber" | "sky" | "emerald"
  onRevoke?: () => void
  onSwitchScope?: () => void
  switchLabel?: string
  busy?: boolean
}) {
  const tone: Record<string, string> = {
    rose:    "bg-white border-rose-200 text-rose-900",
    amber:   "bg-white border-amber-200 text-amber-900",
    sky:     "bg-white border-sky-200 text-sky-900",
    emerald: "bg-white border-emerald-200 text-emerald-900",
  }
  return (
    <div className={`group flex items-center gap-2 p-2 pr-2 rounded-lg border ${tone[variant]} shadow-sm relative`}>
      <Avatar emp={emp} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-bold truncate">
          {emp.first_name_th} {emp.last_name_th}
          {emp.nickname && <span className="text-slate-400 font-normal ml-1">({emp.nickname})</span>}
        </p>
        <p className="text-[10px] text-slate-400 truncate">{emp.position?.name ?? "—"} · {emp.department?.name ?? "—"}</p>
      </div>
      {(onSwitchScope || onRevoke) && (
        <div className="flex items-center gap-0.5 ml-1 flex-shrink-0">
          {onSwitchScope && (
            <button onClick={onSwitchScope} disabled={busy}
              title={switchLabel ?? "สลับ scope"}
              className="p-1 text-emerald-600 hover:bg-emerald-50 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30">
              <Users size={11} />
            </button>
          )}
          {onRevoke && (
            <button onClick={onRevoke} disabled={busy}
              title="ถอนสิทธิ์"
              className="p-1 text-rose-500 hover:bg-rose-50 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-30">
              {busy ? <Loader2 size={11} className="animate-spin" /> : <X size={11} />}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
function Avatar({ emp, size = "md" }: { emp: Emp; size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-sm"
  return (
    <div className={`${cls} rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 flex items-center justify-center font-black overflow-hidden flex-shrink-0 border border-white shadow-sm`}>
      {emp.avatar_url
        ? <img src={emp.avatar_url} alt="" className="w-full h-full object-cover" />
        : (emp.first_name_th?.[0] ?? "?")}
    </div>
  )
}

function LegendChip({ color, icon, label }: { color: string; icon: React.ReactNode; label: string }) {
  const tone: Record<string, string> = {
    rose:    "bg-rose-50 text-rose-700 border-rose-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    sky:     "bg-sky-50 text-sky-700 border-sky-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border font-bold ${tone[color]}`}>
      {icon}
      {label}
    </span>
  )
}

function empName(e: Emp | null) {
  if (!e) return ""
  return `${e.first_name_th ?? ""} ${e.last_name_th ?? ""} ${e.nickname ?? ""} ${e.employee_code ?? ""}`
}

// ─────────────────────────────────────────────────────────────────
// Add Subordinates Modal — เพิ่มลูกน้องในสายของ viewer (training-specific)
// ─────────────────────────────────────────────────────────────────
function AddSubordinatesModal({ target, onClose, onSuccess }: {
  target: AddSubordinatesTarget
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase.from("employees")
      .select("id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)")
      .eq("is_active", true).order("first_name_th").limit(2000)
      .then(({ data }) => { if (!cancelled) { setEmployees((data ?? []) as any); setLoading(false) } })
    return () => { cancelled = true }
  }, [])

  const existing = useMemo(() => new Set(target.existingIds), [target])

  const departments = useMemo(() => {
    const s = new Set<string>()
    for (const e of employees) if (e.department?.name) s.add(e.department.name)
    return Array.from(s).sort((a, b) => a.localeCompare(b, "th"))
  }, [employees])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return employees.filter(e => {
      if (existing.has(e.id)) return false  // already a subordinate
      if (deptFilter && e.department?.name !== deptFilter) return false
      if (s) {
        const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname ?? ""} ${e.employee_code ?? ""} ${e.position?.name ?? ""} ${e.department?.name ?? ""}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [employees, search, deptFilter, existing])

  const toggle = (id: string) => {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const submit = async () => {
    if (selected.size === 0) { toast.error("เลือกพนักงานก่อน"); return }
    setSaving(true)
    const t = toast.loading("กำลังเพิ่มลูกน้อง...")
    try {
      const res = await fetch("/api/training/permissions/subordinates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permission_id: target.permissionId, employee_ids: Array.from(selected) }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`เพิ่ม ${d.added}/${d.requested} คน`, { id: t })
      onSuccess()
    } catch (e: any) {
      toast.error(e?.message || "เพิ่มไม่สำเร็จ", { id: t })
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={18} />
              <div>
                <h3 className="font-black">เพิ่มลูกน้องในสาย</h3>
                <p className="text-[11px] opacity-90">
                  Viewer: <b>{target.viewerName}</b> · จะเห็นข้อมูลคนเหล่านี้ในระบบ training (ไม่กระทบ HR/KPI)
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-5 pt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-44">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหา ชื่อ · รหัส · แผนก · ตำแหน่ง..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-emerald-400" />
            </div>
            {departments.length > 0 && (
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="">ทุกแผนก</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              เห็นได้ <b className="text-slate-800">{filtered.length}</b> คน · ซ่อนคนที่เป็นลูกน้องอยู่แล้ว
            </span>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())}
                className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold hover:bg-slate-200 inline-flex items-center gap-1">
                <X size={11} /> ล้างที่เลือก ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-3 min-h-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400"><Loader2 size={20} className="mx-auto animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Users size={28} className="mx-auto mb-2 text-slate-200" />
              ไม่พบพนักงาน {search && "ตามคำค้น"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filtered.map(e => {
                const isPicked = selected.has(e.id)
                return (
                  <label key={e.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border-2 transition-all ${
                      isPicked ? "bg-emerald-50 border-emerald-300" : "bg-white border-slate-100 hover:border-emerald-200"
                    }`}>
                    <input type="checkbox" checked={isPicked} onChange={() => toggle(e.id)}
                      className="w-4 h-4 accent-emerald-500 flex-shrink-0" />
                    <Avatar emp={e} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {e.first_name_th} {e.last_name_th}
                        {e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                        <span>{e.employee_code}</span>
                        {e.department?.name && <><span>·</span><Building2 size={9} /><span className="truncate">{e.department.name}</span></>}
                        {e.position?.name && <><span>·</span><Briefcase size={9} /><span className="truncate">{e.position.name}</span></>}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 justify-end">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
            ยกเลิก
          </button>
          <button onClick={submit} disabled={saving || selected.size === 0}
            className="px-4 py-2 text-sm font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl disabled:opacity-40 inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            เพิ่ม{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Add Permission Modal — inline employee picker
// ─────────────────────────────────────────────────────────────────
function AddPermissionModal({ target, onClose, onSuccess }: {
  target: AddTarget
  onClose: () => void
  onSuccess: () => void
}) {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Emp[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deptFilter, setDeptFilter] = useState("")
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [scope, setScope] = useState<"subordinates" | "all">(target.scope ?? "subordinates")
  const [saving, setSaving] = useState(false)
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set())

  // Load employees + existing permissions for this slot
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      supabase.from("employees")
        .select("id, first_name_th, last_name_th, nickname, employee_code, avatar_url, position:positions(name), department:departments(name)")
        .eq("is_active", true).order("first_name_th").limit(1000),
      fetch("/api/training/permissions").then(r => r.json()).catch(() => ({ permissions: [] })),
    ]).then(([emp, perms]) => {
      if (cancelled) return
      setEmployees((emp.data ?? []) as any)
      const keys = new Set<string>()
      for (const p of perms.permissions ?? []) {
        keys.add(`${p.employee_id}|${p.role}|${p.channel_id ?? "_"}`)
      }
      setExistingKeys(keys)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [])

  const departments = useMemo(() => {
    const s = new Set<string>()
    for (const e of employees) if (e.department?.name) s.add(e.department.name)
    return Array.from(s).sort((a, b) => a.localeCompare(b, "th"))
  }, [employees])

  const keyOf = (empId: string) =>
    `${empId}|${target.role}|${target.channelId ?? "_"}`

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    return employees.filter(e => {
      if (deptFilter && e.department?.name !== deptFilter) return false
      if (existingKeys.has(keyOf(e.id))) return false
      if (s) {
        const hay = `${e.first_name_th} ${e.last_name_th} ${e.nickname ?? ""} ${e.employee_code ?? ""} ${e.position?.name ?? ""} ${e.department?.name ?? ""}`.toLowerCase()
        if (!hay.includes(s)) return false
      }
      return true
    })
  }, [employees, search, deptFilter, existingKeys, target])

  const toggle = (id: string) => {
    setSelected(s => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  const submit = async () => {
    if (selected.size === 0) { toast.error("เลือกพนักงานก่อน"); return }
    setSaving(true)
    const t = toast.loading("กำลังเพิ่มสิทธิ์...")
    try {
      const res = await fetch("/api/training/permissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_ids: Array.from(selected),
          role: target.role,
          channel_id: target.channelId ?? undefined,
          scope: target.role === "training_viewer" ? scope : undefined,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      toast.success(`เพิ่ม ${d.added}/${d.requested} คน`, { id: t })
      onSuccess()
    } catch (e: any) {
      toast.error(e.message || "เพิ่มไม่สำเร็จ", { id: t })
    } finally { setSaving(false) }
  }

  const roleInfo: Record<string, { label: string; tone: string; desc: string }> = {
    training_admin:      { label: "🛡 Training Admin",   tone: "from-rose-500 to-pink-500",   desc: "เห็น/แก้ทุก channel · จัดการสิทธิ์ได้" },
    training_supervisor: { label: "👁 Supervisor",        tone: "from-amber-500 to-orange-500", desc: "CRUD เต็มเฉพาะ channel นี้" },
    training_viewer:     { label: "🔍 Viewer",            tone: "from-sky-500 to-indigo-500",  desc: "อ่านอย่างเดียว · download ได้" },
  }
  const info = roleInfo[target.role]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-5 py-4 bg-gradient-to-r ${info.tone} text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus size={18} />
              <div>
                <h3 className="font-black">เพิ่มสิทธิ์ — {info.label}</h3>
                <p className="text-[11px] opacity-90">
                  {target.channelName ? <>ช่อง: <b>{target.channelName}</b> · </> : null}
                  {info.desc}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg"><X size={18} /></button>
          </div>
        </div>

        {/* Scope picker (viewer only) */}
        {target.role === "training_viewer" && (
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-black text-slate-600 mb-1.5">ขอบเขตที่ viewer เห็น</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScope("subordinates")}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${scope === "subordinates" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                <p className="font-bold text-xs flex items-center gap-1"><Users size={11} /> เฉพาะลูกน้องในสาย</p>
                <p className="text-[10px] text-slate-500 mt-0.5">กำหนดรายชื่อเองในหน้าผัง (training-specific)</p>
              </button>
              <button onClick={() => setScope("all")}
                className={`p-2.5 rounded-xl border-2 text-left transition-all ${scope === "all" ? "border-sky-400 bg-sky-50" : "border-slate-200 hover:border-slate-300 bg-white"}`}>
                <p className="font-bold text-xs flex items-center gap-1"><Globe2 size={11} /> ทุกคนในช่อง</p>
                <p className="text-[10px] text-slate-500 mt-0.5">เห็นทุกผู้เรียน — ยัง read-only</p>
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="px-5 pt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-44">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="ค้นหา ชื่อ · รหัส · แผนก · ตำแหน่ง..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm outline-none focus:border-indigo-400" />
            </div>
            {departments.length > 0 && (
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm">
                <option value="">ทุกแผนก</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">
              เห็นได้ <b className="text-slate-800">{filtered.length}</b> คน · ซ่อนคนที่มีสิทธิ์นี้แล้ว
            </span>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())}
                className="px-2 py-1 bg-slate-100 text-slate-600 rounded font-bold hover:bg-slate-200 inline-flex items-center gap-1">
                <X size={11} /> ล้างที่เลือก ({selected.size})
              </button>
            )}
          </div>
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto px-5 pt-2 pb-3 min-h-0">
          {loading ? (
            <div className="py-12 text-center text-slate-400"><Loader2 size={20} className="mx-auto animate-spin" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              <Users size={28} className="mx-auto mb-2 text-slate-200" />
              ไม่พบพนักงาน {search && "ตามคำค้น"}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {filtered.map(e => {
                const isPicked = selected.has(e.id)
                return (
                  <label key={e.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer border-2 transition-all ${
                      isPicked ? "bg-indigo-50 border-indigo-300" : "bg-white border-slate-100 hover:border-indigo-200"
                    }`}>
                    <input type="checkbox" checked={isPicked} onChange={() => toggle(e.id)}
                      className="w-4 h-4 accent-indigo-500 flex-shrink-0" />
                    <Avatar emp={e} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {e.first_name_th} {e.last_name_th}
                        {e.nickname && <span className="text-slate-400 font-normal ml-1">({e.nickname})</span>}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                        <span>{e.employee_code}</span>
                        {e.department?.name && <><span>·</span><Building2 size={9} /><span className="truncate">{e.department.name}</span></>}
                        {e.position?.name && <><span>·</span><Briefcase size={9} /><span className="truncate">{e.position.name}</span></>}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 justify-end">
          <button onClick={onClose} disabled={saving}
            className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50">
            ยกเลิก
          </button>
          <button onClick={submit} disabled={saving || selected.size === 0}
            className="px-4 py-2 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-40 inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            เพิ่ม{selected.size > 0 ? ` (${selected.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  )
}
