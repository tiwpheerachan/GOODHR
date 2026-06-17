import { createClient } from "@supabase/supabase-js"
const supa = createClient("https://kqlumdrkoopykmmylnhf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40")

async function main() {
  // 1. ดูว่าใน asset_main email อะไรใช้บ่อย
  const { data: assets } = await supa.from("feishu_asset_twoway")
    .select("fields").eq("dataset", "asset_main").limit(50)
  const emails = new Set<string>()
  for (const a of assets || []) {
    const u = (a.fields as any)?.["ผู้ใช้ Feishu用户"]
    if (Array.isArray(u)) {
      for (const x of u) if (x?.email) emails.add(x.email.toLowerCase())
    }
  }
  console.log("Sample emails ใน asset_main (10 ตัว):")
  ;[...emails].slice(0, 10).forEach(e => console.log("  -", e))

  // 2. ใน feishu_users มี email_work ที่ตรงไหม
  const { data: fu } = await supa.from("feishu_users")
    .select("name, email, email_work, email_business, goodhr_employee_id")
    .ilike("email_work", "upc03%").limit(3)
  console.log("\nfeishu_users ที่มี email_work=upc03...:")
  for (const f of fu || []) {
    console.log("  -", f.name, "| email:", f.email, "| email_work:", f.email_work, "| linked:", f.goodhr_employee_id ? "✓" : "✗")
  }

  // 3. ถ้า linked, employee คนไหน
  const linkedFu = fu?.find(f => f.goodhr_employee_id)
  if (linkedFu) {
    const { data: emp } = await supa.from("employees")
      .select("first_name_th, last_name_th, email, employee_code").eq("id", linkedFu.goodhr_employee_id).single()
    console.log("\n  → ผูกกับ:", emp?.employee_code, emp?.first_name_th, emp?.last_name_th, "| email:", emp?.email)
    
    // ลองค้นด้วย email_work ของ feishu_user
    const { data: matchedAssets } = await supa.from("feishu_asset_twoway")
      .select("dataset, fields").eq("dataset", "asset_main")
    const matches = (matchedAssets || []).filter((r: any) => {
      const u = r.fields?.["ผู้ใช้ Feishu用户"]
      return Array.isArray(u) && u.some((x: any) => 
        (x?.email || "").toLowerCase() === linkedFu.email_work?.toLowerCase()
      )
    })
    console.log(`\n  → match with email_work "${linkedFu.email_work}": ${matches.length} assets`)
    for (const m of matches.slice(0, 3)) {
      const desc = (m.fields as any)["คำอธิบายสินทรัพย์物品描述 副本"]
      console.log(`    - ${desc}`)
    }
  }
}
main()
