import type { Config } from "@netlify/functions"

// ── Netlify Scheduled Function ─────────────────────────────────────────────
// รันทุกวัน เวลา 08:00 น. Bangkok (UTC+7) = 01:00 UTC
// ส่งอีเมลเตือนผู้รับ 3 วันก่อนพนักงานครบกำหนดประเมินทดลองงาน 90 วัน
//
// ต้องตั้งค่า Environment Variable (มีอยู่แล้วจาก cron อื่น):
//   CRON_SECRET          = secret string (ตรงกับใน Next.js API route)
//   NEXT_PUBLIC_APP_URL  = https://your-site.netlify.app
//   RESEND_API_KEY       = สำหรับส่งอีเมล

export default async function handler() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const secret  = process.env.CRON_SECRET ?? ""

  const res = await fetch(`${baseUrl}/api/cron/probation-reminder`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type":  "application/json",
    },
  })

  const body = await res.json()
  console.log("[cron-probation-reminder]", JSON.stringify(body))
}

export const config: Config = {
  schedule: "0 1 * * *", // 01:00 UTC = 08:00 Bangkok (UTC+7)
}
