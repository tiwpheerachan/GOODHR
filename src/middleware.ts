import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

type CookieToSet = { name: string; value: string; options?: Partial<ResponseCookie> }

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
      .from("users").select("role").eq("id", user.id).maybeSingle()
    const role = u?.role

    if (pathname.startsWith("/admin") && !["super_admin", "hr_admin"].includes(role)) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
    if (pathname.startsWith("/manager") && !["super_admin", "hr_admin", "manager"].includes(role)) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
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