import * as XLSX from "xlsx"

// ════════════════════════════════════════════════════════════════════
// Export บันทึกเช็คลิสต์ร้านค้าเป็น Excel (หลายชีต อย่างละเอียด)
//   ชีต: บันทึก · Stock-Order · Competitor · หัวข้อ · รูปภาพ
//   ใช้ Blob + anchor → ดาวน์โหลดได้ทั้ง desktop และมือถือ
// ════════════════════════════════════════════════════════════════════

const LABEL: Record<string, string> = {
  visit_no: "เข้าครั้งที่", installs_per_month: "ติดตั้ง/เดือน (ชุด)",
  stock_model: "รุ่น(Stock)", stock_qty: "จำนวน(Stock)", order_model: "รุ่น(Order)",
  order_price: "ราคา", order_qty: "จำนวน(Order)", promo: "โปรโมชั่น",
  brand: "Brand", model: "รุ่น", retail: "ราคาปลีก", wholesale: "ราคาส่ง", gp: "GP%",
  terms: "เงื่อนไขซื้อ/ขาย", sales_month: "ยอดขาย/เดือน", model_70mai: "70mai/DDPAI(รุ่น)",
}
const lbl = (k: string) => LABEL[k] || k

function autoWidth(rows: any[]): { wch: number }[] {
  if (rows.length === 0) return []
  const keys = Object.keys(rows[0])
  return keys.map(k => {
    const max = Math.max(k.length, ...rows.map(r => (r[k] == null ? 0 : String(r[k]).length)))
    return { wch: Math.min(Math.max(max + 2, 8), 45) }
  })
}

export function exportChecklistXlsx(subs: any[], filename: string) {
  const wb = XLSX.utils.book_new()

  // ── ชีต 1: บันทึก (สรุปต่อครั้ง) ──
  const summary = subs.map((s: any) => {
    const d = s.data || {}
    const dealer = s.dealer || {}
    const posm = d.posm?.selected ? [...d.posm.selected, ...(d.posm.other ? [d.posm.other] : [])].join(", ") : ""
    return {
      "วันที่": s.visit_date || "",
      "ร้าน": s.dealer_name || dealer.name || "",
      "ประเภทร้าน": dealer.store_type || "",
      "เขต": dealer.zone || "",
      "พื้นที่": dealer.area || "",
      "ร้านใหม่": dealer.is_new ? "ใหม่" : "เก่า",
      "ผู้บันทึก": s.submitter_name || "",
      "แบบฟอร์ม": s.template?.name || "",
      "เข้าครั้งที่": d.visit_no ?? "",
      "ติดตั้ง/เดือน": d.installs_per_month ?? "",
      "POSM": posm,
      "สรุป/ปัญหา": (d.summary || "").toString(),
      "จำนวนรูป": Array.isArray(s.photos) ? s.photos.length : 0,
      "GPS": (s.lat != null && s.lng != null) ? `${s.lat}, ${s.lng}` : "",
      "สถานที่": s.location_name || "",
      "แผนที่": (s.lat != null) ? `https://maps.google.com/?q=${s.lat},${s.lng}` : "",
    }
  })
  const ws1 = XLSX.utils.json_to_sheet(summary)
  ws1["!cols"] = autoWidth(summary)
  XLSX.utils.book_append_sheet(wb, ws1, "บันทึก")

  // helper: แตกตาราง (stock/competitor) เป็นรายบรรทัด พร้อม ref ร้าน/วันที่
  const flatten = (key: string) => {
    const out: any[] = []
    for (const s of subs) {
      const arr = s.data?.[key]
      if (!Array.isArray(arr)) continue
      for (const row of arr) {
        if (!row || !Object.values(row).some(v => v !== "" && v != null)) continue
        const rec: any = { "วันที่": s.visit_date || "", "ร้าน": s.dealer_name || s.dealer?.name || "", "ผู้บันทึก": s.submitter_name || "" }
        for (const [k, v] of Object.entries(row)) rec[lbl(k)] = v
        out.push(rec)
      }
    }
    return out
  }

  const stock = flatten("stock")
  if (stock.length) { const ws = XLSX.utils.json_to_sheet(stock); ws["!cols"] = autoWidth(stock); XLSX.utils.book_append_sheet(wb, ws, "Stock-Order") }

  const comp = flatten("competitor")
  if (comp.length) { const ws = XLSX.utils.json_to_sheet(comp); ws["!cols"] = autoWidth(comp); XLSX.utils.book_append_sheet(wb, ws, "Competitor") }

  // ── ชีต: หัวข้อ (topics) ──
  const topics: any[] = []
  for (const s of subs) {
    const arr = s.data?.topics
    if (!Array.isArray(arr)) continue
    arr.filter(Boolean).forEach((t: string, i: number) =>
      topics.push({ "วันที่": s.visit_date || "", "ร้าน": s.dealer_name || s.dealer?.name || "", "ลำดับ": i + 1, "หัวข้อ": t }))
  }
  if (topics.length) { const ws = XLSX.utils.json_to_sheet(topics); ws["!cols"] = autoWidth(topics); XLSX.utils.book_append_sheet(wb, ws, "หัวข้อ") }

  // ── ชีต: รูปภาพ (ลิงก์) ──
  const photos: any[] = []
  for (const s of subs) {
    if (!Array.isArray(s.photos)) continue
    s.photos.forEach((p: any, i: number) =>
      photos.push({ "วันที่": s.visit_date || "", "ร้าน": s.dealer_name || s.dealer?.name || "", "รูปที่": i + 1, "ลิงก์": p.url || "", "คำอธิบาย": p.caption || "" }))
  }
  if (photos.length) { const ws = XLSX.utils.json_to_sheet(photos); ws["!cols"] = autoWidth(photos); XLSX.utils.book_append_sheet(wb, ws, "รูปภาพ") }

  // ── ดาวน์โหลดผ่าน Blob (มือถือรองรับ) ──
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" })
  const blob = new Blob([out], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
