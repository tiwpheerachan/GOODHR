"use client"
import CoursesManager from "@/components/training/CoursesManager"

export default function TrainerCoursesPage() {
  return (
    <div className="p-4 lg:p-6">
      <CoursesManager basePath="/app/training/manage" />
    </div>
  )
}
