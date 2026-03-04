export function calcWorkDate(clockIn: Date, isOvernight: boolean, tz = "Asia/Bangkok"): string {
  const local = new Date(clockIn.toLocaleString("en-US", { timeZone: tz }))
  if (isOvernight && local.getHours() < 12) {
    const prev = new Date(local); prev.setDate(prev.getDate() - 1)
    return prev.toISOString().split("T")[0]
  }
  return local.toISOString().split("T")[0]
}

export function calcGeoDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const p1 = (lat1 * Math.PI) / 180, p2 = (lat2 * Math.PI) / 180
  const dp = ((lat2 - lat1) * Math.PI) / 180, dl = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)))
}

export function calcLateMinutes(clockIn: Date, expected: Date): number {
  const d = clockIn.getTime() - expected.getTime()
  return d > 0 ? Math.floor(d / 60000) : 0
}

export function calcWorkMinutes(clockIn: Date, clockOut: Date, breakMin = 60): number {
  return Math.max(Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000) - breakMin, 0)
}

export function formatTime(d: Date | string | null | undefined): string {
  if (!d) return "--:--"
  return new Date(d).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", hour12: false })
}

export function formatDateTH(d: Date | string | null | undefined): string {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })
}

export function statusToTH(s: string): string {
  return { present:"มาทำงาน", absent:"ขาดงาน", late:"มาสาย", early_out:"ออกก่อน",
           leave:"ลาหยุด", holiday:"วันหยุด", day_off:"วันหยุด", wfh:"WFH" }[s] ?? s
}

export function statusColor(s: string): string {
  return { present:"text-green-600 bg-green-50", absent:"text-red-600 bg-red-50",
           late:"text-yellow-600 bg-yellow-50", early_out:"text-orange-600 bg-orange-50",
           leave:"text-blue-600 bg-blue-50", holiday:"text-purple-600 bg-purple-50",
           day_off:"text-gray-500 bg-gray-50", wfh:"text-teal-600 bg-teal-50" }[s] ?? "text-gray-600 bg-gray-50"
}
