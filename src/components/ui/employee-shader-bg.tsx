"use client"

import { Warp } from "@paper-design/shaders-react"

// ────────────────────────────────────────────────────────────────────
// EmployeeShaderBg — พื้นหลัง Warp shader โทนเย็น (cool)
//   • รับ seed (string เช่น employee.id) → hash → เลือก palette ที่กำหนดไว้
//   • palette ทั้งหมดเป็นโทนเย็น: น้ำเงิน, ฟ้า, ม่วง, indigo, cyan, teal, mint
//   • ไม่มีโทนส้ม/แดง/เหลือง
//   • client-only เพราะ Warp ใช้ WebGL
// ────────────────────────────────────────────────────────────────────

// 8 palettes สีเย็น — แต่ละ palette มี 4 สี hsl เพื่อให้ shader ผสมได้
const COOL_PALETTES: string[][] = [
  // 0: Azure ↔ Indigo
  ["hsl(210, 100%, 62%)", "hsl(225, 100%, 70%)", "hsl(195, 100%, 58%)", "hsl(240, 95%, 65%)"],
  // 1: Cyan ↔ Teal
  ["hsl(185, 100%, 55%)", "hsl(170, 90%, 50%)", "hsl(195, 95%, 60%)", "hsl(160, 85%, 55%)"],
  // 2: Royal Purple ↔ Indigo
  ["hsl(260, 95%, 65%)", "hsl(240, 100%, 70%)", "hsl(275, 90%, 62%)", "hsl(225, 95%, 68%)"],
  // 3: Mint ↔ Aqua
  ["hsl(150, 80%, 60%)", "hsl(175, 85%, 55%)", "hsl(160, 90%, 65%)", "hsl(185, 80%, 58%)"],
  // 4: Sapphire ↔ Violet
  ["hsl(220, 100%, 60%)", "hsl(255, 95%, 65%)", "hsl(235, 100%, 68%)", "hsl(270, 90%, 60%)"],
  // 5: Ocean ↔ Emerald
  ["hsl(200, 95%, 55%)", "hsl(165, 90%, 50%)", "hsl(180, 100%, 55%)", "hsl(145, 80%, 55%)"],
  // 6: Lavender ↔ Sky
  ["hsl(245, 90%, 72%)", "hsl(205, 100%, 70%)", "hsl(230, 90%, 75%)", "hsl(190, 95%, 65%)"],
  // 7: Deep Sea ↔ Teal
  ["hsl(215, 95%, 50%)", "hsl(190, 100%, 50%)", "hsl(170, 90%, 45%)", "hsl(205, 100%, 55%)"],
]

// shapes ที่ดู smooth/clean สำหรับ profile card
const SHAPES = ["checks", "stripes", "edge"] as const
type Shape = (typeof SHAPES)[number]

// 8 variants ของ pattern params — ทำให้แต่ละคนรู้สึก unique ขึ้น
const PATTERN_VARIANTS: Array<{
  shape: Shape; distortion: number; swirl: number; proportion: number
}> = [
  { shape: "checks",  distortion: 0.25, swirl: 0.80, proportion: 0.45 },
  { shape: "checks",  distortion: 0.35, swirl: 0.55, proportion: 0.50 },
  { shape: "stripes", distortion: 0.30, swirl: 0.70, proportion: 0.40 },
  { shape: "checks",  distortion: 0.20, swirl: 0.95, proportion: 0.55 },
  { shape: "stripes", distortion: 0.40, swirl: 0.60, proportion: 0.42 },
  { shape: "edge",    distortion: 0.28, swirl: 0.75, proportion: 0.48 },
  { shape: "checks",  distortion: 0.32, swirl: 0.65, proportion: 0.46 },
  { shape: "stripes", distortion: 0.22, swirl: 0.85, proportion: 0.44 },
]

// FNV-1a hash → uint32 — deterministic, fast, ไม่ต้อง crypto
function hashStr(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export function pickCoolPalette(seed: string) {
  const h = hashStr(seed || "default")
  const palette = COOL_PALETTES[h % COOL_PALETTES.length]
  const variant = PATTERN_VARIANTS[(h >>> 8) % PATTERN_VARIANTS.length]
  return { palette, variant, rotation: (h >>> 16) % 360 }
}

export default function EmployeeShaderBg({
  seed,
  speed = 0.6,
  className = "",
  children,
}: {
  seed: string
  speed?: number
  className?: string
  children?: React.ReactNode
}) {
  const { palette, variant, rotation } = pickCoolPalette(seed)
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 z-0">
        <Warp
          style={{ width: "100%", height: "100%" }}
          proportion={variant.proportion}
          softness={1}
          distortion={variant.distortion}
          swirl={variant.swirl}
          swirlIterations={10}
          shape={variant.shape}
          shapeScale={0.1}
          scale={1}
          rotation={rotation}
          speed={speed}
          colors={palette}
        />
      </div>
      {/* subtle dark overlay เพื่อให้ตัวอักษรขาวอ่านชัด */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/10 via-transparent to-black/15 pointer-events-none" />
      {children && <div className="relative z-10">{children}</div>}
    </div>
  )
}
