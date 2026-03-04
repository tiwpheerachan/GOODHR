import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies"

type CookieToSet = { name: string; value: string; options?: Partial<ResponseCookie> }

export async function middleware(request: NextRequest) {
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
  const { pathname } = request.nextUrl

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return res
  }

  if (!user && pathname !== "/") {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (user && pathname.startsWith("/admin")) {
    const { data: u } = await supabase
      .from("users").select("role").eq("id", user.id).maybeSingle()
    if (!u || !["super_admin", "hr_admin"].includes(u.role)) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
  }

  if (user && pathname.startsWith("/manager")) {
    const { data: u } = await supabase
      .from("users").select("role").eq("id", user.id).maybeSingle()
    if (!u || !["super_admin", "hr_admin", "manager"].includes(u.role)) {
      return NextResponse.redirect(new URL("/app/dashboard", request.url))
    }
  }

  return res
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}