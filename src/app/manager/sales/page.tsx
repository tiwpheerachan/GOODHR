"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

// ระบบขายสินค้าใช้ /admin/sales (full-width layout) — manager redirect ไปที่นั่น
export default function ManagerSalesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/admin/sales") }, [router])
  return (
    <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-100">
      กำลังไปยัง /admin/sales ...
    </div>
  )
}
