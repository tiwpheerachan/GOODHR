/**
 * ทดสอบ Two-way sync — เขียนค่าไปที่ Supabase → รอ sync → ตรวจว่ามาถึง Feishu จริงไหม
 */
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = "https://kqlumdrkoopykmmylnhf.supabase.co"
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40"
const SYNC_SECRET  = "99wTMViSV5eqZ8McjDB86s6JmVZi2IVC"

const supa = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log("═".repeat(60))
  console.log("Step A) Check ตาราง feishu_asset_twoway มีจริงไหม + Sample row")
  console.log("═".repeat(60))

  // ดึง 1 row จาก asset_main เพื่อ test
  const { data: samples, error: e1 } = await supa.from("feishu_asset_twoway")
    .select("feishu_record_id, dataset, edit, files, updated_by, updated_at, fields")
    .eq("dataset", "asset_main")
    .limit(1)
  if (e1) { console.error("❌ ตารางไม่มี:", e1.message); return }
  if (!samples || samples.length === 0) { console.error("❌ ตารางว่าง"); return }
  const target = samples[0]
  console.log("✓ ใช้ record:", target.feishu_record_id)
  console.log("  - dataset:", target.dataset)
  console.log("  - edit เดิม:", JSON.stringify(target.edit))
  console.log("  - updated_by เดิม:", target.updated_by)
  console.log("  - updated_at เดิม:", target.updated_at)

  console.log()
  console.log("═".repeat(60))
  console.log("Step B) เขียน edit + updated_by='hrms' ผ่าน service role")
  console.log("═".repeat(60))

  const testNote = `🧪 GoodHR test ${new Date().toISOString()}`
  const newEdit = {
    ...(target.edit ?? {}),
    note: testNote,
    maint_status: "ทดสอบจาก GoodHR",
  }
  const { data: updated, error: e2 } = await supa.from("feishu_asset_twoway")
    .update({
      edit: newEdit,
      updated_by: "hrms",
      updated_at: new Date().toISOString(),
    })
    .eq("dataset", "asset_main")
    .eq("feishu_record_id", target.feishu_record_id)
    .select("feishu_record_id, edit, updated_by, updated_at")
    .single()
  if (e2) { console.error("❌ UPDATE ล้มเหลว:", e2.message); return }
  console.log("✓ UPDATE สำเร็จ")
  console.log("  - new edit:", JSON.stringify(updated.edit))
  console.log("  - updated_by:", updated.updated_by)
  console.log("  - updated_at:", updated.updated_at)

  console.log()
  console.log("═".repeat(60))
  console.log("Step C) Trigger cron/pull → ดูว่าระบบ push ไป Feishu ไหม")
  console.log("═".repeat(60))

  const res = await fetch(`https://hrms-sync-feishu.vercel.app/api/cron/pull?dataset=asset_main`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SYNC_SECRET}` },
  })
  if (!res.ok) { console.error("❌ Cron pull failed:", res.status); return }
  const cronResult = await res.json()
  console.log("✓ Cron pull responded:")
  console.log("  - upserted:", cronResult.results[0]?.upserted)
  console.log("  - pulled (Feishu→DB):", cronResult.results[0]?.pulled)
  console.log("  - pushed (DB→Feishu):", cronResult.results[0]?.pushed)
  console.log("  - conflicts:", cronResult.results[0]?.conflicts)
  console.log("  - filesUploaded:", cronResult.results[0]?.filesUploaded)

  console.log()
  console.log("═".repeat(60))
  console.log("Step D) ตรวจ DB หลัง sync — edit ของเรายังอยู่ไหม?")
  console.log("═".repeat(60))

  const { data: after } = await supa.from("feishu_asset_twoway")
    .select("feishu_record_id, edit, updated_by, updated_at")
    .eq("dataset", "asset_main")
    .eq("feishu_record_id", target.feishu_record_id)
    .single()
  console.log("✓ หลัง sync:")
  console.log("  - edit:", JSON.stringify(after?.edit))
  console.log("  - updated_by:", after?.updated_by)
  console.log("  - updated_at:", after?.updated_at)

  console.log()
  console.log("═".repeat(60))
  console.log("📊 สรุป")
  console.log("═".repeat(60))
  const ourNote = (after?.edit as any)?.note
  if (ourNote === testNote) {
    console.log("✅ DB ยังเก็บ edit ของเรา (note=test) ไว้")
  } else {
    console.log(`⚠️  DB note ไม่ตรง — ของเรา="${testNote}" · DB="${ourNote}"`)
  }
  if (cronResult.results[0]?.pushed > 0) {
    console.log(`✅ ระบบ push ${cronResult.results[0].pushed} แถวขึ้น Feishu สำเร็จ`)
  } else if (cronResult.results[0]?.pushed === 0) {
    console.log(`⚠️  pushed=0 — อาจะรอ next sync window 5 นาที หรือไม่ใช่รอบที่ push`)
  }
  console.log("→ เปิด Feishu Base ดูแถวที่ feishu_record_id =", target.feishu_record_id, "แล้วเช็คว่ามี note ใหม่หรือไม่")
}

main().catch(e => { console.error(e); process.exit(1) })
