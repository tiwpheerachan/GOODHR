"use client"
import { EyeOff, ShieldAlert } from "lucide-react"

/**
 * Black overlay ที่ครอบทับวิดีโอเมื่อ:
 *  - blackout: window blur หรือ PrintScreen → ครอบทับด้วยสีดำเต็มจอ
 *  - recordingDetected: ตรวจพบการแชร์/อัด screen → แสดงคำเตือน
 */
export default function AntiCaptureOverlay({
  blackout, blackoutReason, recordingDetected, watermarkText,
}: {
  blackout: boolean
  blackoutReason: "blur" | "printscreen" | null
  recordingDetected: boolean
  watermarkText?: string
}) {
  // ⭐ Black overlay — สูงสุดเหนือทุก control แต่ต่ำกว่า checkpoint quiz
  if (blackout) {
    return (
      <div className="absolute inset-0 bg-black z-[80] flex flex-col items-center justify-center text-white p-6 text-center anim-fade-up">
        {watermarkText && (
          <p className="absolute inset-0 flex items-center justify-center text-white/10 text-3xl font-black rotate-[-20deg] pointer-events-none select-none">
            {watermarkText}
          </p>
        )}
        <div className="relative">
          {blackoutReason === "printscreen" ? (
            <>
              <ShieldAlert size={48} className="text-rose-400 mb-3 mx-auto" />
              <p className="text-lg font-black">⚠ ตรวจพบการกดปุ่ม Screenshot</p>
              <p className="text-sm opacity-80 mt-1">การถ่ายภาพหรือบันทึกหน้าจอเป็นการละเมิด</p>
              <p className="text-xs opacity-60 mt-2">วิดีโอจะเล่นต่อใน 2 วินาที</p>
            </>
          ) : (
            <>
              <EyeOff size={48} className="text-amber-400 mb-3 mx-auto" />
              <p className="text-lg font-black">หน้าต่างไม่ active</p>
              <p className="text-sm opacity-80 mt-1">กลับมาที่หน้านี้เพื่อดูวิดีโอต่อ</p>
            </>
          )}
        </div>
      </div>
    )
  }

  // ⭐ Recording warning — แถบบนเด่น แต่ไม่บล็อก
  if (recordingDetected) {
    return (
      <div className="absolute top-2 left-2 right-2 z-[60] bg-rose-600/95 backdrop-blur text-white rounded-xl px-3 py-2 flex items-center gap-2 text-xs font-bold shadow-lg anim-fade-up">
        <ShieldAlert size={14} className="flex-shrink-0" />
        <span>ตรวจพบการแชร์/บันทึกหน้าจอ — ระบบบันทึกพฤติกรรมและแจ้ง HR</span>
      </div>
    )
  }

  return null
}
