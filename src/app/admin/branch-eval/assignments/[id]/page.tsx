"use client"
// Admin → ใช้หน้า detail เดียวกับ manage (DRY)
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminAssignmentDetailRedirect() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  useEffect(() => {
    if (id) router.replace(`/app/branch-eval/manage/assignments/${id}`)
  }, [id, router])
  return (
    <div className="p-6 text-center text-slate-400">กำลังพาไป...</div>
  )
}
