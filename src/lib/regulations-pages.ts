// ── โครงหน้าเอกสารระเบียบข้อบังคับ (แปลงจาก PDF เป็นรูปรายหน้า) ──
//   จัดกลุ่มตามหมวด · TH 32 หน้า / CN 26 หน้า · หน้าปก+สารบัญ = front
//   signPage = หน้าที่มีช่องลงนามผู้บริหาร (แปะลายเซ็นตามบริษัท)

const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i)

export type RegLang = "th" | "cn"

export const REG_TITLES: { no: number; th: string; cn: string }[] = [
  { no: 1, th: "บททั่วไป", cn: "总则" },
  { no: 2, th: "การว่าจ้าง", cn: "员工聘用" },
  { no: 3, th: "วันทำงาน เวลาทำงานปกติ และเวลาพัก", cn: "工作日、正常工作时间及休息时间" },
  { no: 4, th: "วันหยุดและหลักเกณฑ์การหยุด", cn: "休息日和休假规则" },
  { no: 5, th: "วันลา และหลักเกณฑ์การลา", cn: "请假和请假规则" },
  { no: 6, th: "การทำงานล่วงเวลา การทำงานในวันหยุด และค่าตอบแทน", cn: "加班、假日工作及相关报酬规则" },
  { no: 7, th: "วินัยและโทษทางวินัย", cn: "纪律与纪律处分" },
  { no: 8, th: "การร้องทุกข์", cn: "申诉" },
  { no: 9, th: "การเลิกจ้าง การพ้นสภาพการเป็นพนักงาน และค่าชดเชย", cn: "解雇、员工资格终止及遣散费" },
  { no: 10, th: "สภาพการบังคับและการประกาศใช้", cn: "规章的效力与颁布" },
]

type LangPages = {
  dir: string
  ext: string
  total: number
  front: number[]
  chapters: Record<number, number[]>
  signPage: number
}

export const REG_PAGES: Record<RegLang, LangPages> = {
  th: {
    dir: "/regulations/th", ext: "png", total: 32, front: [1, 2],
    chapters: {
      1: range(3, 5), 2: range(6, 7), 3: range(8, 11), 4: range(12, 13),
      5: range(14, 20), 6: range(21, 22), 7: range(23, 27), 8: range(28, 29),
      9: range(30, 31), 10: [32],
    },
    signPage: 32,
  },
  cn: {
    dir: "/regulations/cn", ext: "png", total: 26, front: [1, 2],
    chapters: {
      1: range(3, 4), 2: range(5, 6), 3: range(7, 9), 4: range(10, 11),
      5: range(12, 16), 6: range(17, 18), 7: range(19, 22), 8: [23],
      9: range(24, 25), 10: [26],
    },
    signPage: 26,
  },
}

export const pageSrc = (lang: RegLang, n: number) => {
  const m = REG_PAGES[lang]
  return `${m.dir}/p-${String(n).padStart(2, "0")}.${m.ext}`
}

// ── ตำแหน่งลายเซ็นผู้บริหาร (% ของหน้า) — วัดจาก bbox จริงในไฟล์ PDF ──
export const SIG_POS: Record<RegLang, {
  img: { top: number; left: number; width: number }
  name: { top: number; left: number; width: number }
}> = {
  th: { img: { top: 35, left: 46, width: 21 }, name: { top: 46.3, left: 42, width: 42 } },
  cn: { img: { top: 20, left: 43, width: 21 }, name: { top: 33.4, left: 38, width: 36 } },
}

// ── ลายเซ็น + ชื่อกรรมการ ตามบริษัทที่พนักงานสังกัด ──
export type ExecSig = { img: string | null; name: string }
export function execSignatureForCompany(company: any): ExecSig | null {
  const code = (company?.code || "").toUpperCase()
  const name = `${company?.name_th || ""} ${company?.name_en || ""}`.toLowerCase()
  const is = (re: RegExp, ...codes: string[]) => codes.includes(code) || re.test(name)

  if (is(/shd|เอสเอชดี/, "SHD"))
    return { img: "/regulations-sig/sig-shd.png", name: "นายประดิษฐ์ แสนแก้ว" }
  if (is(/hashtag|แฮชแท็ก/, "HASHTAG"))
    return { img: "/regulations-sig/sig-hashtag.png", name: "MR.CHEN JINZHI และ MR.CHEN JINBIAO" }
  if (is(/rabbit|แรบบิท|top\s?one|ท็อป\s?วัน/, "RABBIT", "TOP1", "TOPONE"))
    return { img: "/regulations-sig/sig-rabbit.jpg", name: "นายวินัย หนูรูปงาม" }
  if (is(/\bp[tc]c\b|พี\s?ที\s?ซี/, "PTC", "PCT"))
    return { img: "/regulations-sig/sig-ptc.jpg", name: "นายพิพัชร์ ธรรมการฐิติคุณ" }
  if (is(/teranova|เทราโนวา/, "TERANOVA"))
    return { img: null, name: "MR.CHEN JINZHI" }
  return null
}
