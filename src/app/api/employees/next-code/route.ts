import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// GET — สร้างรหัสพนักงานถัดไปอัตโนมัติ
// รูปแบบ: {ปี พ.ศ. 2 หลัก}{running 4 หลัก} เช่น 690001, 690002
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supa = createServiceClient()

  const companyId = req.nextUrl.searchParams.get("company_id")
  if (!companyId) return NextResponse.json({ error: "company_id required" }, { status: 400 })

  // ดึงปี พ.ศ. 2 หลักท้าย
  const buddhistYear = new Date().getFullYear() + 543
  const yearPrefix = String(buddhistYear).slice(-2) // เช่น "69" สำหรับ พ.ศ. 2569

  // ดึงรหัสพนักงานทั้งหมดของบริษัทที่ขึ้นต้นด้วยปีนี้
  const { data: employees } = await supa
    .from("employees")
    .select("employee_code")
    .eq("company_id", companyId)
    .like("employee_code", `${yearPrefix}%`)

  let maxNum = 0
  if (employees) {
    for (const e of employees) {
      const code = e.employee_code || ""
      // ตัดเอาเฉพาะตัวเลขหลังปี
      const numPart = code.replace(yearPrefix, "")
      const num = parseInt(numPart, 10)
      if (!isNaN(num) && num > maxNum) maxNum = num
    }
  }

  const nextNum = maxNum + 1
  const nextCode = `${yearPrefix}${String(nextNum).padStart(4, "0")}`

  // ตรวจซ้ำอีกรอบ (กันพลาด)
  const { data: exists } = await supa
    .from("employees")
    .select("id")
    .eq("company_id", companyId)
    .eq("employee_code", nextCode)
    .maybeSingle()

  if (exists) {
    // ถ้าซ้ำ ลอง +1 ไปเรื่อยๆ
    for (let i = nextNum + 1; i < nextNum + 100; i++) {
      const tryCode = `${yearPrefix}${String(i).padStart(4, "0")}`
      const { data: dup } = await supa
        .from("employees")
        .select("id")
        .eq("company_id", companyId)
        .eq("employee_code", tryCode)
        .maybeSingle()
      if (!dup) {
        return NextResponse.json({ code: tryCode })
      }
    }
    return NextResponse.json({ error: "ไม่สามารถสร้างรหัสอัตโนมัติได้" }, { status: 500 })
  }

  return NextResponse.json({ code: nextCode })
}
