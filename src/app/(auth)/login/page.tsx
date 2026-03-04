"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import toast from "react-hot-toast"
import Link from "next/link"

export default function LoginPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [mode, setMode]       = useState<"login" | "signup">("login")
  const [email, setEmail]     = useState("")
  const [password, setPassword] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [fullName, setFullName]   = useState("")
  const [loading, setLoading]     = useState(false)
  const [showPw, setShowPw]       = useState(false)
  const [mounted, setMounted]     = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "signup" && password !== confirmPw) {
      toast.error("รหัสผ่านไม่ตรงกัน"); return
    }
    setLoading(true)
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: fullName } },
        })
        if (error) throw error
        toast.success("สมัครสำเร็จ! กรุณายืนยันอีเมลของคุณ", { duration: 5000 })
        setMode("login")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        router.push("/")
      }
    } catch (err: any) {
      toast.error(err.message || "เกิดข้อผิดพลาด")
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center relative overflow-hidden p-4">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      {/* Glow orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/10 rounded-full blur-3xl pointer-events-none" />

      <div
        className="relative w-full max-w-[400px] transition-all duration-700"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)" }}
      >

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-900/50 mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="9" cy="7" r="4" stroke="white" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-white font-black text-2xl tracking-tight">SHD HRMS</h1>
          <p className="text-slate-500 text-sm mt-1">ระบบบริหารทรัพยากรบุคคล</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-6 backdrop-blur-xl shadow-2xl">

          {/* Mode tabs */}
          <div className="flex bg-white/5 rounded-2xl p-1 mb-6">
            {(["login","signup"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={"flex-1 py-2 text-sm font-bold rounded-xl transition-all duration-200 " +
                  (mode === m
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-400 hover:text-slate-300")}>
                {m === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              </button>
            ))}
          </div>

          {/* Google button */}
          <button onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm py-3 px-4 rounded-2xl transition-all duration-200 active:scale-[0.98] shadow-lg shadow-black/20 mb-4">
            <GoogleIcon />
            {mode === "login" ? "เข้าสู่ระบบด้วย Google" : "สมัครด้วย Google"}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-600 font-medium">หรือใช้อีเมล</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Form */}
          <div className="space-y-3">

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">ชื่อ-นามสกุล</label>
                <input
                  type="text" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="กรอกชื่อ-นามสกุล"
                  required={mode === "signup"}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">อีเมล</label>
              <input
                type="email" value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">รหัสผ่าน</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  required minLength={6}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-12 text-white text-sm placeholder-slate-600 outline-none focus:border-indigo-500/60 focus:bg-white/8 transition-all"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                  {showPw
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">ยืนยันรหัสผ่าน</label>
                <input
                  type="password" value={confirmPw}
                  onChange={e => setConfirmPw(e.target.value)}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  required={mode === "signup"}
                  className={"w-full bg-white/5 border rounded-2xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none transition-all " +
                    (confirmPw && confirmPw !== password
                      ? "border-red-500/60 focus:border-red-500"
                      : "border-white/10 focus:border-indigo-500/60 focus:bg-white/8")}
                />
                {confirmPw && confirmPw !== password && (
                  <p className="text-red-400 text-xs mt-1 ml-1">รหัสผ่านไม่ตรงกัน</p>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold text-sm shadow-xl shadow-indigo-900/50 hover:shadow-indigo-900/70 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1">
              {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
            </button>

          </div>

          {mode === "login" && (
            <p className="text-center text-xs text-slate-600 mt-4">
              ลืมรหัสผ่าน?{" "}
              <button
                type="button"
                onClick={async () => {
                  if (!email) { toast.error("กรุณากรอกอีเมลก่อน"); return }
                  await createClient().auth.resetPasswordForEmail(email, {
                    redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`
                  })
                  toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลแล้ว")
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                รีเซ็ตรหัสผ่าน
              </button>
            </p>
          )}

          {mode === "signup" && (
            <p className="text-center text-xs text-slate-600 mt-4 px-2">
              การสมัครสมาชิก หมายความว่าคุณยอมรับ{" "}
              <span className="text-indigo-400">นโยบายความเป็นส่วนตัว</span>
              {" "}และ{" "}
              <span className="text-indigo-400">ข้อกำหนดการใช้งาน</span>
            </p>
          )}
        </div>

        <p className="text-center text-slate-700 text-xs mt-6">
          © 2026 SHD Technology Co., Ltd.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}