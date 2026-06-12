"use client"
import { useEffect, useState } from "react"
import { BRAND_OPTIONS, type Brand } from "@/lib/utils/brands"

// ─── React hook: ดึง brand list จาก /api/brands ───
//   - fallback เป็น BRAND_OPTIONS ถ้าโหลดไม่สำเร็จ
//   - cache ใน sessionStorage 5 นาที เพื่อลดโหลด

const CACHE_KEY = "goodhr_brands_cache_v1"
const CACHE_TTL_MS = 5 * 60 * 1000

function readCache(): Brand[] | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { ts, brands } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL_MS) return null
    return brands
  } catch { return null }
}

function writeCache(brands: Brand[]) {
  if (typeof window === "undefined") return
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), brands })) } catch {}
}

export function useBrands(): { brands: Brand[]; names: string[]; loading: boolean; reload: () => void } {
  const [brands, setBrands] = useState<Brand[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(brands.length === 0)

  const load = async () => {
    try {
      const res = await fetch("/api/brands")
      if (!res.ok) throw new Error("failed")
      const d = await res.json()
      const list = Array.isArray(d.brands) ? d.brands : []
      if (list.length > 0) {
        setBrands(list)
        writeCache(list)
      } else if (brands.length === 0) {
        // fallback ถ้า DB ยังว่าง (ก่อนรัน seed)
        setBrands(BRAND_OPTIONS.map((n, i) => ({ id: n, name: n, display_order: (i + 1) * 10 })))
      }
    } catch {
      if (brands.length === 0) {
        setBrands(BRAND_OPTIONS.map((n, i) => ({ id: n, name: n, display_order: (i + 1) * 10 })))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return {
    brands,
    names: brands.map(b => b.name),
    loading,
    reload: () => { try { sessionStorage.removeItem(CACHE_KEY) } catch {}; load() },
  }
}

// ─── invalidate ใช้หลัง CRUD ────────────────────────────────────────
export function invalidateBrandsCache() {
  if (typeof window !== "undefined") {
    try { sessionStorage.removeItem(CACHE_KEY) } catch {}
  }
}
