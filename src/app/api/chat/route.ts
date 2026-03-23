import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// ── Cache: tableExists result (won't change during runtime) ──
let _tableExistsCache: Record<string, boolean> = {}

async function tableExists(supa: any, table: string): Promise<boolean> {
  if (_tableExistsCache[table] !== undefined) return _tableExistsCache[table]
  const { error } = await supa.from(table).select("id").limit(0)
  _tableExistsCache[table] = !error
  return !error
}

// ── Helper: get user data with minimal queries ──
async function getUser(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const supa = createServiceClient()
  const { data } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", user.id).single()
  return data ? { ...data, authId: user.id } : null
}

// ── JSON response with cache headers ──
function jsonRes(data: any, maxAge = 0) {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (maxAge > 0) headers["Cache-Control"] = `private, max-age=${maxAge}`
  else headers["Cache-Control"] = "no-store"
  return new NextResponse(JSON.stringify(data), { headers })
}

// GET — flexible chat API
export async function GET(req: NextRequest) {
  const userData = await getUser(req)
  if (!userData) return jsonRes({ error: "Unauthorized" }, 0)

  const supa = createServiceClient()
  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  const empId = userData.employee_id
  const companyId = (userData.employee as any)?.company_id
  const sp = req.nextUrl.searchParams
  const mode = sp.get("mode") || ""
  const convId = sp.get("conversation_id")
  const since = sp.get("since") // ISO timestamp for delta polling

  // ── Online status: moved to dedicated heartbeat action (POST) ──
  // Removed per-GET upsert to reduce DB writes by ~90%

  // ══════════════════════════════════════════
  // MODE: poll — lightweight delta check (returns only counts + timestamps, no full data)
  // Used by frontend for frequent checks without heavy payload
  // ══════════════════════════════════════════
  if (mode === "poll" && convId) {
    const [{ count: totalCount }, { count: newCount }] = await Promise.all([
      supa.from("chat_messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convId),
      since
        ? supa.from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("conversation_id", convId)
            .gt("created_at", since)
        : Promise.resolve({ count: 0 }),
    ])
    return jsonRes({ total: totalCount ?? 0, new_since: newCount ?? 0, ts: new Date().toISOString() })
  }

  // ══════════════════════════════════════════
  // MODE: employees — list employees for new chat
  // ══════════════════════════════════════════
  if (mode === "employees") {
    const [{ data: emps }, { data: statuses }] = await Promise.all([
      supa.from("employees")
        .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name)")
        .eq("company_id", companyId)
        .neq("id", empId)
        .order("first_name_th")
        .limit(200),
      supa.from("employee_online_status")
        .select("employee_id, is_online, last_seen")
        .eq("is_online", true)
    ])

    const onlineMap: Record<string, any> = {}
    for (const s of (statuses ?? [])) onlineMap[s.employee_id] = { is_online: s.is_online, last_seen: s.last_seen }

    return jsonRes({
      employees: (emps ?? []).map((e: any) => ({
        ...e, online: onlineMap[e.id] || { is_online: false, last_seen: null }
      }))
    }, 10) // Cache 10s — employee list doesn't change often
  }

  // ══════════════════════════════════════════
  // MODE: online — get online users
  // ══════════════════════════════════════════
  if (mode === "online") {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data } = await supa.from("employee_online_status")
      .select("employee_id, last_seen, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url)")
      .eq("is_online", true).gte("last_seen", fiveMinAgo)
    return jsonRes({ online: data ?? [] })
  }

  // ══════════════════════════════════════════
  // MODE: admin
  // ══════════════════════════════════════════
  if (mode === "admin" && isAdmin) {
    if (convId) {
      const [{ data: conv }, { data: messages }] = await Promise.all([
        supa.from("chat_conversations")
          .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name))")
          .eq("id", convId).single(),
        supa.from("chat_messages")
          .select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)")
          .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200)
      ])
      // Mark read (fire-and-forget)
      supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", convId).eq("sender_role", "user").eq("is_read", false).then(() => {})
      return jsonRes({ conversation: conv, messages: messages ?? [] })
    }

    const { data: convs } = await supa.from("chat_conversations")
      .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name))")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(100)

    const hrConvs = (convs ?? []).filter((c: any) => !c.type || c.type === "hr")
    const convIds = hrConvs.map((c: any) => c.id)

    let unreadMap: Record<string, number> = {}
    let lastMsgMap: Record<string, any> = {}
    if (convIds.length > 0) {
      const [{ data: ud }, { data: lm }] = await Promise.all([
        supa.from("chat_messages").select("conversation_id")
          .in("conversation_id", convIds).eq("sender_role", "user").eq("is_read", false),
        supa.from("chat_messages").select("conversation_id, message, images, sender_role, created_at")
          .in("conversation_id", convIds).order("created_at", { ascending: false })
      ])
      for (const u of (ud ?? [])) unreadMap[u.conversation_id] = (unreadMap[u.conversation_id] || 0) + 1
      for (const m of (lm ?? [])) { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m }
    }

    const result = hrConvs.map((c: any) => ({
      ...c, last_message: lastMsgMap[c.id] || null, unread_count: unreadMap[c.id] || 0
    }))
    const totalUnread = Object.values(unreadMap).reduce((s: number, v: number) => s + v, 0)
    return jsonRes({ conversations: result, totalUnread })
  }

  // ══════════════════════════════════════════
  // MODE: conversations — user's all conversations (FULLY PARALLEL)
  // ══════════════════════════════════════════
  if (mode === "conversations") {
    const hasMembersTable = await tableExists(supa, "chat_members")

    // Phase 1: Get memberships + HR conv in PARALLEL
    const [membershipsResult, hrConvTypedResult] = await Promise.all([
      hasMembersTable
        ? supa.from("chat_members").select("conversation_id, last_read_at, is_muted").eq("employee_id", empId)
        : Promise.resolve({ data: null }),
      supa.from("chat_conversations").select("*").eq("employee_id", empId).eq("type", "hr").maybeSingle()
    ])

    let memberConvIds: string[] = []
    const memberMap: Record<string, any> = {}
    for (const m of (membershipsResult.data ?? [])) {
      memberConvIds.push(m.conversation_id)
      memberMap[m.conversation_id] = m
    }

    let hrConv = hrConvTypedResult.data
    if (!hrConv) {
      const { data: hrConvLegacy } = await supa.from("chat_conversations")
        .select("*").eq("employee_id", empId).order("created_at", { ascending: true }).limit(1).maybeSingle()
      if (hrConvLegacy) hrConv = hrConvLegacy
    }

    const allConvIds = Array.from(new Set([...memberConvIds, ...(hrConv ? [hrConv.id] : [])]))
    if (allConvIds.length === 0) {
      return jsonRes({ conversations: [], me: empId })
    }

    // Phase 2: All conversation data in ONE parallel batch
    const [convsResult, lastMsgsResult, unreadMsgsResult] = await Promise.all([
      supa.from("chat_conversations").select("*")
        .in("id", allConvIds).order("last_message_at", { ascending: false, nullsFirst: false }),
      supa.from("chat_messages")
        .select("conversation_id, message, images, sender_id, sender_role, created_at")
        .in("conversation_id", allConvIds)
        .order("created_at", { ascending: false })
        .limit(allConvIds.length * 2), // Only need ~1 per conv, fetch 2x for safety
      supa.from("chat_messages")
        .select("conversation_id, sender_id, sender_role")
        .in("conversation_id", allConvIds)
        .eq("is_read", false)
    ])

    const convs = convsResult.data ?? []
    const lastMsgMap: Record<string, any> = {}
    for (const m of (lastMsgsResult.data ?? [])) { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m }

    const unreadMap: Record<string, number> = {}
    for (const m of (unreadMsgsResult.data ?? [])) {
      if (m.sender_id === empId) continue // Skip own messages
      const c = convs.find((cv: any) => cv.id === m.conversation_id)
      const ct = c?.type || "hr"
      const isUnread = ct === "hr" ? m.sender_role !== "user" : true
      if (isUnread) unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1
    }

    // Phase 3: Enrich direct + group conversations in PARALLEL
    const directConvs = convs.filter((c: any) => c.type === "direct")
    const groupConvs = convs.filter((c: any) => c.type === "group" || c.type === "department")

    let otherUserMap: Record<string, any> = {}
    let memberCountMap: Record<string, number> = {}

    const enrichPromises: Promise<void>[] = []

    if (hasMembersTable && directConvs.length > 0) {
      enrichPromises.push((async () => {
        const { data: directMembers } = await supa.from("chat_members")
          .select("conversation_id, employee_id")
          .in("conversation_id", directConvs.map((c: any) => c.id))
          .neq("employee_id", empId)

        const otherEmpIds = Array.from(new Set((directMembers ?? []).map((m: any) => m.employee_id)))
        if (otherEmpIds.length > 0) {
          const [{ data: empProfiles }, { data: onlineStatuses }] = await Promise.all([
            supa.from("employees")
              .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code")
              .in("id", otherEmpIds),
            supa.from("employee_online_status")
              .select("employee_id, is_online, last_seen")
              .in("employee_id", otherEmpIds)
          ])
          const profileMap: Record<string, any> = {}
          for (const p of (empProfiles ?? [])) profileMap[p.id] = p
          const onlineStatusMap: Record<string, any> = {}
          for (const s of (onlineStatuses ?? [])) onlineStatusMap[s.employee_id] = s

          for (const dm of (directMembers ?? [])) {
            const profile = profileMap[dm.employee_id]
            if (profile) {
              otherUserMap[dm.conversation_id] = {
                ...profile,
                online: onlineStatusMap[dm.employee_id] || { is_online: false, last_seen: null }
              }
            }
          }
        }
      })())
    }

    if (hasMembersTable && groupConvs.length > 0) {
      // Single batch: get ALL members for all groups, then count per group
      enrichPromises.push((async () => {
        const { data: allGroupMembers } = await supa.from("chat_members")
          .select("conversation_id")
          .in("conversation_id", groupConvs.map((c: any) => c.id))
        for (const gm of (allGroupMembers ?? [])) {
          memberCountMap[gm.conversation_id] = (memberCountMap[gm.conversation_id] || 0) + 1
        }
      })())
    }

    await Promise.all(enrichPromises)

    const result = convs.map((c: any) => ({
      ...c,
      type: c.type || "hr",
      last_message: lastMsgMap[c.id] || null,
      unread_count: unreadMap[c.id] || 0,
      other_user: otherUserMap[c.id] || null,
      member_count: memberCountMap[c.id] || 0,
      is_muted: memberMap[c.id]?.is_muted || false,
    }))

    // Lightweight hash for change detection — client can skip re-render if same
    const hashParts = result.map((c: any) =>
      `${c.id}:${c.last_message?.created_at || ""}:${c.unread_count}`
    ).join("|")
    // Simple numeric hash
    let hash = 0
    for (let i = 0; i < hashParts.length; i++) {
      hash = ((hash << 5) - hash + hashParts.charCodeAt(i)) | 0
    }

    return jsonRes({ conversations: result, me: empId, hash: hash.toString(36) })
  }

  // ══════════════════════════════════════════
  // MODE: get messages for a specific conversation
  // ══════════════════════════════════════════
  if (convId) {
    const hasMembersTable = await tableExists(supa, "chat_members")

    // Access check — run both checks in parallel
    let hasAccess = isAdmin
    if (!hasAccess) {
      const [memberCheck, hrCheck] = await Promise.all([
        hasMembersTable
          ? supa.from("chat_members").select("id").eq("conversation_id", convId).eq("employee_id", empId).maybeSingle()
          : Promise.resolve({ data: null }),
        supa.from("chat_conversations").select("id").eq("id", convId).eq("employee_id", empId).maybeSingle()
      ])
      if (memberCheck.data || hrCheck.data) hasAccess = true
    }
    if (!hasAccess) return jsonRes({ error: "Access denied" })

    // Delta mode: if `since` provided, only return new messages + delete detection
    if (since) {
      // Run BOTH queries in parallel (was sequential before)
      const [{ data: newMessages }, { count: totalCount }] = await Promise.all([
        supa.from("chat_messages")
          .select("*, sender:employees!sender_id(id, first_name_th, last_name_th, nickname, avatar_url)")
          .eq("conversation_id", convId)
          .gt("created_at", since)
          .order("created_at", { ascending: true })
          .limit(100),
        // Use COUNT instead of fetching all IDs — O(1) vs O(n)
        supa.from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", convId),
      ])

      // Fire-and-forget mark read
      if (hasMembersTable) {
        supa.from("chat_members").update({ last_read_at: new Date().toISOString() })
          .eq("conversation_id", convId).eq("employee_id", empId).then(() => {})
      }

      return jsonRes({
        new_messages: newMessages ?? [],
        total_count: totalCount ?? 0,
        ts: new Date().toISOString(),
      })
    }

    // Full load: conversation + messages + members in parallel
    const [convResult, messagesResult] = await Promise.all([
      supa.from("chat_conversations").select("*").eq("id", convId).single(),
      supa.from("chat_messages")
        .select("*, sender:employees!sender_id(id, first_name_th, last_name_th, nickname, avatar_url)")
        .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200),
    ])
    const conv = convResult.data
    const messages = messagesResult.data ?? []

    // Mark read (fire-and-forget)
    if (hasMembersTable) {
      supa.from("chat_members").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", convId).eq("employee_id", empId).then(() => {})
    }
    if (conv?.employee_id === empId) {
      supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", convId).neq("sender_role", "user").eq("is_read", false).then(() => {})
    }

    // Enrich conversation
    const convType = conv?.type || "hr"
    let otherUser = null
    let members: any[] = []
    let pinnedMessage = null

    // Run all enrichment in parallel
    const enrichTasks: Promise<void>[] = []

    if (hasMembersTable && convType === "direct") {
      enrichTasks.push((async () => {
        const { data: memberRows } = await supa.from("chat_members")
          .select("employee_id").eq("conversation_id", convId).neq("employee_id", empId).limit(1)
        const otherEmpId = memberRows?.[0]?.employee_id
        if (otherEmpId) {
          const [{ data: empData }, { data: os }] = await Promise.all([
            supa.from("employees")
              .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name)")
              .eq("id", otherEmpId).single(),
            supa.from("employee_online_status")
              .select("is_online, last_seen").eq("employee_id", otherEmpId).maybeSingle()
          ])
          if (empData) otherUser = { ...empData, online: os || { is_online: false, last_seen: null } }
        }
      })())
    }

    if (hasMembersTable && (convType === "group" || convType === "department" || convType === "direct")) {
      enrichTasks.push((async () => {
        const { data: m } = await supa.from("chat_members")
          .select("role, employee_id, employee:employees!employee_id(id, first_name_th, last_name_th, nickname, avatar_url)")
          .eq("conversation_id", convId)
        members = m ?? []
      })())
    }

    if (conv?.pinned_message_id) {
      enrichTasks.push((async () => {
        const { data: pm } = await supa.from("chat_messages")
          .select("id, message, images, created_at, sender_id, sender:employees!sender_id(first_name_th, nickname)")
          .eq("id", conv.pinned_message_id).maybeSingle()
        pinnedMessage = pm
      })())
    }

    await Promise.all(enrichTasks)

    return jsonRes({
      conversation: { ...conv, type: convType, other_user: otherUser, member_count: members.length, pinned_message: pinnedMessage },
      messages,
      members,
      me: empId,
      ts: new Date().toISOString(),
    })
  }

  // ══════════════════════════════════════════
  // DEFAULT: Legacy HR conversation
  // ══════════════════════════════════════════
  if (!empId) return jsonRes({ error: "No employee" })

  let { data: conv } = await supa.from("chat_conversations")
    .select("*").eq("employee_id", empId).eq("type", "hr").maybeSingle()

  if (!conv) {
    const { data: legacyConv } = await supa.from("chat_conversations")
      .select("*").eq("employee_id", empId).order("created_at", { ascending: true }).limit(1).maybeSingle()
    conv = legacyConv
  }

  if (!conv) {
    const emp = userData.employee as any
    const insertData: any = { employee_id: empId, company_id: emp?.company_id || null, type: "hr" }
    const { data: newConv, error } = await supa.from("chat_conversations")
      .insert(insertData).select("*").single()
    if (error) {
      const { data: newConv2, error: err2 } = await supa.from("chat_conversations")
        .insert({ employee_id: empId, company_id: emp?.company_id || null }).select("*").single()
      if (err2) return jsonRes({ error: err2.message })
      conv = newConv2
    } else {
      conv = newConv
    }
  }

  const { data: messages } = await supa.from("chat_messages")
    .select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)")
    .eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(200)

  supa.from("chat_messages").update({ is_read: true })
    .eq("conversation_id", conv.id).neq("sender_role", "user").eq("is_read", false).then(() => {})

  return jsonRes({
    conversation: { ...conv, type: conv.type || "hr" },
    messages: messages ?? [],
    me: empId,
    ts: new Date().toISOString(),
  })
}

// POST — send, create_direct, create_group, mark_read, add_members, etc.
export async function POST(req: NextRequest) {
  const userData = await getUser(req)
  if (!userData) return jsonRes({ error: "Unauthorized" })

  const supa = createServiceClient()
  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  const empId = userData.employee_id
  const companyId = (userData.employee as any)?.company_id
  const body = await req.json()
  const { action } = body

  // ── Create direct chat ──
  if (action === "create_direct") {
    const { target_employee_id } = body
    if (!target_employee_id) return jsonRes({ error: "target required" })

    // Check existing: run both checks in parallel
    const [rpcResult, myConvsResult, theirConvsResult] = await Promise.all([
      supa.rpc("find_direct_chat", { emp1: empId, emp2: target_employee_id }).maybeSingle(),
      supa.from("chat_members").select("conversation_id").eq("employee_id", empId),
      supa.from("chat_members").select("conversation_id").eq("employee_id", target_employee_id),
    ])

    if (rpcResult.data) return jsonRes({ conversation_id: (rpcResult.data as any).conversation_id })

    const myIds = new Set((myConvsResult.data ?? []).map((c: any) => c.conversation_id))
    const common = (theirConvsResult.data ?? []).filter((c: any) => myIds.has(c.conversation_id)).map((c: any) => c.conversation_id)

    if (common.length > 0) {
      const { data: directConv } = await supa.from("chat_conversations")
        .select("id").in("id", common).eq("type", "direct").maybeSingle()
      if (directConv) return jsonRes({ conversation_id: directConv.id })
    }

    const { data: newConv, error } = await supa.from("chat_conversations").insert({
      type: "direct", company_id: companyId, created_by: empId,
    }).select("id").single()
    if (error) return jsonRes({ error: error.message })

    await supa.from("chat_members").insert([
      { conversation_id: newConv.id, employee_id: empId, role: "member" },
      { conversation_id: newConv.id, employee_id: target_employee_id, role: "member" },
    ])

    return jsonRes({ conversation_id: newConv.id })
  }

  // ── Create group chat ──
  if (action === "create_group") {
    const { name, member_ids, avatar_url } = body
    if (!name || !member_ids?.length) return jsonRes({ error: "name and members required" })

    const { data: newConv, error } = await supa.from("chat_conversations").insert({
      type: "group", name, avatar_url: avatar_url || null,
      company_id: companyId, created_by: empId,
    }).select("id").single()
    if (error) return jsonRes({ error: error.message })

    const membersToInsert = [
      { conversation_id: newConv.id, employee_id: empId, role: "admin" },
      ...member_ids.filter((id: string) => id !== empId).map((id: string) => ({
        conversation_id: newConv.id, employee_id: id, role: "member",
      }))
    ]
    await supa.from("chat_members").insert(membersToInsert)

    return jsonRes({ conversation_id: newConv.id })
  }

  // ── Add members to group ──
  if (action === "add_members") {
    const { conversation_id, member_ids } = body
    await supa.from("chat_members").insert(
      member_ids.map((id: string) => ({ conversation_id, employee_id: id, role: "member" }))
    ).select()
    return jsonRes({ success: true })
  }

  // ── Update group name/avatar ──
  if (action === "update_group") {
    const { conversation_id, name, avatar_url } = body
    const updates: any = { updated_at: new Date().toISOString() }
    if (name !== undefined) updates.name = name
    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    await supa.from("chat_conversations").update(updates).eq("id", conversation_id)
    return jsonRes({ success: true })
  }

  // ── Remove member from group ──
  if (action === "remove_member") {
    const { conversation_id, member_id } = body
    const { data: reqMember } = await supa.from("chat_members")
      .select("role").eq("conversation_id", conversation_id).eq("employee_id", empId).maybeSingle()
    if (!reqMember || (reqMember.role !== "admin" && !isAdmin))
      return jsonRes({ error: "Only admins can remove members" })
    await supa.from("chat_members").delete()
      .eq("conversation_id", conversation_id).eq("employee_id", member_id)
    return jsonRes({ success: true })
  }

  // ── Leave group ──
  if (action === "leave_group") {
    await supa.from("chat_members").delete()
      .eq("conversation_id", body.conversation_id).eq("employee_id", empId)
    return jsonRes({ success: true })
  }

  // ── Delete message ──
  if (action === "delete_message") {
    const { message_id } = body
    const { data: msg } = await supa.from("chat_messages")
      .select("id, sender_id").eq("id", message_id).single()
    if (!msg) return jsonRes({ error: "Message not found" })
    if (msg.sender_id !== empId && !isAdmin)
      return jsonRes({ error: "Can only delete own messages" })
    await supa.from("chat_messages").delete().eq("id", message_id)
    return jsonRes({ success: true })
  }

  // ── Delete conversation ──
  if (action === "delete_conversation") {
    const { conversation_id } = body
    const { data: conv } = await supa.from("chat_conversations")
      .select("id, type, created_by, employee_id").eq("id", conversation_id).single()
    if (!conv) return jsonRes({ error: "Not found" })

    let canDelete = isAdmin || conv.created_by === empId || conv.employee_id === empId
    if (!canDelete) {
      const { data: mem } = await supa.from("chat_members")
        .select("role").eq("conversation_id", conversation_id).eq("employee_id", empId).maybeSingle()
      if (!mem || mem.role !== "admin") return jsonRes({ error: "Not allowed" })
    }

    // Cascade delete in parallel where safe
    await supa.from("chat_messages").delete().eq("conversation_id", conversation_id)
    await Promise.all([
      supa.from("chat_members").delete().eq("conversation_id", conversation_id),
      supa.from("chat_conversations").delete().eq("id", conversation_id),
    ])
    return jsonRes({ success: true })
  }

  // ── Send message ──
  if (action === "send") {
    const { conversation_id, message, images, reply_to_id } = body
    if (!message && (!images || images.length === 0))
      return jsonRes({ error: "Message or images required" })

    // Quick access check: try member first, fallback to HR conv
    let hasAccess = isAdmin
    if (!hasAccess) {
      const [{ data: mem }, { data: hrConv }] = await Promise.all([
        supa.from("chat_members").select("id").eq("conversation_id", conversation_id).eq("employee_id", empId).maybeSingle(),
        supa.from("chat_conversations").select("id").eq("id", conversation_id).eq("employee_id", empId).maybeSingle()
      ])
      if (mem || hrConv) hasAccess = true
    }
    if (!hasAccess) return jsonRes({ error: "Access denied" })

    const { data: msg, error } = await supa.from("chat_messages").insert({
      conversation_id, sender_id: empId,
      sender_role: isAdmin ? userData.role : "user",
      message: message || null, images: images || [],
      reply_to_id: reply_to_id || null,
    }).select("*, sender:employees!sender_id(id, first_name_th, last_name_th, nickname, avatar_url)").single()

    if (error) return jsonRes({ error: error.message })

    // Update conversation timestamp + sender's read marker (fire-and-forget)
    Promise.all([
      supa.from("chat_conversations")
        .update({ last_message_at: new Date().toISOString(), status: "open" })
        .eq("id", conversation_id),
      supa.from("chat_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", conversation_id).eq("employee_id", empId)
    ]).catch(() => {})

    return jsonRes({ success: true, message: msg })
  }

  // ── Mark read ──
  if (action === "mark_read") {
    const { conversation_id } = body
    await supa.from("chat_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id).eq("employee_id", empId)
    if (isAdmin) {
      await supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", conversation_id).eq("sender_role", "user").eq("is_read", false)
    } else {
      await supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", conversation_id).neq("sender_role", "user").eq("is_read", false)
    }
    return jsonRes({ success: true })
  }

  // ── Heartbeat ──
  if (action === "heartbeat") {
    await supa.from("employee_online_status").upsert({
      employee_id: empId, is_online: true, last_seen: new Date().toISOString()
    }, { onConflict: "employee_id" })
    return jsonRes({ success: true })
  }

  // ── Go offline ──
  if (action === "offline") {
    await supa.from("employee_online_status")
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq("employee_id", empId)
    return jsonRes({ success: true })
  }

  // ── Pin message ──
  if (action === "pin_message") {
    const { conversation_id, message_id } = body
    if (!conversation_id || !message_id) return jsonRes({ error: "conversation_id and message_id required" })
    const { data: msg } = await supa.from("chat_messages")
      .select("id, message, images, created_at, sender_id, sender:employees!sender_id(first_name_th, nickname)")
      .eq("id", message_id).eq("conversation_id", conversation_id).single()
    if (!msg) return jsonRes({ error: "Message not found" })
    await supa.from("chat_conversations")
      .update({ pinned_message_id: message_id, updated_at: new Date().toISOString() })
      .eq("id", conversation_id)
    return jsonRes({ success: true, pinned: msg })
  }

  // ── Unpin message ──
  if (action === "unpin_message") {
    await supa.from("chat_conversations")
      .update({ pinned_message_id: null, updated_at: new Date().toISOString() })
      .eq("id", body.conversation_id)
    return jsonRes({ success: true })
  }

  // ── Close (admin) ──
  if (action === "close" && isAdmin) {
    await supa.from("chat_conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", body.conversation_id)
    return jsonRes({ success: true })
  }

  return jsonRes({ error: "Unknown action" })
}
