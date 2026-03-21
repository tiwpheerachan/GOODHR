import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// ── Helper: get user data ──
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

// ── Helper: check if table/column exists (prevents crashes on missing migration) ──
async function tableExists(supa: any, table: string): Promise<boolean> {
  const { error } = await supa.from(table).select("id").limit(0)
  return !error
}

// GET — flexible: supports mode=admin, mode=conversations, mode=employees, mode=online
export async function GET(req: NextRequest) {
  const userData = await getUser(req)
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  const empId = userData.employee_id
  const companyId = (userData.employee as any)?.company_id
  const mode = req.nextUrl.searchParams.get("mode") || ""
  const convId = req.nextUrl.searchParams.get("conversation_id")

  // ── Update online status (non-blocking, ignore errors) ──
  if (empId) {
    supa.from("employee_online_status").upsert({
      employee_id: empId, is_online: true, last_seen: new Date().toISOString()
    }, { onConflict: "employee_id" }).then(() => {})
  }

  // ══════════════════════════════════════════
  // MODE: employees — list employees for new chat
  // ══════════════════════════════════════════
  if (mode === "employees") {
    const { data: emps } = await supa.from("employees")
      .select("id, first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name)")
      .eq("company_id", companyId)
      .neq("id", empId)
      .order("first_name_th")
      .limit(200)

    // Get online statuses (ignore if table missing)
    const empIds = (emps ?? []).map((e: any) => e.id)
    let onlineMap: Record<string, { is_online: boolean; last_seen: string }> = {}
    if (empIds.length > 0) {
      const { data: statuses } = await supa.from("employee_online_status")
        .select("employee_id, is_online, last_seen")
        .in("employee_id", empIds)
      for (const s of (statuses ?? [])) {
        onlineMap[s.employee_id] = { is_online: s.is_online, last_seen: s.last_seen }
      }
    }

    return NextResponse.json({
      employees: (emps ?? []).map((e: any) => ({
        ...e, online: onlineMap[e.id] || { is_online: false, last_seen: null }
      }))
    })
  }

  // ══════════════════════════════════════════
  // MODE: online — get online users
  // ══════════════════════════════════════════
  if (mode === "online") {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { data } = await supa.from("employee_online_status")
      .select("employee_id, last_seen, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url)")
      .eq("is_online", true)
      .gte("last_seen", fiveMinAgo)
    return NextResponse.json({ online: data ?? [] })
  }

  // ══════════════════════════════════════════
  // MODE: admin — admin sees HR conversations
  // ══════════════════════════════════════════
  if (mode === "admin" && isAdmin) {
    if (convId) {
      const { data: conv } = await supa.from("chat_conversations")
        .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name))")
        .eq("id", convId).single()
      const { data: messages } = await supa.from("chat_messages")
        .select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)")
        .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200)
      await supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", convId).eq("sender_role", "user").eq("is_read", false)
      return NextResponse.json({ conversation: conv, messages: messages ?? [] })
    }

    // List all HR conversations — optimized: batch last messages
    const { data: convs } = await supa.from("chat_conversations")
      .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name))")
      .eq("company_id", companyId)
      .order("last_message_at", { ascending: false, nullsFirst: false }).limit(100)

    // Filter to HR-type (or legacy without type)
    const hrConvs = (convs ?? []).filter((c: any) => !c.type || c.type === "hr")
    const convIds = hrConvs.map((c: any) => c.id)

    // Batch: get unread counts + last messages
    let unreadMap: Record<string, number> = {}
    let lastMsgMap: Record<string, any> = {}
    if (convIds.length > 0) {
      const [{ data: ud }, { data: lm }] = await Promise.all([
        supa.from("chat_messages").select("conversation_id")
          .in("conversation_id", convIds).eq("sender_role", "user").eq("is_read", false),
        supa.from("chat_messages").select("conversation_id, message, images, sender_role, created_at")
          .in("conversation_id", convIds).order("created_at", { ascending: false })
      ])
      for (const u of (ud ?? [])) { unreadMap[u.conversation_id] = (unreadMap[u.conversation_id] || 0) + 1 }
      // Pick first message per conversation (already sorted desc)
      for (const m of (lm ?? [])) { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m }
    }

    const result = hrConvs.map((c: any) => ({
      ...c, last_message: lastMsgMap[c.id] || null, unread_count: unreadMap[c.id] || 0
    }))
    const totalUnread = Object.values(unreadMap).reduce((s: number, v: number) => s + v, 0)
    return NextResponse.json({ conversations: result, totalUnread })
  }

  // ══════════════════════════════════════════
  // MODE: conversations — user's all conversations (OPTIMIZED)
  // ══════════════════════════════════════════
  if (mode === "conversations") {
    const hasMembersTable = await tableExists(supa, "chat_members")

    // Get memberships (if V2 tables exist)
    let memberConvIds: string[] = []
    const memberMap: Record<string, any> = {}
    if (hasMembersTable) {
      const { data: memberships } = await supa.from("chat_members")
        .select("conversation_id, last_read_at, is_muted")
        .eq("employee_id", empId)
      for (const m of (memberships ?? [])) {
        memberConvIds.push(m.conversation_id)
        memberMap[m.conversation_id] = m
      }
    }

    // Get HR conversation (try with type filter, fallback to employee_id only)
    let hrConv: any = null
    const { data: hrConvTyped } = await supa.from("chat_conversations")
      .select("*").eq("employee_id", empId).eq("type", "hr").maybeSingle()
    if (hrConvTyped) {
      hrConv = hrConvTyped
    } else {
      // Fallback: legacy conversation without type column or type=null
      const { data: hrConvLegacy } = await supa.from("chat_conversations")
        .select("*").eq("employee_id", empId).order("created_at", { ascending: true }).limit(1).maybeSingle()
      if (hrConvLegacy) hrConv = hrConvLegacy
    }

    const allConvIds = Array.from(new Set([...memberConvIds, ...(hrConv ? [hrConv.id] : [])]))
    if (allConvIds.length === 0) {
      return NextResponse.json({ conversations: [], me: empId })
    }

    const { data: convs } = await supa.from("chat_conversations")
      .select("*").in("id", allConvIds).order("last_message_at", { ascending: false, nullsFirst: false })

    // BATCH: get last messages + unread counts in parallel (instead of N+1 per conversation)
    const [{ data: allLastMsgs }, { data: allUnreadMsgs }] = await Promise.all([
      supa.from("chat_messages")
        .select("conversation_id, message, images, sender_id, sender_role, created_at")
        .in("conversation_id", allConvIds)
        .order("created_at", { ascending: false }),
      supa.from("chat_messages")
        .select("conversation_id, sender_id, sender_role, is_read, created_at")
        .in("conversation_id", allConvIds)
        .eq("is_read", false)
    ])

    // Build maps
    const lastMsgMap: Record<string, any> = {}
    for (const m of (allLastMsgs ?? [])) { if (!lastMsgMap[m.conversation_id]) lastMsgMap[m.conversation_id] = m }
    const unreadMap: Record<string, number> = {}
    for (const m of (allUnreadMsgs ?? [])) {
      if (m.sender_id !== empId && m.sender_role !== "user") {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1
      }
    }
    // For HR convs, unread = admin msgs not read by user
    for (const m of (allUnreadMsgs ?? [])) {
      const c = (convs ?? []).find((cv: any) => cv.id === m.conversation_id)
      if (c && (!c.type || c.type === "hr") && m.sender_role !== "user") {
        // Already counted above
      } else if (m.sender_id !== empId) {
        // For non-HR, count msgs from others
        if (!unreadMap[m.conversation_id]) unreadMap[m.conversation_id] = 0
      }
    }

    // BATCH: get other users for direct chats + member counts for groups
    const directConvs = (convs ?? []).filter((c: any) => c.type === "direct")
    const groupConvs = (convs ?? []).filter((c: any) => c.type === "group" || c.type === "department")

    let otherUserMap: Record<string, any> = {}
    let memberCountMap: Record<string, number> = {}

    if (hasMembersTable && directConvs.length > 0) {
      // Get all members of direct chats, filter to non-self
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
        for (const p of (empProfiles ?? [])) { profileMap[p.id] = p }
        const onlineStatusMap: Record<string, any> = {}
        for (const s of (onlineStatuses ?? [])) { onlineStatusMap[s.employee_id] = s }

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
    }

    if (hasMembersTable && groupConvs.length > 0) {
      // Batch count members per group
      for (const gc of groupConvs) {
        const { count } = await supa.from("chat_members")
          .select("id", { count: "exact", head: true }).eq("conversation_id", gc.id)
        memberCountMap[gc.id] = count ?? 0
      }
    }

    const result = (convs ?? []).map((c: any) => ({
      ...c,
      type: c.type || "hr", // Ensure type always has a value
      last_message: lastMsgMap[c.id] || null,
      unread_count: unreadMap[c.id] || 0,
      other_user: otherUserMap[c.id] || null,
      member_count: memberCountMap[c.id] || 0,
      is_muted: memberMap[c.id]?.is_muted || false,
    }))

    return NextResponse.json({ conversations: result, me: empId })
  }

  // ══════════════════════════════════════════
  // MODE: get messages for a specific conversation
  // ══════════════════════════════════════════
  if (convId) {
    // Verify access: check membership OR legacy HR conv
    let hasAccess = isAdmin
    const hasMembersTable = await tableExists(supa, "chat_members")

    if (!hasAccess && hasMembersTable) {
      const { data: membership } = await supa.from("chat_members")
        .select("id").eq("conversation_id", convId).eq("employee_id", empId).maybeSingle()
      if (membership) hasAccess = true
    }
    if (!hasAccess) {
      // Check legacy HR conv (employee_id match)
      const { data: hrConv } = await supa.from("chat_conversations")
        .select("id").eq("id", convId).eq("employee_id", empId).maybeSingle()
      if (hrConv) hasAccess = true
    }

    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const [{ data: conv }, { data: messages }] = await Promise.all([
      supa.from("chat_conversations").select("*").eq("id", convId).single(),
      supa.from("chat_messages")
        .select("*, sender:employees!sender_id(id, first_name_th, last_name_th, nickname, avatar_url)")
        .eq("conversation_id", convId).order("created_at", { ascending: true }).limit(200),
    ])

    // Mark read (non-blocking)
    if (hasMembersTable) {
      supa.from("chat_members").update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", convId).eq("employee_id", empId).then(() => {})
    }
    if (conv?.employee_id === empId) {
      supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", convId).neq("sender_role", "user").eq("is_read", false).then(() => {})
    }

    // Enrich conversation with context data
    const convType = conv?.type || "hr"
    let otherUser = null
    let members: any[] = []

    if (hasMembersTable) {
      if (convType === "direct") {
        // Get the other person's info for direct chat header
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
      }

      if (convType === "group" || convType === "department" || convType === "direct") {
        const { data: m } = await supa.from("chat_members")
          .select("role, employee_id, employee:employees!employee_id(id, first_name_th, last_name_th, nickname, avatar_url)")
          .eq("conversation_id", convId)
        members = m ?? []
      }
    }

    return NextResponse.json({
      conversation: { ...conv, type: convType, other_user: otherUser, member_count: members.length },
      messages: messages ?? [],
      members,
      me: empId,
    })
  }

  // ══════════════════════════════════════════
  // DEFAULT: Legacy HR conversation (backward compat)
  // ══════════════════════════════════════════
  if (!empId) return NextResponse.json({ error: "No employee" }, { status: 400 })

  // Try finding HR conversation: first with type, then fallback to employee_id only
  let { data: conv } = await supa.from("chat_conversations")
    .select("*").eq("employee_id", empId).eq("type", "hr").maybeSingle()

  if (!conv) {
    // Fallback: find by employee_id (legacy, before type column existed)
    const { data: legacyConv } = await supa.from("chat_conversations")
      .select("*").eq("employee_id", empId).order("created_at", { ascending: true }).limit(1).maybeSingle()
    conv = legacyConv
  }

  if (!conv) {
    // Create new
    const emp = userData.employee as any
    const insertData: any = { employee_id: empId, company_id: emp?.company_id || null }
    // Only add type if column likely exists
    insertData.type = "hr"
    const { data: newConv, error } = await supa.from("chat_conversations")
      .insert(insertData).select("*").single()
    if (error) {
      // Retry without type column
      const { data: newConv2, error: err2 } = await supa.from("chat_conversations")
        .insert({ employee_id: empId, company_id: emp?.company_id || null })
        .select("*").single()
      if (err2) return NextResponse.json({ error: err2.message }, { status: 500 })
      conv = newConv2
    } else {
      conv = newConv
    }
  }

  const { data: messages } = await supa.from("chat_messages")
    .select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)")
    .eq("conversation_id", conv.id).order("created_at", { ascending: true }).limit(200)

  await supa.from("chat_messages").update({ is_read: true })
    .eq("conversation_id", conv.id).neq("sender_role", "user").eq("is_read", false)

  return NextResponse.json({
    conversation: { ...conv, type: conv.type || "hr" },
    messages: messages ?? [],
    me: empId,
  })
}

// POST — send, create_direct, create_group, mark_read, add_members, etc.
export async function POST(req: NextRequest) {
  const userData = await getUser(req)
  if (!userData) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const isAdmin = userData.role === "super_admin" || userData.role === "hr_admin"
  const empId = userData.employee_id
  const companyId = (userData.employee as any)?.company_id
  const body = await req.json()
  const { action } = body

  // ── Create direct chat ──
  if (action === "create_direct") {
    const { target_employee_id } = body
    if (!target_employee_id) return NextResponse.json({ error: "target required" }, { status: 400 })

    // Check if direct chat already exists between these two
    const { data: existing } = await supa.rpc("find_direct_chat", {
      emp1: empId, emp2: target_employee_id
    }).maybeSingle()

    if (existing) {
      return NextResponse.json({ conversation_id: (existing as any).conversation_id })
    }

    // Manual check: find conversations where both are members and type=direct
    const { data: myConvs } = await supa.from("chat_members")
      .select("conversation_id").eq("employee_id", empId)
    const { data: theirConvs } = await supa.from("chat_members")
      .select("conversation_id").eq("employee_id", target_employee_id)

    const myIds = new Set((myConvs ?? []).map((c: any) => c.conversation_id))
    const common = (theirConvs ?? []).filter((c: any) => myIds.has(c.conversation_id)).map((c: any) => c.conversation_id)

    if (common.length > 0) {
      const { data: directConv } = await supa.from("chat_conversations")
        .select("id").in("id", common).eq("type", "direct").maybeSingle()
      if (directConv) return NextResponse.json({ conversation_id: directConv.id })
    }

    // Create new direct conversation
    const { data: newConv, error } = await supa.from("chat_conversations").insert({
      type: "direct", company_id: companyId, created_by: empId,
    }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supa.from("chat_members").insert([
      { conversation_id: newConv.id, employee_id: empId, role: "member" },
      { conversation_id: newConv.id, employee_id: target_employee_id, role: "member" },
    ])

    return NextResponse.json({ conversation_id: newConv.id })
  }

  // ── Create group chat ──
  if (action === "create_group") {
    const { name, member_ids, avatar_url } = body
    if (!name || !member_ids?.length) return NextResponse.json({ error: "name and members required" }, { status: 400 })

    const { data: newConv, error } = await supa.from("chat_conversations").insert({
      type: "group", name, avatar_url: avatar_url || null,
      company_id: companyId, created_by: empId,
    }).select("id").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const membersToInsert = [
      { conversation_id: newConv.id, employee_id: empId, role: "admin" },
      ...member_ids.filter((id: string) => id !== empId).map((id: string) => ({
        conversation_id: newConv.id, employee_id: id, role: "member",
      }))
    ]
    await supa.from("chat_members").insert(membersToInsert)

    return NextResponse.json({ conversation_id: newConv.id })
  }

  // ── Add members to group ──
  if (action === "add_members") {
    const { conversation_id, member_ids } = body
    const membersToInsert = member_ids.map((id: string) => ({
      conversation_id, employee_id: id, role: "member",
    }))
    await supa.from("chat_members").insert(membersToInsert).select()
    return NextResponse.json({ success: true })
  }

  // ── Update group name/avatar ──
  if (action === "update_group") {
    const { conversation_id, name, avatar_url } = body
    const updates: any = {}
    if (name !== undefined) updates.name = name
    if (avatar_url !== undefined) updates.avatar_url = avatar_url
    updates.updated_at = new Date().toISOString()
    await supa.from("chat_conversations").update(updates).eq("id", conversation_id)
    return NextResponse.json({ success: true })
  }

  // ── Remove member from group ──
  if (action === "remove_member") {
    const { conversation_id, member_id } = body
    // Verify requester is admin of the group
    const { data: reqMember } = await supa.from("chat_members")
      .select("role").eq("conversation_id", conversation_id).eq("employee_id", empId).maybeSingle()
    if (!reqMember || (reqMember.role !== "admin" && !isAdmin)) {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 })
    }
    await supa.from("chat_members").delete()
      .eq("conversation_id", conversation_id).eq("employee_id", member_id)
    return NextResponse.json({ success: true })
  }

  // ── Leave group ──
  if (action === "leave_group") {
    await supa.from("chat_members").delete()
      .eq("conversation_id", body.conversation_id).eq("employee_id", empId)
    return NextResponse.json({ success: true })
  }

  // ── Delete message (own message or admin) ──
  if (action === "delete_message") {
    const { message_id } = body
    // Verify ownership or admin
    const { data: msg } = await supa.from("chat_messages")
      .select("id, sender_id").eq("id", message_id).single()
    if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 })
    if (msg.sender_id !== empId && !isAdmin) {
      return NextResponse.json({ error: "Can only delete own messages" }, { status: 403 })
    }
    await supa.from("chat_messages").delete().eq("id", message_id)
    return NextResponse.json({ success: true })
  }

  // ── Delete conversation (creator/admin only) ──
  if (action === "delete_conversation") {
    const { conversation_id } = body
    const { data: conv } = await supa.from("chat_conversations")
      .select("id, type, created_by, employee_id").eq("id", conversation_id).single()
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 })

    // Allow: admin, conversation creator, or HR conv owner
    const canDelete = isAdmin || conv.created_by === empId || conv.employee_id === empId
    if (!canDelete) {
      // Also check if user is group admin
      const { data: mem } = await supa.from("chat_members")
        .select("role").eq("conversation_id", conversation_id).eq("employee_id", empId).maybeSingle()
      if (!mem || mem.role !== "admin") {
        return NextResponse.json({ error: "Not allowed" }, { status: 403 })
      }
    }

    // Delete messages first, then members, then conversation
    await supa.from("chat_messages").delete().eq("conversation_id", conversation_id)
    await supa.from("chat_members").delete().eq("conversation_id", conversation_id)
    await supa.from("chat_conversations").delete().eq("id", conversation_id)
    return NextResponse.json({ success: true })
  }

  // ── Send message ──
  if (action === "send") {
    const { conversation_id, message, images, reply_to_id } = body
    if (!message && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Message or images required" }, { status: 400 })
    }

    // Verify access: admin OR member OR legacy HR conv owner
    let hasAccess = isAdmin
    if (!hasAccess) {
      const { data: mem } = await supa.from("chat_members")
        .select("id").eq("conversation_id", conversation_id).eq("employee_id", empId).maybeSingle()
      if (mem) hasAccess = true
    }
    if (!hasAccess) {
      const { data: hrConv } = await supa.from("chat_conversations")
        .select("id").eq("id", conversation_id).eq("employee_id", empId).maybeSingle()
      if (hrConv) hasAccess = true
    }
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const { data: msg, error } = await supa.from("chat_messages").insert({
      conversation_id, sender_id: empId,
      sender_role: isAdmin ? userData.role : "user",
      message: message || null, images: images || [],
      reply_to_id: reply_to_id || null,
    }).select("*, sender:employees!sender_id(id, first_name_th, last_name_th, nickname, avatar_url)").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await supa.from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "open" })
      .eq("id", conversation_id)

    // Update sender's last_read_at (ignore error if no membership)
    supa.from("chat_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id).eq("employee_id", empId)
      .then(() => {})

    return NextResponse.json({ success: true, message: msg })
  }

  // ── Mark read ──
  if (action === "mark_read") {
    const { conversation_id } = body
    supa.from("chat_members")
      .update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversation_id).eq("employee_id", empId)
      .then(() => {})

    if (isAdmin) {
      await supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", conversation_id).eq("sender_role", "user").eq("is_read", false)
    } else {
      await supa.from("chat_messages").update({ is_read: true })
        .eq("conversation_id", conversation_id).neq("sender_role", "user").eq("is_read", false)
    }
    return NextResponse.json({ success: true })
  }

  // ── Update online status ──
  if (action === "heartbeat") {
    await supa.from("employee_online_status").upsert({
      employee_id: empId, is_online: true, last_seen: new Date().toISOString()
    }, { onConflict: "employee_id" })
    return NextResponse.json({ success: true })
  }

  // ── Go offline ──
  if (action === "offline") {
    await supa.from("employee_online_status")
      .update({ is_online: false, last_seen: new Date().toISOString() })
      .eq("employee_id", empId)
    return NextResponse.json({ success: true })
  }

  // ── Close (admin) ──
  if (action === "close" && isAdmin) {
    await supa.from("chat_conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", body.conversation_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
