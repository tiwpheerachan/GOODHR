// ────────────────────────────────────────────────────────────────────
// Page config สำหรับบทเรียนแบบหนังสือ (reading book)
//   เก็บใน training_modules.page_config (JSONB) — array อิงตาม index ของหน้า
//   แต่ละหน้า: เวลาอ่านขั้นต่ำ (ตั้งหรือไม่ก็ได้) + ควิซคั่นหน้า (ถ้ามี ต้องตอบถูกก่อนไปต่อ)
// ────────────────────────────────────────────────────────────────────

export type PageQType = "mc" | "tf" | "fill"

export type PageQuestion = {
  id: string
  type: PageQType
  question: string
  options?: string[]              // สำหรับ mc
  answer: number | boolean | string  // mc=index, tf=boolean, fill=ข้อความ (คั่นด้วย | ได้หลายคำตอบ)
}

export type PageConfig = {
  read_seconds?: number | null   // เวลาอ่านขั้นต่ำ (วินาที) — null/undefined = ไม่บังคับ
  quiz?: PageQuestion[]
}

// ทำให้ array ยาวเท่าจำนวนหน้า (pad ด้วย {} / ตัดส่วนเกิน)
export function normalizeConfig(raw: any, pageCount: number): PageConfig[] {
  const arr: PageConfig[] = Array.isArray(raw) ? raw : []
  const out: PageConfig[] = []
  for (let i = 0; i < pageCount; i++) {
    const c = arr[i]
    out.push(c && typeof c === "object" ? { read_seconds: c.read_seconds ?? null, quiz: Array.isArray(c.quiz) ? c.quiz : [] } : { read_seconds: null, quiz: [] })
  }
  return out
}

// หน้านี้มีการตั้งค่าอะไรไหม (ใช้ตัดสินว่าต้องเก็บ)
export function hasConfig(c: PageConfig | undefined): boolean {
  if (!c) return false
  return (c.read_seconds != null && c.read_seconds > 0) || (Array.isArray(c.quiz) && c.quiz.length > 0)
}

// ตรวจคำตอบ 1 ข้อ
export function checkAnswer(q: PageQuestion, given: any): boolean {
  if (q.type === "mc") return Number(given) === Number(q.answer)
  if (q.type === "tf") return !!given === !!q.answer
  // fill — เทียบแบบ case-insensitive, รองรับหลายคำตอบคั่น |
  const accept = String(q.answer ?? "").split("|").map(s => s.trim().toLowerCase()).filter(Boolean)
  return accept.includes(String(given ?? "").trim().toLowerCase())
}

// สร้างคำถามเปล่า — id คงที่ตาม seed (กัน Math.random ในบาง environment)
export function blankQuestion(seed: string): PageQuestion {
  return { id: `q_${seed}`, type: "mc", question: "", options: ["", ""], answer: 0 }
}
