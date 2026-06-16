"use client"

import { Warp } from "@paper-design/shaders-react"

// ────────────────────────────────────────────────────────────────────
// EmployeeShaderBg — พื้นหลังเดียวสำหรับทุกคน
//   • Palette: Sky Blue · Violet · Emerald · Purple (vivid neon)
//   • settings ตามตัวอย่าง paper-design/shaders-react
//   • ทุกพนักงานเห็นเหมือนกัน → ไม่มี seed-based variant อีก
//   • client-only (WebGL)
// ────────────────────────────────────────────────────────────────────

// 🌈 Vivid 4-color palette (ตามตัวอย่าง)
const VIVID_PALETTE = [
  "hsl(203, 100%, 62%)",   // sky blue
  "hsl(255, 100%, 72%)",   // violet
  "hsl(158, 99%, 59%)",    // emerald
  "hsl(264, 100%, 61%)",   // purple
] as const

export default function EmployeeShaderBg({
  // seed รับไว้เพื่อ backward-compat แต่ไม่ใช้แล้ว
  seed: _seed,
  speed = 1,
  className = "",
  children,
}: {
  seed?: string
  speed?: number
  className?: string
  children?: React.ReactNode
}) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 z-0">
        <Warp
          style={{ width: "100%", height: "100%" }}
          proportion={0.45}
          softness={1}
          distortion={0.25}
          swirl={0.8}
          swirlIterations={10}
          shape="checks"
          shapeScale={0.1}
          scale={1}
          rotation={0}
          speed={speed}
          colors={VIVID_PALETTE as unknown as string[]}
        />
      </div>
      {/* subtle overlay เผื่อตัวอักษรขาวอ่านชัด */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/5 via-transparent to-black/15 pointer-events-none" />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
