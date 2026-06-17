import { createClient } from "@supabase/supabase-js"
const supa = createClient("https://kqlumdrkoopykmmylnhf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40")

async function main() {
  // หา feishu_users ที่ email_work ตรงกับใน asset_main + ผูก goodhr_employee_id
  const { data: fu } = await supa.from("feishu_users")
    .select("name, email, email_work, email_business, goodhr_employee_id")
    .ilike("email_work", "%@shd-technology.co.th")
    .not("goodhr_employee_id", "is", null)
    .limit(20)
  console.log(`พบ feishu_users ที่ผูกแล้ว + มี email_work: ${fu?.length || 0}`)
  if (fu && fu.length > 0) {
    console.log("ตัวอย่าง:")
    for (const f of fu.slice(0, 5)) {
      console.log(`  - ${f.name} · ${f.email_work}`)
    }

    // ลอง match กับ asset_main
    const { data: assets } = await supa.from("feishu_asset_twoway")
      .select("dataset, fields").eq("dataset", "asset_main")
    const fuEmails = new Set(fu.map(f => f.email_work?.toLowerCase()).filter(Boolean))
    let foundCount = 0
    const matchedFu = new Map<string, number>()
    for (const a of assets || []) {
      const u = (a.fields as any)?.["ผู้ใช้ Feishu用户"]
      if (Array.isArray(u)) {
        for (const x of u) {
          const em = (x?.email || "").toLowerCase()
          if (em && fuEmails.has(em)) {
            matchedFu.set(em, (matchedFu.get(em) || 0) + 1)
            foundCount++
            break
          }
        }
      }
    }
    console.log(`\nมี ${matchedFu.size} feishu_users ที่ match asset → รวม ${foundCount} รายการ`)
    for (const [em, cnt] of [...matchedFu.entries()].slice(0, 5)) {
      const f = fu.find(x => x.email_work?.toLowerCase() === em)
      // หา employee
      const { data: emp } = await supa.from("employees")
        .select("first_name_th, last_name_th, employee_code, id").eq("id", f?.goodhr_employee_id).single()
      console.log(`  ${cnt} รายการ → ${f?.name} (${em}) → emp: ${emp?.employee_code} ${emp?.first_name_th} ${emp?.last_name_th} [id: ${emp?.id}]`)
    }
  }
}
main()
