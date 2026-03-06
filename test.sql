"use client"
import { useState, useRef } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { User, Phone, Mail, Calendar, Building2, LogOut, ChevronRight, Camera, Loader2, Check } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import Link from "next/link"
import toast from "react-hot-toast"

export default function ProfilePage() {
  const { user, signOut } = useAuth()
  const emp = user?.employee
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(emp?.avatar_url ?? null)

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error("ไฟล์ใหญ่เกิน 5MB")
    if (!file.type.startsWith("image/")) return toast.error("กรุณาเลือกไฟล์รูปภาพ")

    setUploading(true)
    try {
      const supabase = createClient()
      const empId = user?.employee_id ?? (user as any)?.employee?.id
      const ext  = file.name.split(".").pop()
      const path = `avatars/${empId}.${ext}`

      const { error: upErr } = await supabase.storage
        .from("employee-avatars")
        .upload(path, file, { upsert: true, contentType: file.type })
      if (upErr) throw upErr

      const { data: { publicUrl } } = supabase.storage
        .from("employee-avatars")
        .getPublicUrl(path)

      const { error: dbErr } = await supabase
        .from("employees")
        .update({ avatar_url: publicUrl + "?t=" + Date.now() })
        .eq("id", empId)
      if (dbErr) throw dbErr

      setAvatarUrl(publicUrl + "?t=" + Date.now())
      toast.success("อัปเดตรูปโปรไฟล์แล้ว ✓")
    } catch (err: any) {
      toast.error(err.message || "อัปโหลดไม่สำเร็จ")
    }
    setUploading(false)
  }

  if (!emp) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 size={24} className="animate-spin text-slate-300" />
    </div>
  )

  const displayUrl = avatarUrl ?? emp.avatar_url

  return (
    <div className="flex flex-col bg-slate-50 min-h-screen pb-10">

      {/* Hero header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-4 pt-10 pb-16">
        <h1 className="text-white font-bold text-[17px] text-center mb-6">โปรไฟล์</h1>

        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-2xl border-4 border-white/30 shadow-xl overflow-hidden bg-indigo-400">
              {displayUrl
                ? <img src={displayUrl} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center">
                    <span className="text-white text-3xl font-black">{emp.first_name_th?.[0]}</span>
                  </div>
              }
            </div>
            {/* Upload button */}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-xl shadow-lg flex items-center justify-center active:scale-90 transition-all"
            >
              {uploading
                ? <Loader2 size={14} className="animate-spin text-indigo-600" />
                : <Camera size={14} className="text-indigo-600" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>

          <div className="mt-4 text-center">
            <h2 className="text-white font-black text-xl">{emp.first_name_th} {emp.last_name_th}</h2>
            {emp.first_name_en && <p className="text-indigo-200 text-sm mt-0.5">{emp.first_name_en} {emp.last_name_en}</p>}
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">{emp.position?.name}</span>
              <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full">{emp.employee_code}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content — overlaps hero */}
      <div className="px-4 -mt-8 space-y-3">

        {/* Info card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-50">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">ข้อมูลส่วนตัว</p>
          </div>
          <div className="divide-y divide-slate-50">
            {[
              { icon: Mail,      label: "อีเมล",        value: emp.email },
              { icon: Phone,     label: "เบอร์โทร",     value: emp.phone },
              { icon: Building2, label: "แผนก",          value: emp.department?.name },
              { icon: Building2, label: "บริษัท",        value: emp.company?.name_th },
              { icon: Calendar,  label: "วันเริ่มงาน",   value: emp.hire_date ? format(new Date(emp.hire_date), "d MMMM yyyy", { locale: th }) : null },
            ].filter(i => i.value).map(item => (
              <div key={item.label} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center shrink-0">
                  <item.icon size={14} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-slate-400">{item.label}</p>
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Salary shortcut */}
        <Link href="/app/salary"
          className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl px-4 py-4 flex items-center gap-3 shadow-lg shadow-emerald-100 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-xl">💰</span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">สรุปเงินเดือน</p>
            <p className="text-emerald-100 text-xs">ดูรายได้ การหัก และกราฟรายเดือน</p>
          </div>
          <ChevronRight size={18} className="text-white/70" />
        </Link>

        {/* Role shortcuts */}
        {user?.role === "manager" && (
          <Link href="/manager/dashboard" className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between active:bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">ระบบหัวหน้าทีม</span>
            <ChevronRight size={16} className="text-slate-400" />
          </Link>
        )}
        {["hr_admin", "super_admin"].includes(user?.role || "") && (
          <Link href="/admin/dashboard" className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3.5 flex items-center justify-between active:bg-slate-50">
            <span className="text-sm font-semibold text-slate-700">ระบบ HR Admin</span>
            <ChevronRight size={16} className="text-slate-400" />
          </Link>
        )}

        {/* Sign out */}
        <button onClick={signOut}
          className="w-full bg-white rounded-2xl border border-red-100 px-4 py-4 flex items-center justify-center gap-2 text-red-500 font-semibold text-sm active:bg-red-50 transition-colors shadow-sm">
          <LogOut size={16} /> ออกจากระบบ
        </button>

        <p className="text-center text-[11px] text-slate-300 pb-2">HRMS v2.0 · {emp.company?.name_th}</p>
      </div>
    </div>
  )
}