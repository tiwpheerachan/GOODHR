import { createClient } from "@supabase/supabase-js"

const supa = createClient(
  "https://kqlumdrkoopykmmylnhf.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40",
)

await supa.from("feishu_asset_twoway").update({
  edit: { note: " UPC3 - SHD NB00005", is_correct: true, damage_level: "ใช้งานปกติ完好", maint_status: "ไม่มีการซ่อมแซม 无需维修", damage_detail: "-" },
  updated_by: "hrms",
  updated_at: new Date().toISOString(),
}).eq("dataset","asset_main").eq("feishu_record_id","recuxcM3fb4xwI")

console.log("✓ คืนค่าเดิมแล้ว — รอ 5 นาทีจะ sync ไป Feishu")
