import type { Config } from "@netlify/functions"

// ── Netlify Scheduled Function ─────────────────────────────────────────────
// sync ข้อมูล barcode_products จาก BigQuery (pc.barcode_products) มายัง Supabase
// ให้พนักงานสแกนบาร์โค้ดแล้วเห็นรายละเอียดสินค้า + ราคา
// ตารางเล็ก (~323 แถว) → full refresh ทุกครั้ง ราคาถูกมาก
//
// ต้องตั้ง Environment Variable (Netlify หรือ external cron ที่ยิง endpoint นี้):
//   CRON_SECRET / NEXT_PUBLIC_APP_URL
//   GOOGLE_APPLICATION_CREDENTIALS_JSON / BQ_SERIAL_PROJECT

export default async function handler() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const secret  = process.env.CRON_SECRET ?? ""

  const res = await fetch(`${baseUrl}/api/cron/sync-barcode-products`, {
    method:  "POST",
    headers: { "Authorization": `Bearer ${secret}`, "Content-Type": "application/json" },
  })
  const body = await res.json()
  console.log("[cron-sync-barcode-products]", JSON.stringify(body))
}

export const config: Config = {
  schedule: "0 23 * * *", // 23:00 UTC = 06:00 น. Bangkok (UTC+7) — ทุกวันเช้า 6 โมง (full refresh)
}
