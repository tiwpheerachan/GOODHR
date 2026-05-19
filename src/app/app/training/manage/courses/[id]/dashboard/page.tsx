"use client"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import CourseDashboard from "@/components/training/CourseDashboard"

export default function TrainerCourseDashboardPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6 space-y-4 pb-32">
      <Link href={`/app/training/manage/courses/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700">
        <ArrowLeft size={14} /> กลับไปคอร์ส
      </Link>
      <CourseDashboard courseId={id as string} basePath="/app/training/manage" />
    </div>
  )
}
