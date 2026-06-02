"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

// คลังสินค้าย้ายไปอยู่ใน /admin/sales#products แล้ว
export default function ProductsRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/admin/sales#products")
  }, [router])
  return (
    <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-100">
      กำลังย้ายไปยัง /admin/sales#products ...
    </div>
  )
}
