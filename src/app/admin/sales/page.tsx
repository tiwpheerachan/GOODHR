"use client"
import { useEffect, useState } from "react"
import { ScanLine, BarChart3, Table2, Package, Shield, Loader2, Lock, Boxes, PackageSearch } from "lucide-react"
import DashboardTab from "@/components/admin/sales/DashboardTab"
import TableTab from "@/components/admin/sales/TableTab"
import PermissionsTab from "@/components/admin/sales/PermissionsTab"
import ProductsTab from "@/components/admin/sales/ProductsTab"
import StockTab from "@/components/admin/sales/StockTab"
import ScanMissesTab from "@/components/admin/sales/ScanMissesTab"

type Tab = "dashboard" | "table" | "stock" | "misses" | "products" | "permissions"

const TABS: Array<{ key: Tab; label: string; icon: any; color: string }> = [
  { key: "dashboard",   label: "Dashboard",      icon: BarChart3,     color: "from-indigo-500 to-purple-500" },
  { key: "table",       label: "ตารางยอดขาย",   icon: Table2,        color: "from-blue-500 to-cyan-500" },
  { key: "stock",       label: "สต๊อกสาขา",     icon: Boxes,         color: "from-emerald-500 to-teal-500" },
  { key: "misses",      label: "สแกนไม่เจอ",     icon: PackageSearch, color: "from-amber-500 to-orange-500" },
  { key: "products",    label: "คลังสินค้า",     icon: Package,       color: "from-amber-500 to-orange-500" },
  { key: "permissions", label: "สิทธิ์",        icon: Shield,        color: "from-rose-500 to-pink-500" },
]

export default function AdminSalesPage() {
  const [tab, setTab] = useState<Tab>("dashboard")
  const [access, setAccess] = useState<"admin" | "manager" | "staff" | "none" | "loading">("loading")

  useEffect(() => {
    // เช็คสิทธิ์ก่อน — ถ้าไม่มีให้ block
    fetch("/api/products/sales?scope=me&limit=1")
      .then(r => r.json())
      .then(d => {
        if (d.my_access) setAccess(d.my_access)
        else if (d.error) setAccess("none")
      })
      .catch(() => setAccess("none"))

    // restore tab from hash
    if (typeof window !== "undefined") {
      const h = window.location.hash.replace("#", "")
      if (TABS.find(t => t.key === h)) setTab(h as Tab)
    }
  }, [])

  useEffect(() => {
    if (typeof window !== "undefined") window.location.hash = tab
  }, [tab])

  if (access === "loading") {
    return (
      <div className="bg-white rounded-2xl p-16 text-center text-slate-400 border border-slate-100">
        <Loader2 size={24} className="animate-spin mx-auto mb-2 text-indigo-400"/>
        กำลังตรวจสอบสิทธิ์...
      </div>
    )
  }

  if (access === "none") {
    return (
      <div className="bg-white rounded-2xl p-16 text-center border border-slate-100">
        <Lock size={32} className="mx-auto mb-3 text-rose-400"/>
        <p className="font-black text-slate-700">คุณยังไม่ได้รับสิทธิ์เข้าถึงระบบขายสินค้า</p>
        <p className="text-xs text-slate-400 mt-1">โปรดติดต่อ Admin เพื่อขอสิทธิ์ใช้งาน</p>
      </div>
    )
  }

  const canSeeAll = access === "admin"
  const canSeeTeam = access === "admin" || access === "manager"
  const canManageProducts = access === "admin" || access === "manager"
  const canManagePerms = access === "admin"

  // กรอง tabs ที่เห็นได้
  const visibleTabs = TABS.filter(t => {
    if (t.key === "permissions") return canManagePerms
    if (t.key === "products") return canManageProducts
    return true
  })

  return (
    <div className="space-y-4 pb-12">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur"><ScanLine size={22}/></div>
          <div className="flex-1">
            <h1 className="text-xl font-black">ระบบขายสินค้า PC</h1>
            <p className="text-[11px] opacity-90 mt-0.5">รวมศูนย์ — Dashboard · ตาราง · คลังสินค้า · สิทธิ์</p>
          </div>
          <span className="text-[10px] font-black bg-white/20 px-2 py-1 rounded-full backdrop-blur">{access.toUpperCase()}</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-1 flex gap-1 overflow-x-auto">
        {visibleTabs.map(t => {
          const Icon = t.icon
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={"flex-1 min-w-fit px-3 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap " +
                (active ? `bg-gradient-to-r ${t.color} text-white shadow` : "text-slate-500 hover:bg-slate-50")}>
              <Icon size={13}/>
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {tab === "dashboard"   && <DashboardTab canSeeAll={canSeeAll} canSeeTeam={canSeeTeam}/>}
        {tab === "table"       && <TableTab canSeeAll={canSeeAll} canSeeTeam={canSeeTeam}/>}
        {tab === "stock"       && <StockTab canSeeAll={canSeeAll}/>}
        {tab === "misses"      && <ScanMissesTab/>}
        {tab === "products"    && canManageProducts && <ProductsTab/>}
        {tab === "permissions" && canManagePerms && <PermissionsTab/>}
      </div>
    </div>
  )
}
