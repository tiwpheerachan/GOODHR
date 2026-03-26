"use client"
import { useState } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import Link from "next/link"
import {
  ArrowLeft, Lock, Eye, EyeOff, Loader2, CheckCircle2,
  Shield, Mail, AlertTriangle, KeyRound,
} from "lucide-react"
import toast from "react-hot-toast"

export default function SettingsPage() {
  const { user } = useAuth()
  const emp = user?.employee as any

  // ── Password state ──
  const [current, setCurrent]   = useState("")
  const [newPw,   setNewPw]     = useState("")
  const [confirm, setConfirm]   = useState("")
  const [showCur, setShowCur]   = useState(false)
  const [showNew, setShowNew]   = useState(false)
  const [showCon, setShowCon]   = useState(false)
  const [pwLoading, setPwLoading]  = useState(false)
  const [pwSuccess, setPwSuccess]  = useState(false)
  const [pwError, setPwError]      = useState<string|null>(null)

  // ── Password validation ──
  const pwLen   = newPw.length >= 6
  const pwMatch = newPw === confirm && confirm.length > 0
  const pwDiff  = newPw !== current || newPw.length === 0
  const canPw   = current.length > 0 && pwLen && pwMatch && pwDiff

  // ── Handle password change ──
  const handlePwSubmit = async () => {
    if (!canPw) return
    setPwLoading(true); setPwError(null)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: newPw }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ")
      setPwSuccess(true)
      setCurrent(""); setNewPw(""); setConfirm("")
      toast.success("เปลี่ยนรหัสผ่านสำเร็จ")
    } catch (e: any) {
      setPwError(e.message); toast.error(e.message)
    } finally { setPwLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-32">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-4 pt-12 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <Link href="/app/profile" className="p-1 -ml-1 rounded-lg hover:bg-white/20 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-lg font-semibold">ตั้งค่าบัญชี</h1>
        </div>
        <p className="text-sm text-white/60 ml-8">จัดการรหัสผ่านเข้าสู่ระบบ</p>
      </div>

      <div className="px-4 -mt-3 space-y-4">
        {/* Account info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Mail className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-400">อีเมลเข้าสู่ระบบ</p>
              <p className="text-sm font-semibold text-slate-800">{(user as any)?.email}</p>
            </div>
          </div>
          {emp && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-400">ชื่อพนักงาน</p>
                <p className="text-sm font-semibold text-slate-800">
                  {emp.first_name_th} {emp.last_name_th} ({emp.employee_code})
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════
            เปลี่ยนรหัสผ่าน
        ═══════════════════════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-2 mb-4">
            <KeyRound className="w-5 h-5 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-800">เปลี่ยนรหัสผ่าน</h2>
          </div>

          {pwSuccess ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-green-800">เปลี่ยนรหัสผ่านสำเร็จ</p>
              <p className="text-xs text-slate-400 mt-1">ระบบได้ส่งอีเมลแจ้งเตือนไปยัง {(user as any)?.email} แล้ว</p>
              <button onClick={() => setPwSuccess(false)}
                className="mt-3 text-xs text-indigo-600 underline">เปลี่ยนอีกครั้ง</button>
            </div>
          ) : (
            <>
              {/* Current password */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">รหัสผ่านปัจจุบัน *</label>
                <div className="relative">
                  <input
                    type={showCur ? "text" : "password"}
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    placeholder="กรอกรหัสผ่านเดิม"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
                  />
                  <button onClick={() => setShowCur(!showCur)} type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCur ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">รหัสผ่านใหม่ *</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPw}
                    onChange={e => setNewPw(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all"
                  />
                  <button onClick={() => setShowNew(!showNew)} type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
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
                {newPw.length > 0 && !pwLen && (
                  <p className="text-[10px] text-red-500 mt-1">ต้องมีอย่างน้อย 6 ตัวอักษร</p>
                )}
                {newPw.length > 0 && current.length > 0 && !pwDiff && (
                  <p className="text-[10px] text-red-500 mt-1">รหัสใหม่ต้องไม่ซ้ำกับรหัสเดิม</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="mb-4">
                <label className="text-xs font-medium text-slate-500 mb-1.5 block">ยืนยันรหัสผ่านใหม่ *</label>
                <div className="relative">
                  <input
                    type={showCon ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                    className={`w-full bg-slate-50 border rounded-xl px-3 py-2.5 pr-10 text-sm text-slate-700 outline-none focus:ring-2 transition-all ${
                      confirm.length > 0 && !pwMatch
                        ? "border-red-300 focus:border-red-400 focus:ring-red-400/10"
                        : confirm.length > 0 && pwMatch
                        ? "border-green-300 focus:border-green-400 focus:ring-green-400/10"
                        : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-400/10"
                    }`}
                  />
                  <button onClick={() => setShowCon(!showCon)} type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCon ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
                {confirm.length > 0 && !pwMatch && (
                  <p className="text-[10px] text-red-500 mt-1">รหัสผ่านไม่ตรงกัน</p>
                )}
                {confirm.length > 0 && pwMatch && (
                  <p className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={10}/> รหัสผ่านตรงกัน
                  </p>
                )}
              </div>

              {/* Error */}
              {pwError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 mb-4">
                  <AlertTriangle size={14} className="text-red-500 flex-shrink-0"/>
                  <p className="text-xs text-red-600">{pwError}</p>
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handlePwSubmit}
                disabled={!canPw || pwLoading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-medium text-sm shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
              >
                {pwLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin"/> กำลังเปลี่ยนรหัสผ่าน...</>
                ) : (
                  <><Lock className="w-4 h-4"/> เปลี่ยนรหัสผ่าน</>
                )}
              </button>
            </>
          )}
        </div>

        {/* Forgot password hint */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0"/>
            <div>
              <p className="text-sm font-medium text-amber-800 mb-1">ลืมรหัสผ่านเดิม?</p>
              <p className="text-xs text-amber-600 leading-relaxed">
                กดปุ่มด้านล่างเพื่อส่งลิงก์รีเซ็ตไปยังอีเมล <strong>{(user as any)?.email}</strong> หรือแจ้ง HR เพื่อรีเซ็ตรหัสผ่านให้
              </p>
              <ForgotPasswordButton email={(user as any)?.email || ""} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Sub-component: ปุ่มส่ง email reset ──
function ForgotPasswordButton({ email }: { email: string }) {
  const [sending, setSending]   = useState(false)
  const [sent,    setSent]      = useState(false)

  const handleForgot = async () => {
    if (!email || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setSent(true)
      toast.success("ส่งลิงก์รีเซ็ตรหัสผ่านแล้ว ตรวจสอบอีเมล")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <p className="text-xs text-green-700 bg-green-100 rounded-lg px-3 py-2 mt-2 flex items-center gap-1.5">
        <CheckCircle2 size={12}/> ส่งลิงก์ไปยัง {email} แล้ว — กรุณาตรวจสอบอีเมล
      </p>
    )
  }

  return (
    <button
      onClick={handleForgot}
      disabled={sending}
      className="mt-2 text-xs text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
    >
      {sending ? <Loader2 size={12} className="animate-spin"/> : <Mail size={12}/>}
      {sending ? "กำลังส่ง..." : "ส่งลิงก์รีเซ็ตไปยังอีเมล"}
    </button>
  )
}
