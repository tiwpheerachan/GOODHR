"use client"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/hooks/useAuth"
import { Plus, Clock, Edit2, Save, X, Trash2 } from "lucide-react"
import toast from "react-hot-toast"

interface ShiftDef {
  id: string
  name: string
  shift_type: string
  work_start: string
  work_end: string
  break_minutes: number
  is_overnight: boolean
}

const COLORS: Record<string, string> = {
  "07:00": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "09:00": "bg-blue-50 text-blue-700 border-blue-200",
  "10:00": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "10:30": "bg-teal-50 text-teal-700 border-teal-200",
  "11:00": "bg-violet-50 text-violet-700 border-violet-200",
  "12:00": "bg-amber-50 text-amber-700 border-amber-200",
  "12:30": "bg-orange-50 text-orange-700 border-orange-200",
  "13:00": "bg-rose-50 text-rose-700 border-rose-200",
  "15:30": "bg-indigo-50 text-indigo-700 border-indigo-200",
  "16:00": "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
}

function getColor(start: string): string {
  const key = start?.substring(0, 5) ?? ""
  return COLORS[key] ?? "bg-slate-50 text-slate-700 border-slate-200"
}

export default function ShiftSettingsPage() {
  const { user } = useAuth()
  const [shifts, setShifts] = useState<ShiftDef[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: "", shift_type: "", work_start: "", work_end: "", break_minutes: 60, is_overnight: false })

  const load = async () => {
    const res = await fetch("/api/shifts/definitions")
    const data = await res.json()
    if (data.success) setShifts(data.shifts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.work_start || !form.work_end) {
      toast.error("กรุณากรอกเวลาเข้า-ออก")
      return
    }
    const payload = editId ? { ...form, id: editId } : form
    if (!payload.name) {
      payload.name = `กะ ${form.work_start.substring(0, 5)}-${form.work_end.substring(0, 5)}`
    }
    if (!payload.shift_type) {
      payload.shift_type = form.work_start.substring(0, 5).replace(":", "")
    }
    const res = await fetch("/api/shifts/definitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.success) {
      toast.success(editId ? "อัปเดตสำเร็จ" : "เพิ่มกะสำเร็จ")
      setEditId(null)
      setShowAdd(false)
      setForm({ name: "", shift_type: "", work_start: "", work_end: "", break_minutes: 60, is_overnight: false })
      load()
    } else {
      toast.error(data.error)
    }
  }

  const startEdit = (s: ShiftDef) => {
    setEditId(s.id)
    setForm({
      name: s.name,
      shift_type: s.shift_type,
      work_start: s.work_start,
      work_end: s.work_end,
      break_minutes: s.break_minutes,
      is_overnight: s.is_overnight,
    })
    setShowAdd(true)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800">ตั้งค่ากะการทำงาน</h2>
          <p className="text-sm text-slate-500 mt-0.5">กำหนดรายการกะที่ใช้ในบริษัท</p>
        </div>
        <button
          onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: "", shift_type: "", work_start: "", work_end: "", break_minutes: 60, is_overnight: false }) }}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> เพิ่มกะ
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAdd && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800">{editId ? "แก้ไขกะ" : "เพิ่มกะใหม่"}</h3>
            <button onClick={() => { setShowAdd(false); setEditId(null) }} className="p-1 rounded-lg hover:bg-white">
              <X size={18} className="text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">ชื่อกะ</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="กะ 09:00-18:00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">เวลาเข้างาน</label>
              <input
                type="time"
                value={form.work_start}
                onChange={e => {
                  const newStart = e.target.value
                  setForm(f => ({
                    ...f,
                    work_start: newStart,
                    is_overnight: f.work_end && newStart ? f.work_end < newStart : f.is_overnight,
                  }))
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">เวลาเลิกงาน</label>
              <input
                type="time"
                value={form.work_end}
                onChange={e => {
                  const newEnd = e.target.value
                  setForm(f => ({
                    ...f,
                    work_end: newEnd,
                    // auto-detect overnight: ถ้าเวลาออก < เวลาเข้า → ข้ามคืน
                    is_overnight: f.work_start && newEnd ? newEnd < f.work_start : f.is_overnight,
                  }))
                }}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">พักเบรก (นาที)</label>
              <input
                type="number"
                value={form.break_minutes}
                onChange={e => setForm(f => ({ ...f, break_minutes: parseInt(e.target.value) || 60 }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.is_overnight}
                onChange={e => setForm(f => ({ ...f, is_overnight: e.target.checked }))}
                className="rounded border-slate-300 text-indigo-600"
              />
              กะข้ามคืน (Overnight)
            </label>
            <div className="flex-1" />
            <button
              onClick={handleSave}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors"
            >
              <Save size={15} /> บันทึก
            </button>
          </div>
        </div>
      )}

      {/* Shift List */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {shifts.map(s => {
          const color = getColor(s.work_start)
          return (
            <div key={s.id} className={`rounded-2xl border p-4 transition-all hover:shadow-md ${color}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/80 shadow-sm">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-[15px]">{s.name}</p>
                    <p className="text-sm opacity-75 mt-0.5">
                      {s.work_start?.substring(0, 5)} — {s.work_end?.substring(0, 5)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(s)}
                  className="p-2 rounded-lg bg-white/60 hover:bg-white transition-colors"
                >
                  <Edit2 size={14} />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2 text-xs opacity-70">
                <span>พัก {s.break_minutes} นาที</span>
                {s.is_overnight && <span className="rounded-full bg-white/60 px-2 py-0.5 font-bold">ข้ามคืน</span>}
              </div>
            </div>
          )
        })}

        {shifts.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400">
            <Clock size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">ยังไม่มีกะที่กำหนด</p>
            <p className="text-sm mt-1">กดปุ่ม "เพิ่มกะ" เพื่อเริ่มต้น</p>
          </div>
        )}
      </div>
    </div>
  )
}
