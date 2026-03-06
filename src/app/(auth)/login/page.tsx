"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import { Eye, EyeOff, Mail, Lock, User, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "signup">("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "signup" && password !== confirmPw) {
      toast.error("รหัสผ่านไม่ตรงกัน")
      return
    }

    setLoading(true)
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        toast.success("สมัครสำเร็จ! กรุณายืนยันอีเมล", { duration: 5000 })
        setMode("login")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/")
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-12">
        <div
          className="w-full max-w-[420px]"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <div className="flex flex-col items-center mb-8">
            <img
              src="https://shd-technology.co.th/images/logo.png"
              alt="SHD Logo"
              width={160}
              height={80}
              style={{ objectFit: "contain", maxHeight: "80px" }}
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-2">
              {mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชีใหม่"}
            </h1>
            <p className="text-slate-400 text-sm">
              {mode === "login"
                ? "กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ"
                : "กรอกข้อมูลเพื่อเริ่มต้นใช้งาน"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ชื่อ-นามสกุล</label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="กรอกชื่อ-นามสกุล"
                    required={mode === "signup"}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-slate-800 text-sm placeholder-slate-300 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5">อีเมล</label>
              <div className="relative">
                <Mail
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3.5 text-slate-800 text-sm placeholder-slate-300 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-500">รหัสผ่าน</label>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!email) {
                        toast.error("กรุณากรอกอีเมลก่อน")
                        return
                      }
                      await createClient().auth.resetPasswordForEmail(email, {
                        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
                      })
                      toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว")
                    }}
                    className="text-xs text-indigo-500 font-semibold hover:text-indigo-700 transition-colors"
                  >
                    ลืมรหัสผ่าน?
                  </button>
                )}
              </div>

              <div className="relative">
                <Lock
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required
                  minLength={6}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-11 py-3.5 text-slate-800 text-sm placeholder-slate-300 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">ยืนยันรหัสผ่าน</label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="password"
                    value={confirmPw}
                    onChange={(e) => setConfirmPw(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    required={mode === "signup"}
                    className={
                      "w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3.5 text-slate-800 text-sm placeholder-slate-300 outline-none transition-all " +
                      (confirmPw && confirmPw !== password
                        ? "border-red-400 focus:ring-2 focus:ring-red-500/10"
                        : "border-slate-200 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/10")
                    }
                  />
                </div>
                {confirmPw && confirmPw !== password && (
                  <p className="text-red-500 text-xs mt-1.5 ml-1">รหัสผ่านไม่ตรงกัน</p>
                )}
              </div>
            )}

            <div className="relative mt-2">
              {["star-1", "star-2", "star-3", "star-4", "star-5", "star-6"].map((s) => (
                <span key={s} className={`star ${s}`} style={{ zIndex: 10 }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="white">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                </span>
              ))}

              <span className="sparkle-dot sparkle-a" />
              <span className="sparkle-dot sparkle-b" />
              <span className="sparkle-dot sparkle-c" />
              <span className="sparkle-dot sparkle-d" />

              <button
                type="submit"
                disabled={loading}
                className="btn-shimmer w-full rounded-xl py-3.5 font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                  {mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
                </span>
              </button>
            </div>

            <p className="text-center text-sm text-slate-500">
              {mode === "login" ? "ยังไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login")
                  setPassword("")
                  setConfirmPw("")
                }}
                className="text-indigo-600 font-bold hover:text-indigo-700 transition-colors"
              >
                {mode === "login" ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
              </button>
            </p>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-300">หรือ</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-2.5 bg-white/92 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold text-sm py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-sm backdrop-blur-sm"
            >
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>
          </form>

          <p className="text-center text-xs text-slate-300 mt-8">
            © 2026 SHD Technology Co., Ltd.
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes star-pop {
          0% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          40% {
            opacity: 1;
            transform: scale(1.15) rotate(12deg);
          }
          60% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: scale(0) rotate(-10deg);
          }
        }

        @keyframes btn-shine {
          0% {
            transform: translateX(-140%) rotate(18deg);
            opacity: 0;
          }
          18% {
            opacity: 0.42;
          }
          45% {
            transform: translateX(260%) rotate(18deg);
            opacity: 0.18;
          }
          100% {
            transform: translateX(260%) rotate(18deg);
            opacity: 0;
          }
        }

        @keyframes btn-sparkle {
          0%,
          100% {
            opacity: 0.2;
            transform: scale(0.75);
          }
          50% {
            opacity: 1;
            transform: scale(1.35);
          }
        }

        .btn-shimmer {
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1d9bf0 0%, #22b3f3 38%, #39c2ff 70%, #57ccff 100%);
          box-shadow: 0 18px 34px rgba(14, 165, 233, 0.22);
          border: 1px solid rgba(125, 211, 252, 0.28);
        }

        .btn-shimmer::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.14),
            rgba(255, 255, 255, 0.03) 42%,
            rgba(255, 255, 255, 0.12) 100%
          );
        }

        .btn-shimmer::after {
          content: "";
          position: absolute;
          top: -30%;
          bottom: -30%;
          left: -30%;
          width: 36%;
          transform: rotate(18deg);
          background: rgba(255, 255, 255, 0.18);
          filter: blur(18px);
          animation: btn-shine 5.2s ease-in-out infinite;
        }

        .btn-shimmer:hover {
          filter: brightness(1.04);
          box-shadow: 0 20px 36px rgba(14, 165, 233, 0.28);
        }

        .star {
          position: absolute;
          pointer-events: none;
          line-height: 1;
        }

        .star svg {
          display: block;
          filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.75));
        }

        .star-1 {
          animation: star-pop 1.9s ease-in-out infinite 0s;
          top: -4px;
          left: 24px;
        }

        .star-2 {
          animation: star-pop 1.9s ease-in-out infinite 0.35s;
          top: -4px;
          right: 32px;
        }

        .star-3 {
          animation: star-pop 1.9s ease-in-out infinite 0.7s;
          bottom: -4px;
          left: 48px;
        }

        .star-4 {
          animation: star-pop 1.9s ease-in-out infinite 1.05s;
          bottom: -4px;
          right: 48px;
        }

        .star-5 {
          animation: star-pop 1.9s ease-in-out infinite 1.4s;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
        }

        .star-6 {
          animation: star-pop 1.9s ease-in-out infinite 1.75s;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
        }

        .sparkle-dot {
          position: absolute;
          border-radius: 9999px;
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.9);
          animation: btn-sparkle 3.2s ease-in-out infinite;
          pointer-events: none;
        }

        .sparkle-a {
          width: 6px;
          height: 6px;
          top: 22%;
          left: 18%;
          animation-delay: 0s;
        }

        .sparkle-b {
          width: 4px;
          height: 4px;
          top: 28%;
          left: 58%;
          animation-delay: 0.6s;
        }

        .sparkle-c {
          width: 6px;
          height: 6px;
          top: 20%;
          right: 16%;
          animation-delay: 0.95s;
        }

        .sparkle-d {
          width: 4px;
          height: 4px;
          bottom: 22%;
          right: 28%;
          animation-delay: 1.2s;
        }
      `}</style>
    </>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}