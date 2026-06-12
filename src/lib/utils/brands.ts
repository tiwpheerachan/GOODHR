// ─── Brand list ─────────────────────────────────────────────────────
//   Source of truth = ตาราง `brands` ใน Supabase (ตั้งค่าได้ผ่าน /admin/settings)
//   ค่าด้านล่างเป็น *seed fallback* สำหรับกรณีที่ยังโหลด API ไม่เสร็จ
//   หรือใช้เป็น whitelist เผื่อ DB ลบ row ออก (เก็บข้อมูลเดิมเอาไว้ valid)
//
//   ⚠️ ไฟล์นี้ใช้ได้ทั้ง server + client — ห้ามใส่ React hook ที่นี่
//      ถ้าต้องการ hook → ใช้ `useBrands` จาก `@/lib/hooks/useBrands`

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

export type BrandName = string  // DB-driven แล้ว → string ปกติ

export interface Brand {
  id: string
  name: string
  slug?: string | null
  color_hex?: string | null
  logo_url?: string | null
  display_order?: number | null
  is_active?: boolean
}

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
