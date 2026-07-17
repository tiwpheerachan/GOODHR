"use client"
// ย้ายไปเป็นแท็บในหน้าขายสินค้า PC แล้ว → redirect (กันลิงก์เก่าพัง)
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ScanMissesRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace("/admin/sales#misses") }, [router])
  return null
}
