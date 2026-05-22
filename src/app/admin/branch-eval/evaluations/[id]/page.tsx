"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect } from "react"

// Admin uses the same evaluation detail UI as evaluator (API enforces permission)
export default function AdminEvaluationDetailRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  useEffect(() => {
    if (id) router.replace(`/app/branch-eval/${id}`)
  }, [id, router])
  return <div className="p-8 text-center text-slate-400">กำลังเปิดฟอร์ม...</div>
}
