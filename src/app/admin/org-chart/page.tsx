"use client"
import { useEffect, useState, useRef, useCallback } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import {
  Network, Loader2, ZoomIn, ZoomOut, Maximize2, ChevronDown, ChevronUp, Users,
  Search, X, Building2, RotateCcw, MoveDown, MoveRight, Settings2, Crown,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import OrgChartEditDrawer from "@/components/admin/OrgChartEditDrawer"
import { useLanguage, useEmployeeName } from "@/lib/i18n"

type Node = {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  first_name_en?: string
  last_name_en?: string
  nickname?: string
  nickname_en?: string
  avatar_url?: string
  position?: string
  department?: string
  company?: string
  depth: number
  subs_count: number
  children: Node[]
}

// Level styling — alternate sets
const LEVEL_STYLES = [
  { card: "bg-gradient-to-br from-indigo-600 to-violet-600 text-white", ring: "ring-indigo-200", badge: "bg-indigo-100 text-indigo-700", line: "border-indigo-300" },  // top (Lv 0)
  { card: "bg-gradient-to-br from-sky-50 to-sky-100 text-sky-900",      ring: "ring-sky-200",    badge: "bg-sky-100 text-sky-700",        line: "border-sky-300" },     // Lv 1
  { card: "bg-gradient-to-br from-orange-50 to-orange-100 text-orange-900", ring: "ring-orange-200", badge: "bg-orange-100 text-orange-700", line: "border-orange-300" }, // Lv 2
  { card: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-900", ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-700", line: "border-emerald-300" }, // Lv 3
  { card: "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-900",   ring: "ring-rose-200",   badge: "bg-rose-100 text-rose-700",      line: "border-rose-300" },    // Lv 4
  { card: "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-900", ring: "ring-amber-200",  badge: "bg-amber-100 text-amber-700",    line: "border-amber-300" },   // Lv 5+
]

function getStyle(depth: number) {
  return LEVEL_STYLES[Math.min(depth, LEVEL_STYLES.length - 1)]
}

// ── Card component (beautified) ──
function PersonCard({ node, expanded, onToggle, highlight, onClickEdit }: {
  node: Node
  expanded: boolean
  onToggle: () => void
  highlight: boolean
  onClickEdit: () => void
}) {
  const { t } = useLanguage()
  const empName = useEmployeeName()
  const s = getStyle(node.depth)
  const isTop = node.depth === 0
  return (
    <div className={`relative inline-block group ${highlight ? "scale-110 z-10" : ""} transition-transform`}>
      {/* Level number tag */}
      <div className={`absolute -top-2 -left-2 z-10 ${s.badge} text-[9px] font-black px-1.5 py-0.5 rounded-md ring-2 ring-white shadow-sm`}>
        L{node.depth}
      </div>
      {isTop && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Crown size={14} className="text-amber-400 drop-shadow"/>
        </div>
      )}

      <div className={`rounded-2xl ${s.card} ${s.ring} ring-2 shadow-lg px-3 py-2.5 min-w-[200px] max-w-[220px] ${highlight ? "ring-4 ring-amber-400" : ""}`}>
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full ${isTop ? "bg-white/30 ring-2 ring-white/50" : "bg-white ring-1 ring-slate-200"} overflow-hidden shrink-0 flex items-center justify-center`}>
            {node.avatar_url
              ? <img src={node.avatar_url} alt="" className="w-full h-full object-cover" />
              : <span className={`text-base font-bold ${isTop ? "text-white" : "text-slate-700"}`}>{node.first_name_th?.[0] ?? "?"}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black truncate">
              {empName(node)}
            </p>
            <p className="text-[10px] opacity-80 truncate">{node.position ?? "—"}</p>
          </div>
        </div>

        {node.subs_count > 0 && (
          <button onClick={onToggle}
            className={`mt-2 w-full flex items-center justify-center gap-1 text-[10px] font-bold ${isTop ? "bg-white/20 hover:bg-white/30 text-white" : "bg-white/70 hover:bg-white text-slate-700"} rounded-md py-1 transition-colors`}>
            {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            <Users size={9} /> {node.subs_count} {t("admin.org_chart.subs_count")}
          </button>
        )}
      </div>

      {/* Action buttons — show on hover */}
      <div className="absolute -top-1 -right-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button onClick={onClickEdit}
          className="w-6 h-6 rounded-full bg-indigo-600 text-white shadow-md flex items-center justify-center hover:bg-indigo-700"
          title={t("admin.org_chart.edit_evaluator")}>
          <Settings2 size={11}/>
        </button>
        <Link href={`/admin/employees/${node.id}`}
          className="w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center text-slate-500 hover:bg-slate-50 text-[10px] font-bold"
          title={t("admin.org_chart.full_emp_page")}>
          ↗
        </Link>
      </div>
    </div>
  )
}

// ── Recursive tree node — ใช้ pseudo-elements เพื่อเส้นต่อเนื่อง ──
function TreeNode({ node, expandedSet, onToggle, highlightId, layout, onClickEdit }: {
  node: Node
  expandedSet: Set<string>
  onToggle: (id: string) => void
  highlightId: string | null
  layout: "horizontal" | "vertical"
  onClickEdit: (id: string, name: string) => void
}) {
  const empName = useEmployeeName()
  const expanded = expandedSet.has(node.id)
  const hasChildren = node.children.length > 0
  const isHorizontal = layout === "horizontal"
  const name = empName(node)

  return (
    <div className="org-node flex flex-col items-center">
      <PersonCard
        node={node}
        expanded={expanded}
        onToggle={() => onToggle(node.id)}
        highlight={highlightId === node.id}
        onClickEdit={() => onClickEdit(node.id, name)}
      />

      {/* Children */}
      {hasChildren && expanded && (
        isHorizontal ? (
          // ── Horizontal: ใช้ ::before (เส้นแนวตั้งจาก parent), ::after (เส้นแนวนอนระหว่าง siblings) ──
          <div className="org-children-h flex items-start justify-center">
            {node.children.map((c) => (
              <div key={c.id} className="org-child-h relative">
                <TreeNode node={c} expandedSet={expandedSet} onToggle={onToggle} highlightId={highlightId} layout={layout} onClickEdit={onClickEdit} />
              </div>
            ))}
          </div>
        ) : (
          // ── Vertical: indent + L-shape lines ──
          <div className="org-children-v">
            {node.children.map((c) => (
              <div key={c.id} className="org-child-v relative">
                <TreeNode node={c} expandedSet={expandedSet} onToggle={onToggle} highlightId={highlightId} layout={layout} onClickEdit={onClickEdit} />
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const { user } = useAuth()
  const { t } = useLanguage()
  const supabase = createClient()
  const [companies, setCompanies] = useState<any[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("")
  const [trees, setTrees] = useState<Node[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [expandedSet, setExpandedSet] = useState<Set<string>>(new Set())
  const [zoom, setZoom] = useState(0.7)
  const [search, setSearch] = useState("")
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [layout, setLayout] = useState<"horizontal" | "vertical">("horizontal")
  const [autoDepth, setAutoDepth] = useState(3) // กี่ระดับที่ขยายเริ่มต้น
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null)
  const isSA = (user as any)?.role === "super_admin"

  const viewportRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 })

  // Load companies (super_admin only)
  useEffect(() => {
    if (!isSA) return
    supabase.from("companies").select("id, name_th").eq("is_active", true).order("name_th")
      .then(({ data }) => {
        setCompanies(data ?? [])
        // Default = "ทั้งหมด" (show cross-company chain ตาม manager_history จริง)
      })
  }, [isSA])

  // Load org tree
  useEffect(() => {
    if (!user) return
    setLoading(true)
    const params = new URLSearchParams()
    if (isSA && selectedCompany) params.set("company_id", selectedCompany)
    fetch(`/api/admin/org-chart?${params}`)
      .then(r => r.json())
      .then(data => {
        setTrees(data.trees ?? [])
        setStats(data.stats ?? null)
        // Default: ขยายตาม autoDepth
        const initial = new Set<string>()
        function expandToDepth(node: Node, max: number) {
          if (node.depth >= max) return
          initial.add(node.id)
          node.children.forEach(c => expandToDepth(c, max))
        }
        for (const t of (data.trees ?? [])) expandToDepth(t, autoDepth)
        setExpandedSet(initial)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user, selectedCompany, isSA])

  // Search highlight + auto-expand path
  useEffect(() => {
    if (!search.trim() || trees.length === 0) {
      setHighlightId(null)
      return
    }
    const q = search.toLowerCase()
    // BFS find first match, expand path to it
    const path: string[] = []
    function find(node: Node, parents: string[]): boolean {
      const matches =
        `${node.first_name_th} ${node.last_name_th} ${node.first_name_en ?? ""} ${node.last_name_en ?? ""} ${node.nickname ?? ""} ${node.nickname_en ?? ""} ${node.employee_code} ${node.position ?? ""}`
          .toLowerCase().includes(q)
      if (matches) {
        path.push(...parents, node.id)
        setHighlightId(node.id)
        return true
      }
      for (const c of node.children) {
        if (find(c, [...parents, node.id])) return true
      }
      return false
    }
    for (const t of trees) {
      if (find(t, [])) break
    }
    if (path.length > 0) {
      setExpandedSet(prev => {
        const next = new Set(prev)
        for (const id of path) next.add(id)
        return next
      })
    }
  }, [search, trees])

  // Expand all / Collapse all
  function expandAll() {
    const all = new Set<string>()
    function walk(n: Node) { all.add(n.id); n.children.forEach(walk) }
    trees.forEach(walk)
    setExpandedSet(all)
  }
  function collapseAll() {
    setExpandedSet(new Set())
  }
  function expandToLevel(level: number) {
    const set = new Set<string>()
    function walk(n: Node) {
      if (n.depth >= level) return
      set.add(n.id)
      n.children.forEach(walk)
    }
    trees.forEach(walk)
    setExpandedSet(set)
    setAutoDepth(level)
  }
  function toggleNode(id: string) {
    setExpandedSet(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ── Pan via drag ──
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== viewportRef.current && !(e.target as HTMLElement).classList?.contains("org-canvas")) return
    isDragging.current = true
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      scrollLeft: viewportRef.current?.scrollLeft ?? 0,
      scrollTop: viewportRef.current?.scrollTop ?? 0,
    }
    if (viewportRef.current) viewportRef.current.style.cursor = "grabbing"
  }, [])
  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !viewportRef.current) return
    viewportRef.current.scrollLeft = dragStart.current.scrollLeft - (e.clientX - dragStart.current.x)
    viewportRef.current.scrollTop = dragStart.current.scrollTop - (e.clientY - dragStart.current.y)
  }, [])
  const onMouseUp = useCallback(() => {
    isDragging.current = false
    if (viewportRef.current) viewportRef.current.style.cursor = "grab"
  }, [])

  // ── Wheel zoom (Ctrl+wheel) ──
  const onWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setZoom(z => Math.max(0.3, Math.min(2, z + (e.deltaY > 0 ? -0.05 : 0.05))))
  }, [])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <Network size={22} className="text-indigo-600"/>
            {t("admin.org_chart.title")}
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">{t("admin.org_chart.subtitle")}</p>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-xs">
            <span className="bg-slate-100 px-2 py-1 rounded-lg"><b>{stats.total_employees}</b> {t("admin.org_chart.stat_employees")}</span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg"><b>{stats.total_managers}</b> {t("admin.org_chart.stat_managers")}</span>
            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg"><b>{stats.total_top_level}</b> {t("admin.org_chart.stat_top")}</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 flex items-center gap-2 flex-wrap shadow-sm">
        {/* Company filter (super_admin only) — default = ทั้งหมด */}
        {isSA && (
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-slate-400"/>
            <select value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-sm outline-none focus:border-indigo-400">
              <option value="">{t("admin.org_chart.all_companies")}</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name_th}</option>)}
            </select>
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t("admin.org_chart.search_ph")}
            className="w-full pl-8 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-400"
          />
          {search && (
            <button onClick={() => { setSearch(""); setHighlightId(null) }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full hover:bg-slate-200 flex items-center justify-center">
              <X size={11} className="text-slate-400"/>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Depth quick buttons */}
          <span className="text-[10px] text-slate-400 font-bold mr-0.5">{t("admin.org_chart.expand_label")}</span>
          {[2, 3, 4, 5].map(lv => (
            <button key={lv} onClick={() => expandToLevel(lv)}
              className={`text-xs font-bold w-7 h-7 rounded-lg ${autoDepth === lv ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              title={t("admin.org_chart.expand_n", { n: lv })}>
              {lv}
            </button>
          ))}
          <button onClick={expandAll}
            className="text-xs font-bold px-2 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100"
            title={t("admin.org_chart.expand_all_title")}>
            {t("admin.org_chart.all")}
          </button>
          <button onClick={collapseAll}
            className="text-xs font-bold px-2 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
            title={t("admin.org_chart.collapse_all_title")}>
            {t("admin.org_chart.collapse")}
          </button>
          <button onClick={() => setLayout(l => l === "horizontal" ? "vertical" : "horizontal")}
            className="text-xs font-bold px-2.5 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 flex items-center gap-1"
            title={t("admin.org_chart.toggle_layout")}>
            {layout === "horizontal" ? <MoveDown size={12}/> : <MoveRight size={12}/>}
            {layout === "horizontal" ? t("admin.org_chart.vertical") : t("admin.org_chart.horizontal")}
          </button>
        </div>

        {/* Zoom */}
        <div className="flex items-center gap-1 ml-auto">
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <ZoomOut size={13}/>
          </button>
          <span className="text-xs font-bold text-slate-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.1))}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center">
            <ZoomIn size={13}/>
          </button>
          <button onClick={() => setZoom(0.8)}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center" title={t("admin.org_chart.reset_zoom")}>
            <RotateCcw size={11}/>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={viewportRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        className="bg-slate-50 rounded-2xl border border-slate-200 overflow-auto min-h-[600px] max-h-[80vh] cursor-grab select-none relative"
        style={{ backgroundImage: "radial-gradient(circle, #e2e8f0 1px, transparent 1px)", backgroundSize: "20px 20px" }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-[600px]">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : trees.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Network size={32} className="mx-auto mb-2 text-slate-300"/>
            <p>{t("admin.org_chart.not_found")}</p>
          </div>
        ) : (
          <div
            className="org-canvas inline-block min-w-full p-8 origin-top-left"
            style={{ transform: `scale(${zoom})`, transformOrigin: "top left", paddingBottom: "300px", paddingRight: "300px" }}
          >
            <div className={layout === "horizontal" ? "flex items-start gap-16" : "flex flex-col gap-8"}>
              {trees.map(tree => (
                <TreeNode
                  key={tree.id}
                  node={tree}
                  expandedSet={expandedSet}
                  onToggle={toggleNode}
                  highlightId={highlightId}
                  layout={layout}
                  onClickEdit={(id, name) => setEditing({ id, name })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Legend + Hint */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap text-[10px]">
          <span className="text-slate-500 font-bold">{t("admin.org_chart.level_label")}</span>
          {[
            t("admin.org_chart.lv_top"), t("admin.org_chart.lv1"), t("admin.org_chart.lv2"),
            t("admin.org_chart.lv3"), t("admin.org_chart.lv4"), t("admin.org_chart.lv5"),
          ].map((label, i) => {
            const s = getStyle(i)
            return (
              <span key={i} className={`${s.badge} px-2 py-0.5 rounded font-bold flex items-center gap-1`}>
                <span className="w-2 h-2 rounded-full bg-current opacity-60"/>
                L{i} · {label}
              </span>
            )
          })}
        </div>
        <p className="text-[11px] text-slate-400">
          💡 <b>{t("admin.org_chart.hint_drag")}</b>{t("admin.org_chart.hint_pan")} <kbd className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">Ctrl + scroll</kbd> {t("admin.org_chart.hint_zoom")} {t("admin.org_chart.hint_hover")} <Settings2 size={9} className="inline mx-0.5"/> {t("admin.org_chart.hint_hover2")} {t("admin.org_chart.hint_click")} <span className="font-bold">↗</span> {t("admin.org_chart.hint_full")}
        </p>
      </div>

      {/* Edit drawer */}
      {editing && (
        <OrgChartEditDrawer
          employeeId={editing.id}
          employeeName={editing.name}
          onClose={() => setEditing(null)}
        />
      )}

      {/* ── Connector lines (org-chart style) ── */}
      <style jsx global>{`
        /* ── Horizontal layout — ใช้ pseudo-elements เพื่อเส้นต่อเนื่อง ── */
        .org-children-h {
          padding-top: 24px;            /* gap สำหรับเส้นแนวตั้งจาก parent ลงมา */
          position: relative;
          margin-top: 2px;              /* เว้นจาก card */
        }
        /* เส้นแนวตั้งจาก parent ลงมาถึงเส้นแนวนอน */
        .org-children-h::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          width: 2.5px;
          height: 24px;
          background: #94a3b8;
          transform: translateX(-1.25px);
          border-radius: 2px;
        }
        .org-child-h {
          padding: 24px 18px 0;          /* 24px top = ช่องสำหรับ up-line ของลูก */
        }
        /* เส้นแนวตั้งจากเส้นแนวนอนลงไปที่ card ลูก */
        .org-child-h::before {
          content: "";
          position: absolute;
          top: 0;
          left: 50%;
          width: 2.5px;
          height: 24px;
          background: #94a3b8;
          transform: translateX(-1.25px);
          border-radius: 2px;
        }
        /* เส้นแนวนอน — แนวต่อระหว่าง siblings (top:0 ของ org-child-h = ตำแหน่งของ bar) */
        .org-child-h::after {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2.5px;
          background: #94a3b8;
        }
        /* ตัดครึ่งซ้ายของเส้นแนวนอนใน child แรก */
        .org-child-h:first-child::after {
          left: 50%;
          border-top-left-radius: 4px;
        }
        /* ตัดครึ่งขวาของเส้นแนวนอนใน child สุดท้าย */
        .org-child-h:last-child::after {
          right: 50%;
          border-top-right-radius: 4px;
        }
        /* ถ้ามีลูกคนเดียว — ไม่ต้องมีเส้นแนวนอน */
        .org-child-h:only-child::after {
          display: none;
        }

        /* ── Vertical layout — L-shape connector ── */
        .org-children-v {
          padding-left: 32px;
          margin-top: 6px;
          position: relative;
        }
        /* เส้นแนวตั้งทางซ้าย (เส้นหลัก) */
        .org-children-v::before {
          content: "";
          position: absolute;
          left: 14px;
          top: 0;
          bottom: 24px;                 /* หยุดที่ระดับ child สุดท้าย */
          width: 2.5px;
          background: #94a3b8;
          border-radius: 2px;
        }
        .org-child-v {
          padding: 14px 0 0 18px;
        }
        /* เส้นแนวนอนจากเส้นแนวตั้งซ้ายไปที่ card */
        .org-child-v::before {
          content: "";
          position: absolute;
          left: -18px;
          top: 38px;
          width: 32px;
          height: 2.5px;
          background: #94a3b8;
          border-radius: 2px;
        }
      `}</style>
    </div>
  )
}
