"use client"
import { useState, useRef, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import {
  User, Phone, Mail, Calendar, Building2, Shield,
  Camera, Check, ChevronRight, LogOut, Lock, Eye, EyeOff
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import toast from "react-hot-toast"

const inp = "bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/10 transition-all w-full"

const ROLE_LABEL: Record<string, { l: string; c: string }> = {
  super_admin: { l: "Super Admin", c: "bg-violet-100 text-violet-700" },
  hr_admin:    { l: "HR Admin",    c: "bg-indigo-100 text-indigo-700" },
  manager:     { l: "ผู้จัดการ",  c: "bg-sky-100 text-sky-700"      },
  employee:    { l: "พนักงาน",    c: "bg-slate-100 text-slate-600"  },
}

export default function AdminProfilePage() {
  const { user, loading, signOut } = useAuth()
  const supabase = createClient()
  const fileRef  = useRef<HTMLInputElement>(null)

  // ── ALL hooks must be declared before any early return ─────────
  const [avatarUrl,   setAvatarUrl]   = useState<string | undefined>(undefined)
  const [uploadingAv, setUploadingAv] = useState(false)
  const [pwForm,      setPwForm]      = useState({ next: "", confirm: "" })
  const [showPw,      setShowPw]      = useState({ next: false, confirm: false })
  const [savingPw,    setSavingPw]    = useState(false)

  const emp = user?.employee

  useEffect(() => {
    if (emp?.avatar_url) setAvatarUrl(emp.avatar_url)
  }, [emp?.avatar_url])

  // ── early returns (after ALL hooks) ────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"/>
    </div>
  )
  if (!user) return (
    <div className="text-center py-16 text-slate-400">
      <p className="font-semibold">ไม่พบข้อมูลผู้ใช้งาน</p>
    </div>
  )

  // ── handlers ───────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !emp?.id) return
    setUploadingAv(true)
    try {
      const ext  = file.name.split(".").pop()
      const path = `avatars/${emp.id}.${ext}`
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true })
      if (upErr) return toast.error("อัปโหลดรูปไม่สำเร็จ: " + upErr.message)
      const { data } = supabase.storage.from("avatars").getPublicUrl(path)
      const url = data.publicUrl + "?t=" + Date.now()
      await supabase.from("employees").update({ avatar_url: url }).eq("id", emp.id)
      setAvatarUrl(url)
      toast.success("✓ อัปเดตรูปโปรไฟล์แล้ว")
    } finally { setUploadingAv(false) }
  }

  const handleChangePassword = async () => {
    if (!pwForm.next || pwForm.next.length < 8) return toast.error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร")
    if (pwForm.next !== pwForm.confirm) return toast.error("รหัสผ่านยืนยันไม่ตรงกัน")
    setSavingPw(true)
    const { error } = await supabase.auth.updateUser({ password: pwForm.next })
    setSavingPw(false)
    if (error) return toast.error(error.message)
    toast.success("✓ เปลี่ยนรหัสผ่านสำเร็จ")
    setPwForm({ next: "", confirm: "" })
  }

  const roleInfo = ROLE_LABEL[user?.role ?? ""] ?? { l: user?.role ?? "", c: "bg-slate-100 text-slate-600" }

  // ── render ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-slate-800">โปรไฟล์</h2>
        <p className="text-slate-400 text-sm mt-0.5">ข้อมูลบัญชีและการตั้งค่า</p>
      </div>

      {/* Avatar + name */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center overflow-hidden font-black text-indigo-600 text-3xl shadow-sm">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="w-full h-full object-cover"/>
                : (emp?.first_name_th?.[0] ?? <User size={28}/>)}
            </div>
            <button onClick={() => fileRef.current?.click()} disabled={uploadingAv || !emp}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-indigo-600 text-white rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm">
              {uploadingAv ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Camera size={12}/>}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange}/>
          </div>

          <div className="flex-1 min-w-0">
            {emp ? (
              <>
                <h3 className="text-xl font-black text-slate-800">{emp.first_name_th} {emp.last_name_th}</h3>
                {emp.first_name_en && <p className="text-slate-400 text-sm">{emp.first_name_en} {emp.last_name_en}</p>}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${roleInfo.c}`}>{roleInfo.l}</span>
                  {emp.employee_code && <span className="text-xs text-slate-400 font-semibold">{emp.employee_code}</span>}
                  {emp.position?.name && <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-semibold">{emp.position.name}</span>}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-black text-slate-800">{user.role === "super_admin" ? "Super Admin" : "Admin"}</h3>
                <div className="mt-2"><span className={`text-xs font-black px-2.5 py-1 rounded-lg ${roleInfo.c}`}>{roleInfo.l}</span></div>
                <p className="text-xs text-slate-400 mt-1">ไม่มีข้อมูลพนักงานที่เชื่อมโยง</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Employee info */}
      {emp && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50">
            <h3 className="font-black text-slate-700 text-sm">ข้อมูลพนักงาน</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { icon: Mail,      label: "อีเมล",        value: emp.email },
              { icon: Phone,     label: "เบอร์โทร",     value: emp.phone },
              { icon: Building2, label: "บริษัท",        value: emp.company?.name_th },
              { icon: Building2, label: "แผนก",          value: emp.department?.name },
              { icon: Building2, label: "สาขา",          value: emp.branch?.name },
              { icon: Calendar,  label: "วันเริ่มงาน",   value: emp.hire_date ? format(new Date(emp.hire_date), "d MMMM yyyy", { locale: th }) : null },
              { icon: Calendar,  label: "หมดทดลองงาน",  value: emp.probation_end_date ? format(new Date(emp.probation_end_date), "d MMMM yyyy", { locale: th }) : null },
            ].filter(i => i.value).map(item => (
              <div key={item.label} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <item.icon size={13} className="text-slate-500"/>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Change password */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-2">
          <Lock size={14} className="text-slate-400"/>
          <h3 className="font-black text-slate-700 text-sm">เปลี่ยนรหัสผ่าน</h3>
        </div>
        <div className="px-5 py-4 space-y-3">
          {(["next", "confirm"] as const).map(field => {
            const labels = { next: "รหัสผ่านใหม่", confirm: "ยืนยันรหัสผ่านใหม่" }
            return (
              <div key={field}>
                <label className="text-xs font-bold text-slate-500 mb-1.5 block">{labels[field]}</label>
                <div className="relative">
                  <input
                    type={showPw[field] ? "text" : "password"}
                    value={pwForm[field]}
                    onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                    className={inp + " pr-10"}
                    placeholder={field === "next" ? "อย่างน้อย 8 ตัวอักษร" : ""}
                  />
                  <button type="button"
                    onClick={() => setShowPw(s => ({ ...s, [field]: !s[field] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showPw[field] ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                </div>
              </div>
            )
          })}
          <button onClick={handleChangePassword} disabled={savingPw || !pwForm.next || !pwForm.confirm}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-1">
            {savingPw
              ? <><div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"/> กำลังบันทึก</>
              : <><Check size={13}/> บันทึกรหัสผ่าน</>}
          </button>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
        <Link href="/app/dashboard" className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><User size={13} className="text-slate-500"/></div>
            <span className="text-sm font-semibold text-slate-700">ไปยัง User Mode</span>
          </div>
          <ChevronRight size={14} className="text-slate-300"/>
        </Link>
        <Link href="/admin/settings" className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center"><Shield size={13} className="text-slate-500"/></div>
            <span className="text-sm font-semibold text-slate-700">ตั้งค่าระบบ</span>
          </div>
          <ChevronRight size={14} className="text-slate-300"/>
        </Link>
      </div>

      {/* Sign out */}
      <button onClick={signOut}
        className="w-full bg-white border border-red-100 rounded-2xl py-3.5 flex items-center justify-center gap-2.5 text-red-500 font-bold text-sm hover:bg-red-50 transition-colors shadow-sm">
        <LogOut size={15}/> ออกจากระบบ
      </button>

    </div>
  )
}