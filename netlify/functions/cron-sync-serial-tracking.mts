import type { Config } from "@netlify/functions"

// ── Netlify Scheduled Function ─────────────────────────────────────────────
// sync ข้อมูล serial_tracking จาก BigQuery มายัง Supabase (ให้พนักงานสแกน serial แล้วรู้สินค้า)
// รันทุก 15 นาที (ปรับได้ที่ config.schedule ด้านล่าง)
//
// ต้องตั้งค่า Environment Variable บน Netlify:
//   CRON_SECRET                          = secret string (ตรงกับใน API route)
//   NEXT_PUBLIC_APP_URL                  = https://your-site.netlify.app
//   GOOGLE_APPLICATION_CREDENTIALS_JSON  = service account JSON (1 บรรทัด)
//   BQ_SERIAL_PROJECT / BQ_SERIAL_DATASET / BQ_SERIAL_TABLE

export default async function handler() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const secret  = process.env.CRON_SECRET ?? ""

  const res = await fetch(`${baseUrl}/api/cron/sync-serial-tracking`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type":  "application/json",
    },
  })

  const body = await res.json()
  console.log("[cron-sync-serial-tracking]", JSON.stringify(body))
}

export const config: Config = {
  schedule: "0 * * * *", // ทุกชั่วโมง (mode=new — insert เฉพาะ serial ใหม่)
}
