import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function HomePage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return redirect("/login")

  const { data: userData } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  // ถ้ายังไม่มี user record -> ไป login
  if (!userData) return redirect("/login")

  if (["super_admin", "hr_admin"].includes(userData.role)) {
    return redirect("/admin/dashboard")
  }
  if (userData.role === "manager") {
    return redirect("/manager/dashboard")
  }
  return redirect("/app/dashboard")
}
