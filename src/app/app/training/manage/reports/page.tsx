"use client"
import ReportsManager from "@/components/training/ReportsManager"

export default function TrainerReportsPage() {
  return (
    <div className="p-4 lg:p-6">
      <ReportsManager basePath="/app/training/manage" />
    </div>
  )
}
