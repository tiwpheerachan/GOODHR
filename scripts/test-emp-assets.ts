import { createClient } from "@supabase/supabase-js"
const supa = createClient("https://kqlumdrkoopykmmylnhf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40")

async function main() {
  // หา employee ที่มี email + feishu_user_id ผูกแล้ว
  const { data: emp } = await supa.from("employees")
    .select("id, employee_code, first_name_th, last_name_th, email, feishu_user_id")
    .not("email", "is", null).not("feishu_user_id", "is", null)
    .limit(3)
  console.log("Sample employees:")
  for (const e of emp || []) {
    console.log(`  ${e.employee_code} · ${e.first_name_th} ${e.last_name_th} · ${e.email} · feishu=${e.feishu_user_id?.slice(0, 12)}…`)
  }

  // ลอง match กับใครซักคน
  if (emp?.[0]?.email) {
    const email = emp[0].email.toLowerCase()
    console.log(`\nSearch assets where user email contains "${email}":`)

    const { data: assets } = await supa.from("feishu_asset_twoway")
      .select("dataset, feishu_record_id, fields")
      .eq("dataset", "asset_main")
    const matches = (assets || []).filter((r: any) => {
      const u = r.fields?.["ผู้ใช้ Feishu用户"]
      return Array.isArray(u) && u.some((x: any) => (x?.email || "").toLowerCase() === email)
    })
    console.log(`  asset_main matches: ${matches.length}`)
    for (const m of matches.slice(0, 2)) {
      const desc = (m.fields as any)["คำอธิบายสินทรัพย์物品描述 副本"]
      const sn = (m.fields as any)["S/N"]
      console.log(`    - ${desc} (SN: ${sn?.slice(0, 50)})`)
    }
  }
}
main()
