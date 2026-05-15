// รายชื่อแบรนด์มาตรฐานสำหรับติ๊กในหน้า payroll/employee
export const BRAND_OPTIONS = [
  "70mai",
  "Anker",
  "DDpai",
  "Dreame",
  "Jimmy",
  "Levoit",
  "Mibro",
  "Mova",
  "Soundcore",
  "Thaimall",
  "Toptoy",
  "Uwant",
  "Vinko",
  "Wanbo",
  "Xiaomi Home Appliances",
  "Xiaomi MG",
  "Xiaomi Smart App",
  "Zepp",
] as const

export type BrandName = typeof BRAND_OPTIONS[number]

// แปลงข้อมูล brand ที่อาจเป็นได้หลายรูปแบบ (string เดี่ยว, array, null) → string[]
export function normalizeBrands(b: unknown): string[] {
  if (!b) return []
  if (Array.isArray(b)) return b.filter((x): x is string => typeof x === "string" && x.trim().length > 0)
  if (typeof b === "string") {
    const trimmed = b.trim()
    return trimmed ? [trimmed] : []
  }
  return []
}
