import { createServerClient } from "@supabase/ssr"
import { createClient as createSupabaseSb } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

type CookieToSet = { name: string; value: string; options?: Partial<ResponseCookie> }

// ── helper: ตรวจว่า employee เป็นผู้ประเมิน (additional evaluator / KPI evaluator / direct manager)
//    ใช้ service role bypass RLS — middleware ต้องการดึงข้อมูลของผู้ใช้คนอื่นด้วย
async function hasEvaluatorRole(employeeId: string): Promise<boolean> {
  if (!employeeId) return false
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return false
  try {
    const supa = createSupabaseSb(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey,
      { auth: { persistSession: false, autoRefreshToken: false } },
    )
    // 1) additional evaluator
    const ev = await supa.from("employee_evaluators")
      .select("id", { count: "exact", head: true })
      .eq("evaluator_id", employeeId)
    if ((ev.count ?? 0) > 0) return true
    // 2) designated KPI evaluator
    try {
      const kpi = await supa.from("employees")
        .select("id", { count: "exact", head: true })
        .eq("kpi_evaluator_id", employeeId)
        .eq("is_active", true)
      if ((kpi.count ?? 0) > 0) return true
    } catch {}
    // 3) direct manager (ลูกน้องโดยตรง active)
    const mh = await supa.from("employee_manager_history")
      .select("id", { count: "exact", head: true })
      .eq("manager_id", employeeId)
      .is("effective_to", null)
    if ((mh.count ?? 0) > 0) return true
  } catch {}
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Skip public routes FIRST (ไม่ต้องเรียก getUser) ──
  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next({ request })
  }

  let res = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          res = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  // ── Role check: query DB เพียงครั้งเดียว สำหรับทุก protected route ──
  const needsRole = pathname.startsWith("/admin") || pathname.startsWith("/manager") || pathname.startsWith("/equipment")
  if (user && needsRole) {
    const { data: u } = await supabase
      .from("users").select("role, employee_id").eq("id", user.id).maybeSingle()
    const role = u?.role
    const empId = u?.employee_id as string | undefined

    if (pathname.startsWith("/admin") && !["super_admin", "hr_admin"].includes(role)) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (pathname.startsWith("/manager") && !["super_admin", "hr_admin", "manager"].includes(role)) {
      // employee ที่ได้รับสิทธิ์ประเมิน (additional / KPI / direct manager) → อนุญาต
      const allow = empId ? await hasEvaluatorRole(empId) : false
      if (!allow) return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (pathname.startsWith("/equipment") && !["super_admin", "hr_admin", "equipment_admin"].includes(role)) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}