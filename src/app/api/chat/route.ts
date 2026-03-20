import { NextRequest, NextResponse } from "next/server"
import { createServiceClient, createClient } from "@/lib/supabase/server"

// GET — list conversations (admin) or get my conversation + messages (user)
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id, employee:employees(company_id)")
    .eq("id", user.id).single()

  const isAdmin = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const mode = req.nextUrl.searchParams.get("mode")
  const convId = req.nextUrl.searchParams.get("conversation_id")

  // ── Admin: list all conversations ──
  if (mode === "admin" && isAdmin) {
    if (convId) {
      // Get single conversation messages
      const { data: conv } = await supa.from("chat_conversations")
        .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name))")
        .eq("id", convId).single()

      const { data: messages } = await supa.from("chat_messages")
        .select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)")
        .eq("conversation_id", convId)
        .order("created_at", { ascending: true })
        .limit(200)

      // Mark unread messages as read (for admin)
      await supa.from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", convId)
        .eq("sender_role", "user")
        .eq("is_read", false)

      return NextResponse.json({ conversation: conv, messages: messages ?? [] })
    }

    // List all conversations with last message + unread count
    const { data: convs } = await supa.from("chat_conversations")
      .select("*, employee:employees!employee_id(first_name_th, last_name_th, nickname, avatar_url, employee_code, department:departments(name))")
      .order("last_message_at", { ascending: false })
      .limit(100)

    // Get unread counts per conversation
    const convIds = (convs ?? []).map((c: any) => c.id)
    let unreadMap: Record<string, number> = {}
    if (convIds.length > 0) {
      const { data: unreadData } = await supa.from("chat_messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .eq("sender_role", "user")
        .eq("is_read", false)
      for (const u of (unreadData ?? [])) {
        unreadMap[u.conversation_id] = (unreadMap[u.conversation_id] || 0) + 1
      }
    }

    // Get last message for each conversation
    const result = await Promise.all((convs ?? []).map(async (c: any) => {
      const { data: lastMsg } = await supa.from("chat_messages")
        .select("message, images, sender_role, created_at")
        .eq("conversation_id", c.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      return { ...c, last_message: lastMsg, unread_count: unreadMap[c.id] || 0 }
    }))

    const totalUnread = Object.values(unreadMap).reduce((s: number, v: number) => s + v, 0)
    return NextResponse.json({ conversations: result, totalUnread })
  }

  // ── User: get my conversation + messages ──
  if (!userData?.employee_id) return NextResponse.json({ error: "No employee" }, { status: 400 })

  // Find or create conversation
  let { data: conv } = await supa.from("chat_conversations")
    .select("*")
    .eq("employee_id", userData.employee_id)
    .maybeSingle()

  if (!conv) {
    const emp = userData.employee as any
    const { data: newConv, error } = await supa.from("chat_conversations").insert({
      employee_id: userData.employee_id,
      company_id: emp?.company_id || null,
    }).select("*").single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    conv = newConv
  }

  // Get messages
  const { data: messages } = await supa.from("chat_messages")
    .select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)")
    .eq("conversation_id", conv.id)
    .order("created_at", { ascending: true })
    .limit(200)

  // Mark HR messages as read
  await supa.from("chat_messages")
    .update({ is_read: true })
    .eq("conversation_id", conv.id)
    .neq("sender_role", "user")
    .eq("is_read", false)

  // Count unread from HR
  const { data: unreadData } = await supa.from("chat_messages")
    .select("id")
    .eq("conversation_id", conv.id)
    .neq("sender_role", "user")
    .eq("is_read", false)

  return NextResponse.json({
    conversation: conv,
    messages: messages ?? [],
    unreadCount: unreadData?.length ?? 0,
  })
}

// POST — send message / mark read
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()
  const { data: userData } = await supa.from("users")
    .select("role, employee_id").eq("id", user.id).single()

  const isAdmin = userData?.role === "super_admin" || userData?.role === "hr_admin"
  const body = await req.json()
  const { action } = body

  // ── Send message ──
  if (action === "send") {
    const { conversation_id, message, images } = body
    if (!message && (!images || images.length === 0)) {
      return NextResponse.json({ error: "Message or images required" }, { status: 400 })
    }

    // Verify access
    if (!isAdmin) {
      const { data: conv } = await supa.from("chat_conversations")
        .select("employee_id").eq("id", conversation_id).single()
      if (conv?.employee_id !== userData?.employee_id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const { data: msg, error } = await supa.from("chat_messages").insert({
      conversation_id,
      sender_id: userData?.employee_id,
      sender_role: isAdmin ? userData?.role : "user",
      message: message || null,
      images: images || [],
    }).select("*, sender:employees!sender_id(first_name_th, last_name_th, nickname, avatar_url)").single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update conversation last_message_at
    await supa.from("chat_conversations")
      .update({ last_message_at: new Date().toISOString(), status: "open" })
      .eq("id", conversation_id)

    return NextResponse.json({ success: true, message: msg })
  }

  // ── Mark read ──
  if (action === "mark_read") {
    const { conversation_id } = body
    if (isAdmin) {
      await supa.from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversation_id)
        .eq("sender_role", "user")
        .eq("is_read", false)
    } else {
      await supa.from("chat_messages")
        .update({ is_read: true })
        .eq("conversation_id", conversation_id)
        .neq("sender_role", "user")
        .eq("is_read", false)
    }
    return NextResponse.json({ success: true })
  }

  // ── Close conversation (admin) ──
  if (action === "close" && isAdmin) {
    await supa.from("chat_conversations")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", body.conversation_id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 })
}
