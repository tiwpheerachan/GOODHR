"use client"
import ChannelsManager from "@/components/training/ChannelsManager"

export default function TrainerChannelsPage() {
  return (
    <div className="p-4 lg:p-6">
      <ChannelsManager basePath="/app/training/manage" />
    </div>
  )
}
