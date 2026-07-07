"use client"
import { useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"

// ── การ์ดวันเกิด + เค้ก + พลุ + confetti + คำอวยพร ──
//   เด้งครั้งเดียวต่อการเปิดเว็บ เมื่อ "วันนี้" (เวลากรุงเทพ) ตรงวันเกิดของผู้ใช้
//   การ์ดใช้ inline style ล้วน (ไม่พึ่ง styled-jsx/framer-motion) → ขึ้นแน่นอน
export default function BirthdayCelebration() {
  const { user } = useAuth()
  const emp = (user as any)?.employee
  const [show, setShow] = useState(false)
  const [entered, setEntered] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // ── ตรวจวันเกิด + gate ครั้งเดียวต่อ session ──
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("bday_test=1")) { setShow(true); return }
    const birth = emp?.birth_date
    if (!birth || typeof birth !== "string" || birth.length < 10) return
    const todayBKK = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" })
    if (todayBKK.slice(5) !== birth.slice(5, 10)) return
    const key = `bday_shown_${emp?.id ?? "me"}_${todayBKK}`
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1") } catch {}
    setShow(true)
  }, [emp?.birth_date, emp?.id])

  // trigger entrance transition
  useEffect(() => {
    if (!show) { setEntered(false); return }
    const t = setTimeout(() => setEntered(true), 30)
    return () => clearTimeout(t)
  }, [show])

  // ── พลุ (canvas particle fireworks) ──
  useEffect(() => {
    if (!show) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    const resize = () => {
      canvas.width = window.innerWidth * DPR
      canvas.height = window.innerHeight * DPR
      canvas.style.width = window.innerWidth + "px"
      canvas.style.height = window.innerHeight + "px"
    }
    resize()
    window.addEventListener("resize", resize)
    const colors = ["#ff5e7e", "#ffd93d", "#5ec8ff", "#8affc1", "#c58bff", "#ff9f43", "#ff6bcb"]
    type P = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
    let particles: P[] = []
    const burst = (x: number, y: number) => {
      const n = 44 + Math.floor(Math.random() * 26)
      const base = colors[Math.floor(Math.random() * colors.length)]
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n + Math.random() * 0.2
        const sp = (2.2 + Math.random() * 4.2) * DPR
        particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: Math.random() < 0.6 ? base : colors[Math.floor(Math.random() * colors.length)], size: (1.5 + Math.random() * 2.2) * DPR })
      }
    }
    let lastLaunch = 0
    let raf = 0
    const loop = (t: number) => {
      if (t - lastLaunch > 650) { lastLaunch = t; burst(canvas.width * (0.12 + Math.random() * 0.76), canvas.height * (0.1 + Math.random() * 0.35)) }
      // ค่อยๆ ลบเฟรมเก่า (destination-out) → มีหางพลุจางๆ แต่พื้นหลังไม่มืด (โปร่งใส)
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(0,0,0,0.16)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.globalCompositeOperation = "lighter"
      particles = particles.filter(p => p.life > 0)
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.045 * DPR; p.vx *= 0.985; p.vy *= 0.985; p.life -= 0.012
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * Math.max(0.2, p.life), 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(loop)
    }
    burst(canvas.width * 0.35, canvas.height * 0.25)
    burst(canvas.width * 0.65, canvas.height * 0.2)
    raf = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize) }
  }, [show])

  if (!show) return null
  const name = emp?.nickname || emp?.first_name_th || ""

  return (
    <div
      onClick={() => setShow(false)}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        background: "rgba(20,16,40,0.28)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      {/* พลุ */}
      <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }} />

      {/* confetti (inline keyframe via <style>) */}
      <div style={{ position: "absolute", inset: 0, zIndex: 1, pointerEvents: "none", overflow: "hidden" }}>
        {Array.from({ length: 46 }).map((_, i) => (
          <span key={i} style={{
            position: "absolute", top: -20, width: 9, height: 14, borderRadius: 2, opacity: 0.9,
            left: `${(i * 2.17) % 100}%`,
            background: ["#ff5e7e", "#ffd93d", "#5ec8ff", "#8affc1", "#c58bff", "#ff9f43"][i % 6],
            animation: `bdayFall ${3 + (i % 5) * 0.7}s linear ${(i % 10) * 0.35}s infinite`,
          }} />
        ))}
      </div>

      {/* การ์ด — inline ล้วน */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: "relative", zIndex: 5,
          width: "min(90vw, 380px)",
          padding: "34px 26px 26px",
          borderRadius: 30, textAlign: "center",
          background: "linear-gradient(160deg, #ffffff 0%, #fff5fb 55%, #fef0f6 100%)",
          boxShadow: "0 30px 80px -18px rgba(255,94,126,0.55), 0 12px 34px rgba(0,0,0,0.4)",
          border: "1px solid rgba(255,255,255,0.8)",
          opacity: entered ? 1 : 0,
          transform: entered ? "scale(1) translateY(0)" : "scale(0.8) translateY(40px)",
          transition: "opacity .5s ease, transform .55s cubic-bezier(.2,.85,.3,1.3)",
        }}
      >
        <div style={{ fontSize: 76, lineHeight: 1, filter: "drop-shadow(0 8px 18px rgba(255,120,150,0.55))", animation: "bdayBounce 2.4s ease-in-out infinite" }}>🎂</div>
        <p style={{ margin: "14px 0 2px", fontSize: 13, fontWeight: 900, letterSpacing: 3, color: "#f0568a", textTransform: "uppercase" }}>🎉 Happy Birthday 🎉</p>
        <h2 style={{
          margin: 0, fontSize: 26, fontWeight: 900,
          background: "linear-gradient(90deg,#ff5e7e,#ff9f43,#c58bff)",
          WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "#ff5e7e",
        }}>สุขสันต์วันเกิด{name ? ` คุณ${name}` : ""}</h2>
        <p style={{ margin: "12px 0 0", fontSize: 14, lineHeight: 1.7, color: "#6b7280", fontWeight: 500 }}>
          ขอให้มีความสุขมากๆ สุขภาพแข็งแรง<br />คิดสิ่งใดสมหวังทุกประการ 🎂🎈✨
        </p>
        <button
          onClick={() => setShow(false)}
          style={{
            margin: "20px auto 6px", display: "block", padding: "12px 32px", border: "none",
            borderRadius: 999, cursor: "pointer", fontSize: 15, fontWeight: 800, color: "#fff",
            background: "linear-gradient(135deg,#ff5e7e,#ff9f43)",
            boxShadow: "0 10px 24px -6px rgba(255,94,126,0.7)",
          }}
        >ขอบคุณครับ/ค่ะ 🥳</button>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "#b6a3ad", fontWeight: 600 }}>— ด้วยรักจากทีม SHD Technology 💛</p>
      </div>

      {/* keyframes เฉพาะ confetti + เค้กเด้ง (ประดับ — การ์ดไม่พึ่ง) */}
      <style>{`
        @keyframes bdayFall { 0%{transform:translateY(-20px) rotate(0);opacity:0} 10%{opacity:1} 100%{transform:translateY(105vh) rotate(720deg);opacity:.9} }
        @keyframes bdayBounce { 0%,100%{transform:translateY(0) rotate(-3deg)} 50%{transform:translateY(-8px) rotate(3deg)} }
      `}</style>
    </div>
  )
}
