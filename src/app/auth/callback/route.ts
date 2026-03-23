import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as any
  const next = searchParams.get("next") || "/"

  const supabase = createClient()

  if (code) {
    // ── PKCE flow (OAuth, magic link) ──
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    // ── Token hash flow (password recovery via generateLink) ──
    const { error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (error) {
      console.error("verifyOtp error:", error.message)
      // redirect to reset page anyway – it will show "ลิงก์หมดอายุ"
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
