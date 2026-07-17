import JSZip from "jszip"

// ดาวน์โหลดรูป + ไฟล์แนบทั้งหมดของรายการที่เลือกเป็น .zip
//   จัดโฟลเดอร์: รูปที่ root · ไฟล์อื่นใน "ไฟล์แนบ/"
//   คืนจำนวนไฟล์ที่ใส่สำเร็จ (0 = ไม่มี/ดึงไม่ได้)
const safe = (s: string) => (s || "").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40)

export async function downloadChecklistZip(subs: any[], filename: string): Promise<number> {
  const zip = new JSZip()
  let n = 0
  for (const s of subs) {
    const base = `${s.visit_date || ""}_${safe(s.dealer_name || s.dealer?.name || "ร้าน")}`
    const photos = Array.isArray(s.photos) ? s.photos : []
    for (let i = 0; i < photos.length; i++) {
      try {
        const blob = await fetch(photos[i].url).then(r => r.blob())
        zip.file(`${base}_${i + 1}.jpg`, blob); n++
      } catch { /* ข้ามรูปที่ดึงไม่ได้ */ }
    }
    const files = Array.isArray(s.files) ? s.files : []
    for (const f of files) {
      try {
        const blob = await fetch(f.url).then(r => r.blob())
        zip.file(`ไฟล์แนบ/${base}_${safe(f.name || "file")}`, blob); n++
      } catch { /* ข้าม */ }
    }
  }
  if (n === 0) return 0
  const blob = await zip.generateAsync({ type: "blob" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
  return n
}
