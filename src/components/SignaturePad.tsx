"use client"
/**
 * SignaturePad — แผ่นลงลายเซ็นด้วยนิ้ว/เมาส์ (canvas)
 *   onChange(dataURL | null) — ส่งภาพ PNG กลับ (หรือ null เมื่อว่าง)
 */
import { useRef, useEffect, useState, useCallback } from "react"
import { Eraser } from "lucide-react"

export default function SignaturePad({
  onChange,
  height = 200,
  disabled = false,
}: {
  onChange?: (dataUrl: string | null) => void
  height?: number
  disabled?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [hasInk, setHasInk] = useState(false)

  // ปรับความละเอียดตาม devicePixelRatio + ล้างพื้นหลังขาว
  const setup = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = Math.max(window.devicePixelRatio || 1, 1)
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * ratio
    canvas.height = rect.height * ratio
    const ctx = canvas.getContext("2d")!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.strokeStyle = "#0f172a"
  }, [])

  useEffect(() => {
    setup()
    const onResize = () => setup()
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [setup])

  const pos = (e: PointerEvent | React.PointerEvent) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    return { x: (e as any).clientX - rect.left, y: (e as any).clientY - rect.top }
  }

  const start = (e: React.PointerEvent) => {
    if (disabled) return
    e.preventDefault()
    drawing.current = true
    last.current = pos(e)
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }
  const move = (e: React.PointerEvent) => {
    if (!drawing.current || disabled) return
    e.preventDefault()
    const ctx = canvasRef.current!.getContext("2d")!
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(last.current!.x, last.current!.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = p
    if (!hasInk) setHasInk(true)
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    const canvas = canvasRef.current!
    onChange?.(hasInk ? canvas.toDataURL("image/png") : null)
  }

  const clear = () => {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext("2d")!
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasInk(false)
    onChange?.(null)
  }

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        style={{ height, touchAction: "none" }}
        className="w-full rounded-2xl border-2 border-dashed border-slate-300 bg-white"
      />
      {!hasInk && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-sm text-slate-300">เซ็นลายเซ็นที่นี่</span>
        </div>
      )}
      <button
        type="button"
        onClick={clear}
        disabled={disabled || !hasInk}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-200 disabled:opacity-40"
      >
        <Eraser size={12} /> ล้าง
      </button>
    </div>
  )
}
