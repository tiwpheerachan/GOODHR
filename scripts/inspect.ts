import { createClient } from "@supabase/supabase-js"
const supa = createClient("https://kqlumdrkoopykmmylnhf.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40")

async function main() {
  for (const ds of ["asset_main", "live", "tel_user"]) {
    console.log(`\n═ ${ds} ═`)
    const { data } = await supa.from("feishu_asset_twoway").select("fields").eq("dataset", ds).limit(1)
    if (data?.[0]?.fields) {
      const f: any = data[0].fields
      for (const [k, v] of Object.entries(f)) {
        if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && (v[0] as any).name) {
          console.log(`  USER FIELD "${k}":`, JSON.stringify(v).slice(0, 200))
        }
      }
    }
  }
  console.log(`\n═ tel ═`)
  const { data: tel } = await supa.from("feishu_tel_records").select("fields").limit(1)
  if (tel?.[0]?.fields) {
    for (const [k, v] of Object.entries(tel[0].fields as any)) {
      if (Array.isArray(v) && v.length > 0 && typeof v[0] === "object" && (v[0] as any).name) {
        console.log(`  USER FIELD "${k}":`, JSON.stringify(v).slice(0, 200))
      }
    }
    console.log("  all keys:", Object.keys(tel[0].fields))
  }
}
main()
