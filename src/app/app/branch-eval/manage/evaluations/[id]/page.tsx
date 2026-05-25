"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

// Supervisor view = ใช้ฟอร์มเดียวกับ evaluator (API enforce can_edit/can_review ให้แล้ว)
export default function SupervisorEvaluationDetailRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => {
    if (id) router.replace(`/app/branch-eval/${id}`)
  }, [id, router])
  return <div className="p-8 text-center text-slate-400">กำลังเปิดฟอร์ม...</div>
}
