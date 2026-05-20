"use client"
import QuestionBankManager from "@/components/training/QuestionBankManager"

export default function TrainerQuestionBankPage() {
  return (
    <div className="p-4 lg:p-6">
      <QuestionBankManager basePath="/app/training/manage" />
    </div>
  )
}
