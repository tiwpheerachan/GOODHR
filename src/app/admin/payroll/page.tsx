"use client"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/useAuth"
import { createClient } from "@/lib/supabase/client"
import { Download, Play, CheckCircle, Loader2 } from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"

export default function PayrollPage() {
  const { user } = useAuth()
  const supabase = createClient()
  const [periods, setPeriods] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [calculating, setCalculating] = useState(false)
  const now = new Date()

  useEffect(() => {
    if (!user?.employee?.company_id) return
    supabase
      .from("payroll_periods")
      .select("*")
      .eq("company_id", user.employee.company_id)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .then(({ data }) => {
        setPeriods(data ?? [])
        if (data?.[0]) setSelected(data[0])
      })
  }, [user])

  useEffect(() => {
    if (!selected) return
    supabase
      .from("payroll_records")
      .select(
        "*, employee:employees(id,employee_code,first_name_th,last_name_th,position:positions(name),department:departments(name))"
      )
      .eq("payroll_period_id", selected.id)
      .order("created_at")
      .then(({ data }) => setRecords(data ?? []))
  }, [selected])

  const createPeriod = async () => {
    if (!user?.employee?.company_id) return
    const y = now.getFullYear()
    const m = now.getMonth() + 1
    const { data, error } = await supabase
      .from("payroll_periods")
      .insert({
        company_id: user.employee.company_id,
        year: y,
        month: m,
        period_name: format(now, "MMMM yyyy", { locale: th }),
        start_date: format(new Date(y, m - 1, 1), "yyyy-MM-dd"),
        end_date: format(new Date(y, m, 0), "yyyy-MM-dd"),
        pay_date: format(new Date(y, m, 5), "yyyy-MM-dd"),
        status: "draft",
        created_by: user.employee_id,
      })
      .select()
      .single()

    if (error) {
      toast.error("มีงวดนี้แล้วหรือเกิดข้อผิดพลาด")
      return
    }
    toast.success("สร้างงวดสำเร็จ")
    setSelected(data)
    setPeriods((p) => [data, ...p])
  }

  const calculateAll = async () => {
    if (!selected || !user?.employee?.company_id) return
    setCalculating(true)
    const { data: emps } = await supabase
      .from("employees")
      .select("id")
      .eq("company_id", user.employee.company_id)
      .eq("is_active", true)
      .is("deleted_at", null)

    if (!emps) {
      setCalculating(false)
      return
    }

    for (const emp of emps) {
      await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: emp.id,
          payroll_period_id: selected.id,
        }),
      })
    }

    toast.success(`คำนวณเงินเดือน ${emps.length} คน สำเร็จ`)

    const { data } = await supabase
      .from("payroll_records")
      .select(
        "*, employee:employees(id,employee_code,first_name_th,last_name_th,position:positions(name),department:departments(name))"
      )
      .eq("payroll_period_id", selected.id)
    setRecords(data ?? [])
    setCalculating(false)
  }

  const approvePeriod = async () => {
    if (!selected) return
    await supabase
      .from("payroll_periods")
      .update({
        status: "paid",
        approved_by: user?.employee_id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", selected.id)
    toast.success("อนุมัติจ่ายเงินเดือนแล้ว")
    setSelected((p: any) => ({ ...p, status: "paid" }))
  }

  const exportCSV = () => {
    const hdr = [
      "รหัส", "ชื่อ", "นามสกุล", "ตำแหน่ง",
      "เงินเดือนฐาน", "รวมรายรับ", "หัก SSO",
      "หักภาษี", "หักทั้งหมด", "รับสุทธิ",
    ]
    const rows = records.map((r) => [
      r.employee?.employee_code,
      r.employee?.first_name_th,
      r.employee?.last_name_th,
      r.employee?.position?.name,
      r.base_salary,
      r.gross_income || 0,
      r.social_security_amount || 0,
      r.monthly_tax_withheld || 0,
      r.total_deductions || 0,
      r.net_salary || 0,
    ])

    const csv = [hdr, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `payroll_${selected?.period_name ?? "export"}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalNet = records.reduce((s, r) => s + (r.net_salary || 0), 0)
  const totalGross = records.reduce((s, r) => s + (r.gross_income || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">เงินเดือน</h2>
          <p className="text-slate-500 text-sm">คำนวณและจัดการเงินเดือน</p>
        </div>
        <button onClick={createPeriod} className="btn-primary py-2 px-4 text-sm">
          + สร้างงวดใหม่
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Period list */}
        <div className="lg:col-span-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-3">งวดเงินเดือน</h3>
          <div className="space-y-2">
            {periods.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelected(p)}
                className={
                  "w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors " +
                  (selected?.id === p.id
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-50")
                }
              >
                <p>{p.period_name}</p>
                <p
                  className={
                    "text-xs " +
                    (p.status === "paid" ? "text-green-500" : "text-slate-400")
                  }
                >
                  {p.status === "draft"
                    ? "ฉบับร่าง"
                    : p.status === "paid"
                    ? "จ่ายแล้ว"
                    : "อนุมัติแล้ว"}
                </p>
              </button>
            ))}
            {periods.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">
                ยังไม่มีงวดเดือน
              </p>
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-3 space-y-4">
          {selected && (
            <>
              {/* Header */}
              <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-800">{selected.period_name}</p>
                  <p className="text-sm text-slate-500">
                    จ่ายวันที่{" "}
                    {format(new Date(selected.pay_date), "d MMM yyyy", { locale: th })}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {selected.status === "draft" && (
                    <button
                      onClick={calculateAll}
                      disabled={calculating}
                      className="btn-primary py-2 px-4 text-sm flex items-center gap-2"
                    >
                      {calculating ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Play size={14} />
                      )}
                      คำนวณ
                    </button>
                  )}
                  {records.length > 0 && selected.status !== "paid" && (
                    <button
                      onClick={approvePeriod}
                      className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                    >
                      <CheckCircle size={14} /> อนุมัติจ่าย
                    </button>
                  )}
                  {records.length > 0 && (
                    <button
                      onClick={exportCSV}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50"
                    >
                      <Download size={14} /> Export
                    </button>
                  )}
                </div>
              </div>

              {/* Stats */}
              {records.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { l: "พนักงาน", v: records.length + " คน", c: "text-primary-600 bg-primary-50" },
                    { l: "รวมรายรับ", v: "฿" + totalGross.toLocaleString(), c: "text-green-600 bg-green-50" },
                    { l: "รวมรับสุทธิ", v: "฿" + totalNet.toLocaleString(), c: "text-blue-600 bg-blue-50" },
                  ].map((s) => (
                    <div key={s.l} className={s.c.split(" ")[1] + " rounded-2xl p-3 text-center"}>
                      <p className={"text-lg font-bold " + s.c.split(" ")[0]}>{s.v}</p>
                      <p className="text-xs text-slate-500">{s.l}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        {["พนักงาน", "เงินเดือน", "รวมรายรับ", "SSO", "ภาษี", "หักทั้งหมด", "รับสุทธิ"].map(
                          (h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap"
                            >
                              {h}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {records.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                            กดปุ่มคำนวณเพื่อสร้างข้อมูลเงินเดือน
                          </td>
                        </tr>
                      ) : (
                        records.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3">
                              <p className="font-medium text-slate-800">
                                {r.employee?.first_name_th} {r.employee?.last_name_th}
                              </p>
                              <p className="text-xs text-slate-400">
                                {r.employee?.employee_code}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {r.base_salary?.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {r.gross_income?.toLocaleString() ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {r.social_security_amount?.toLocaleString() ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {r.monthly_tax_withheld?.toLocaleString() ?? "-"}
                            </td>
                            <td className="px-4 py-3 text-red-600">
                              {r.total_deductions?.toLocaleString() ?? "-"}
                            </td>
                            <td className="px-4 py-3 font-bold text-primary-700">
                              {r.net_salary?.toLocaleString() ?? "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}