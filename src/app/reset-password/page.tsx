"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Lock, Eye, EyeOff, Loader2, CheckCircle2,
  AlertTriangle, KeyRound, ArrowRight,
} from "lucide-react"
import Link from "next/link"
import toast from "react-hot-toast"

export default function ResetPasswordPage() {
  const [newPw,   setNewPw]   = useState("")
  const [confirm, setConfirm] = useState("")
  const [showNew, setShowNew] = useState(false)
  const [showCon, setShowCon] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error,   setError]   = useState<string|null>(null)
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  const supabase = createClient()

  // ── ตรวจสอบว่ามี session (จาก recovery link) ──
  useEffect(() => {
    // listen for auth state change FIRST (recovery link จะ trigger PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setHasSession(true)
        setChecking(false)
      }
    })

    // ให้เวลา Supabase client ประมวลผล hash fragment / cookie ก่อน
    const check = async () => {
      // รอ 500ms ให้ supabase client process URL hash fragments (ถ้ามี)
      await new Promise(r => setTimeout(r, 500))
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
      }
      setChecking(false)
    }
    check()

    return () => subscription.unsubscribe()
  }, [supabase])

  const pwLen   = newPw.length >= 6
  const pwMatch = newPw === confirm && confirm.length > 0
  const canSubmit = pwLen && pwMatch

  const handleReset = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError(null)

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPw,
      })
      if (updateErr) throw new Error(updateErr.message)

      setSuccess(true)
      toast.success("ตั้งรหัสผ่านใหม่สำเร็จ")
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Loading ──
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-3"/>
          <p className="text-sm text-slate-400">กำลังตรวจสอบลิงก์...</p>
        </div>
      </div>
    )
  }

  // ── ไม่มี session (ลิงก์หมดอายุหรือไม่ถูกต้อง) ──
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500"/>
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">ลิงก์หมดอายุหรือไม่ถูกต้อง</h2>
          <p className="text-sm text-slate-400 mb-6">กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่ หรือแจ้ง HR</p>
          <Link href="/login"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">
            กลับไปหน้าเข้าสู่ระบบ <ArrowRight size={14}/>
          </Link>
        </div>
      </div>
    )
  }

  // ── สำเร็จ ──
  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle2 className="w-10 h-10 text-green-500"/>
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">ตั้งรหัสผ่านใหม่สำเร็จ</h2>
        <p className="text-sm text-slate-400 mb-6">กดด้านล่างเพื่อเข้าสู่ระบบด้วยรหัสผ่านใหม่</p>
        <Link href="/login"
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-colors">
          เข้าสู่ระบบ <ArrowRight size={14}/>
        </Link>
      </div>
    )
  }

  // ── Form ──
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-8 h-8 text-indigo-600"/>
          </div>
          <h1 className="text-xl font-bold text-slate-800 mb-1">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-sm text-slate-400">กรุณากรอกรหัสผ่านใหม่ที่ต้องการ</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          {/* New password */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">รหัสผ่านใหม่ *</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="อย่างน้อย 6 ตัวอักษร"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
              />
              <button onClick={() => setShowNew(!showNew)} type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {newPw.length > 0 && (
              <div className="flex gap-1 mt-2">
                <div className={`h-1 flex-1 rounded-full ${newPw.length >= 2 ? "bg-red-400" : "bg-slate-200"}`}/>
                <div className={`h-1 flex-1 rounded-full ${newPw.length >= 6 ? "bg-amber-400" : "bg-slate-200"}`}/>
                <div className={`h-1 flex-1 rounded-full ${newPw.length >= 8 && /[A-Z]/.test(newPw) && /[0-9]/.test(newPw) ? "bg-green-400" : "bg-slate-200"}`}/>
              </div>
            )}
          </div>

          {/* Confirm */}
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">ยืนยันรหัสผ่านใหม่ *</label>
            <div className="relative">
              <input
                type={showCon ? "text" : "password"}
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 pr-10 text-sm outline-none focus:ring-2 transition-all ${
                  confirm.length > 0 && !pwMatch
                    ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                    : confirm.length > 0 && pwMatch
                    ? "border-green-300 focus:border-green-400 focus:ring-green-400/10"
                    : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/10"
                }`}
              />
              <button onClick={() => setShowCon(!showCon)} type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showCon ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
            {confirm.length > 0 && pwMatch && (
              <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 size={10}/> รหัสผ่านตรงกัน
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0"/>
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleReset}
            disabled={!canSubmit || loading}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin"/> กำลังบันทึก...</>
            ) : (
              <><Lock className="w-4 h-4"/> ตั้งรหัสผ่านใหม่</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
