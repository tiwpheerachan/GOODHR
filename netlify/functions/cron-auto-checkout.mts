import type { Config } from "@netlify/functions"

// ── Netlify Scheduled Function ─────────────────────────────────────────────
// รันทุกวัน เวลา 04:00 น. Bangkok (UTC+7) = 21:00 UTC วันก่อนหน้า
// cron: "0 21 * * *"
//
// ต้องตั้งค่า Environment Variable:
//   CRON_SECRET  = secret string (ตรงกับใน Next.js API route)
//   NEXT_PUBLIC_APP_URL = https://your-site.netlify.app

export default async function handler() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const secret  = process.env.CRON_SECRET ?? ""

  const res = await fetch(`${baseUrl}/api/cron/auto-checkout`, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${secret}`,
      "Content-Type":  "application/json",
    },
  })

  const body = await res.json()
  console.log("[cron-auto-checkout]", JSON.stringify(body))
}

export const config: Config = {
  schedule: "0 21 * * *", // 21:00 UTC = 04:00 Bangkok (UTC+7)
}
