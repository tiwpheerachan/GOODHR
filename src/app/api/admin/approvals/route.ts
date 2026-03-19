import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// GET — ดึงคำร้องทุกประเภทรวม
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const url = req.nextUrl.searchParams
  const companyId = url.get("company_id") // "all" or UUID
  const status = url.get("status") // pending | approved | rejected | cancelled | cancel_requested | all
  const type = url.get("type") // leave | adjustment | overtime | all
  const dateFrom = url.get("date_from")
  const dateTo = url.get("date_to")
  const search = url.get("search")

  const empSelect = `employee:employees!employee_id(id,employee_code,first_name_th,last_name_th,nickname,avatar_url,department:departments(name),position:positions(name),company:companies(code))`

  const results: any[] = []

  // Helper: build company + date + status filters
  const applyFilters = (q: any, dateCol: string, statusVal: string | null) => {
    if (companyId && companyId !== "all") q = q.eq("company_id", companyId)
    if (statusVal === "cancel_requested") {
      q = q.eq("status", "approved").like("review_note", "%CANCEL_REQ%")
    } else if (statusVal && statusVal !== "all") {
      q = q.eq("status", statusVal)
    }
    if (dateFrom) q = q.gte(dateCol, dateFrom)
    if (dateTo) q = q.lte(dateCol, dateTo)
    if (search) {
      q = q.or(`first_name_th.ilike.%${search}%,last_name_th.ilike.%${search}%,employee_code.ilike.%${search}%`, { referencedTable: "employees" })
    }
    return q
  }

  const shouldFetch = (t: string) => !type || type === "all" || type === t

  // ── Leave requests ──
  if (shouldFetch("leave")) {
    let q = supa.from("leave_requests")
      .select(`id,employee_id,company_id,leave_type_id,start_date,end_date,total_days,is_half_day,half_day_period,reason,status,requested_at,reviewed_at,review_note,created_at,${empSelect},leave_type:leave_types(id,name,color_hex)`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "start_date", status)
    const { data } = await q
    for (const r of (data || [])) {
      results.push({
        ...r, request_type: "leave",
        date_label: r.start_date === r.end_date ? r.start_date : `${r.start_date} → ${r.end_date}`,
        detail: `${(r as any).leave_type?.name || "ลา"} ${r.total_days} วัน`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // ── Time adjustment requests ──
  if (shouldFetch("adjustment")) {
    let q = supa.from("time_adjustment_requests")
      .select(`id,employee_id,company_id,work_date,requested_clock_in,requested_clock_out,reason,status,reviewed_at,review_note,created_at,${empSelect}`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data } = await q
    for (const r of (data || [])) {
      const cin = r.requested_clock_in ? new Date(r.requested_clock_in).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      const cout = r.requested_clock_out ? new Date(r.requested_clock_out).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      results.push({
        ...r, request_type: "adjustment",
        date_label: r.work_date,
        detail: `เข้า ${cin} · ออก ${cout}`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // ── Overtime requests ──
  if (shouldFetch("overtime")) {
    let q = supa.from("overtime_requests")
      .select(`id,employee_id,company_id,work_date,ot_start,ot_end,reason,status,reviewed_at,review_note,created_at,${empSelect}`)
      .order("created_at", { ascending: false }).limit(200)
    q = applyFilters(q, "work_date", status)
    const { data } = await q
    for (const r of (data || [])) {
      const s = r.ot_start ? new Date(r.ot_start).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      const e = r.ot_end ? new Date(r.ot_end).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) : "-"
      results.push({
        ...r, request_type: "overtime",
        date_label: r.work_date,
        detail: `OT ${s} - ${e}`,
        is_cancel_requested: r.status === "approved" && (r.review_note || "").includes("CANCEL_REQ"),
      })
    }
  }

  // Sort all by created_at desc
  results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Counts
  const counts: Record<string, number> = { all: results.length }
  for (const r of results) {
    const st = r.is_cancel_requested ? "cancel_requested" : r.status
    counts[st] = (counts[st] || 0) + 1
  }

  return NextResponse.json({ requests: results, counts })
}

// POST — อนุมัติ/ปฏิเสธ/ยกเลิก
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { action, request_id, request_type, note } = await req.json()

  const TABLES: Record<string, string> = {
    leave: "leave_requests",
    adjustment: "time_adjustment_requests",
    overtime: "overtime_requests",
  }

  const table = TABLES[request_type]
  if (!table) return NextResponse.json({ error: "Invalid request_type" }, { status: 400 })

  // Get current user's employee_id
  const { data: userData } = await supa.from("users")
    .select("employee_id").eq("id", user.id).single()

  if (action === "approve") {
    // Special handling for time_adjustment via correction API
    if (request_type === "adjustment") {
      const res = await fetch(new URL("/api/correction", req.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: req.headers.get("Cookie") || "" },
        body: JSON.stringify({ action: "approve", request_id, review_note: note }),
      })
      return NextResponse.json(await res.json())
    }

    const { error } = await supa.from(table).update({
      status: "approved",
      reviewed_by: userData?.employee_id || null,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update leave balance if leave
    if (request_type === "leave") {
      const { data: lr } = await supa.from("leave_requests").select("employee_id,leave_type_id,total_days").eq("id", request_id).single()
      if (lr) {
        const { data: bal } = await supa.from("leave_balances")
          .select("id,used_days,pending_days")
          .eq("employee_id", lr.employee_id).eq("leave_type_id", lr.leave_type_id).single()
        if (bal) {
          await supa.from("leave_balances").update({
            used_days: (bal.used_days || 0) + lr.total_days,
            pending_days: Math.max(0, (bal.pending_days || 0) - lr.total_days),
          }).eq("id", bal.id)
        }
      }
    }

    return NextResponse.json({ success: true })
  }

  if (action === "reject") {
    if (request_type === "adjustment") {
      const res = await fetch(new URL("/api/correction", req.url).toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: req.headers.get("Cookie") || "" },
        body: JSON.stringify({ action: "reject", request_id, review_note: note }),
      })
      return NextResponse.json(await res.json())
    }

    const { error } = await supa.from(table).update({
      status: "rejected",
      reviewed_by: userData?.employee_id || null,
      reviewed_at: new Date().toISOString(),
      review_note: note || null,
    }).eq("id", request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  // Cancel actions — delegate to cancel API
  if (action === "approve_cancel" || action === "reject_cancel" || action === "force_cancel") {
    const res = await fetch(new URL("/api/requests/cancel", req.url).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: req.headers.get("Cookie") || "" },
      body: JSON.stringify({ action, request_id, request_type, reason: note }),
    })
    return NextResponse.json(await res.json())
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
