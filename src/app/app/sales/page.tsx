"use client"
import { useEffect, useState, useRef, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft, Camera, X, Search, Package, ScanLine, Check,
  Trash2, Edit2, Save, AlertCircle, CircleDollarSign, Hash, FileText,
  TrendingUp, ListChecks, Loader2, History, ImagePlus, ChevronRight,
} from "lucide-react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import toast from "react-hot-toast"
import PhotoCapture from "@/components/sales/PhotoCapture"
import BranchSettings from "@/components/sales/BranchSettings"
import PersonalDashboard from "@/components/sales/PersonalDashboard"

type ScanPurpose = "barcode" | "sn" | "order"
type CodeType = "barcode" | "sn" | "order"

// ════════════════════════════════════════════════════════════════════
// Smart code classifier (trained จากข้อมูลจริง)
// ════════════════════════════════════════════════════════════════════
//
// ─── PATTERNS อ้างอิงจากข้อมูลจริง ───
//
// EAN-13 / GS1 retail barcodes:
//   - 13 digits (last = check digit)
//   - Country/manufacturer prefix
//   - Examples: 6976233670423 (Dreame), 8851234567890 (Thailand)
//   - All numeric, no letters
//
// EAN-8 / UPC-A / UPC-E:
//   - 8 / 12 / 8 digits respectively, all numeric
//
// GTIN-14 (carton barcode):
//   - 14 digits
//
// Serial Number (SN) patterns:
//   - มักมี prefix "SN:", "S/N:", "P/N:", "Serial:" บน label
//   - Encoded ใน Code128 มักไม่มี prefix (เก็บแค่ค่า)
//   - ความยาว 10-24 chars, alphanumeric, มัก UPPERCASE
//   - มักขึ้นต้นด้วยตัวอักษร (รหัสรุ่น/ผู้ผลิต)
//   - ตัวอย่างจริง: APVDHMN0F13102572 (Dreame, 17 ตัว), P2287R3B9TH1074515 (18 ตัว),
//                  Apple SN: C02ABC3DEF (10 ตัว)
//
// Order Number patterns:
//   - 5-10 digits, all numeric (เช่น 9428555)
//   - หรือ alphanumeric + prefix ORD/PO/INV/#
//   - ความยาวสั้น (≤ 12 chars)
// ════════════════════════════════════════════════════════════════════

const SN_PREFIX_PATTERNS = [
  /^\s*(SN|S\/N|S\.N\.?|SR|SERIAL\s*NO?|SERIAL\s*NUMBER|P\/N|PART\s*NO?|IMEI|MAC|UID|UUID)\s*[:#=\-]\s*/i,
]
const ORDER_PREFIX_PATTERNS = [
  /^\s*(ORD(?:ER)?|PO|P\.O\.|INV(?:OICE)?|REF|REFERENCE|ORDER\s*NO?)\s*[:#=\-]\s*/i,
  /^#\s*/,  // "#12345"
]
const BARCODE_PREFIX_PATTERNS = [
  /^\s*(BC|BARCODE|EAN|UPC|GTIN|ITEM\s*CODE)\s*[:#=\-]\s*/i,
]

// ── Clean decoded text: ลบ prefix + whitespace + zero-width chars ──
function cleanDecoded(raw: string): string {
  let s = (raw || "").trim()
  // ลบ prefix ทุกแบบ
  for (const re of [...SN_PREFIX_PATTERNS, ...ORDER_PREFIX_PATTERNS, ...BARCODE_PREFIX_PATTERNS]) {
    if (re.test(s)) { s = s.replace(re, ""); break }
  }
  // ลบ zero-width chars
  s = s.replace(/[​-‍﻿]/g, "").trim()
  return s
}

// ── Detect prefix hint จาก raw value ──
function detectPrefixHint(raw: string): { type: CodeType; matched: string } | null {
  const v = (raw || "").trim()
  for (const re of SN_PREFIX_PATTERNS) {
    const m = v.match(re); if (m) return { type: "sn", matched: m[1] }
  }
  for (const re of ORDER_PREFIX_PATTERNS) {
    const m = v.match(re); if (m) return { type: "order", matched: m[1] || "#" }
  }
  for (const re of BARCODE_PREFIX_PATTERNS) {
    const m = v.match(re); if (m) return { type: "barcode", matched: m[1] }
  }
  return null
}

// ── Validate EAN-13 check digit (เพิ่มความมั่นใจของ classification) ──
function isValidEAN13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false
  const digits = s.split("").map(Number)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += digits[i] * (i % 2 === 0 ? 1 : 3)
  const check = (10 - (sum % 10)) % 10
  return check === digits[12]
}
function isValidEAN8(s: string): boolean {
  if (!/^\d{8}$/.test(s)) return false
  const d = s.split("").map(Number)
  let sum = 0
  for (let i = 0; i < 7; i++) sum += d[i] * (i % 2 === 0 ? 3 : 1)
  const check = (10 - (sum % 10)) % 10
  return check === d[7]
}
function isValidUPCA(s: string): boolean {
  if (!/^\d{12}$/.test(s)) return false
  const d = s.split("").map(Number)
  let sum = 0
  for (let i = 0; i < 11; i++) sum += d[i] * (i % 2 === 0 ? 3 : 1)
  const check = (10 - (sum % 10)) % 10
  return check === d[11]
}

// ── Main classifier ──
async function classifyCode(raw: string, formatName?: string): Promise<{
  type: CodeType
  product?: any | null
  confidence: number
  reason: string
}> {
  const clean = cleanDecoded(raw)
  if (!clean) return { type: "sn", confidence: 0, reason: "ค่าว่าง" }

  // ─── 1. PREFIX (most certain) ───
  const prefix = detectPrefixHint(raw)
  if (prefix) {
    return { type: prefix.type, confidence: 99, reason: `prefix "${prefix.matched}:"` }
  }

  // ─── 2. SCANNER FORMAT (EAN/UPC = product barcode สูง) ───
  if (formatName) {
    const fn = formatName.toLowerCase().replace(/[-_]/g, "")
    if (/^(ean13|ean8|upca|upce|gtin)$/.test(fn)) {
      return { type: "barcode", confidence: 95, reason: `${formatName}` }
    }
  }

  // ─── 3. CHECK DIGIT validation (EAN/UPC) ───
  if (isValidEAN13(clean)) return { type: "barcode", confidence: 98, reason: "EAN-13 valid checksum" }
  if (isValidUPCA(clean))  return { type: "barcode", confidence: 98, reason: "UPC-A valid checksum" }
  if (isValidEAN8(clean))  return { type: "barcode", confidence: 98, reason: "EAN-8 valid checksum" }

  // ─── 4. DB LOOKUP ───
  try {
    const r = await fetch(`/api/products?barcode=${encodeURIComponent(clean)}`)
    const d = await r.json()
    if (d?.product) {
      return { type: "barcode", product: d.product, confidence: 100, reason: `พบใน DB: ${d.product.name}` }
    }
  } catch {}

  // ─── 5. PATTERN HEURISTICS ───
  const len = clean.length
  const isDigits = /^\d+$/.test(clean)
  const isAlnum = /^[A-Za-z0-9]+$/.test(clean)
  const hasLetter = /[A-Za-z]/.test(clean)
  const hasDigit = /\d/.test(clean)
  const isAllUpper = !/[a-z]/.test(clean) && hasLetter
  const startsWithLetter = /^[A-Za-z]/.test(clean)
  const hasSpecial = /[-_./]/.test(clean)

  // EAN/UPC numeric patterns (checksum ผิด แต่ length ตรง)
  if (isDigits) {
    if (len === 13 || len === 12) return { type: "barcode", confidence: 80, reason: `${len} digits — EAN/UPC pattern` }
    if (len === 14)               return { type: "barcode", confidence: 75, reason: "GTIN-14" }
    if (len === 8)                return { type: "barcode", confidence: 75, reason: "EAN-8" }
    // ตัวเลขสั้น 5-10 → order
    if (len >= 5 && len <= 10)    return { type: "order", confidence: 75, reason: `${len} digits — order` }
    // ตัวเลขยาว 15+ → SN ตัวเลขล้วน (rare แต่มี)
    if (len >= 15)                return { type: "sn", confidence: 70, reason: `${len} digits ยาว — SN ตัวเลข` }
  }

  // Alphanumeric — classic SN pattern (Dreame, Apple, etc.)
  if (isAlnum && hasLetter && hasDigit && startsWithLetter) {
    // 14-24 ตัว uppercase = SN ของอุปกรณ์ระดับ premium (Dreame, etc.)
    if (len >= 14 && len <= 26 && isAllUpper) {
      return { type: "sn", confidence: 95, reason: `${len} ตัว UPPERCASE — SN เครื่อง` }
    }
    // 10-14 ตัว = SN ทั่วไป (Apple, Samsung)
    if (len >= 10 && len <= 14) {
      return { type: "sn", confidence: 85, reason: `${len} ตัว alphanumeric — SN` }
    }
    // 5-9 ตัว = อาจเป็น order code
    if (len >= 5 && len <= 9) {
      return { type: "order", confidence: 60, reason: `${len} ตัว alphanumeric สั้น — order` }
    }
  }

  // มี special chars → likely SN/serial (เช่น "ABC-123-456")
  if (hasSpecial && len >= 8) {
    return { type: "sn", confidence: 65, reason: "มี - หรือ _ — น่าจะ SN" }
  }

  // Default
  if (isDigits) return { type: "barcode", confidence: 40, reason: `${len} digits — เดา barcode` }
  return { type: "sn", confidence: 35, reason: "ไม่ตรง pattern — เดาเป็น SN" }
}

export default function EmployeeSalesPage() {
  const [scannerOpen, setScannerOpen] = useState<ScanPurpose | null>(null)
  const [activeProduct, setActiveProduct] = useState<any>(null)
  const [manualBarcode, setManualBarcode] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [myAccess, setMyAccess] = useState<string>("staff")

  // ── Form state ──
  const [form, setForm] = useState({
    barcode: "",
    sold_price: "",
    sn: "",
    order_number: "",
    qty: "1",
    note: "",
    manual_name: "",
    manual_brand: "",
  })
  const [submitting, setSubmitting] = useState(false)
  // ── Photo (proof) ──
  const [proofPhoto, setProofPhoto] = useState<File | null>(null)
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null)
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false)

  const loadHistory = async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await fetch(`/api/products/sales?scope=me&start=${today}&end=${today}`)
      const d = await res.json()
      if (res.ok) {
        setHistory(d.sales ?? [])
        setStats(d.stats ?? null)
        if (d.my_access) setMyAccess(d.my_access)
      }
    } finally { setLoading(false) }
  }
  useEffect(() => { loadHistory() }, [])

  // ── Multi-scan callback: รับ barcode + sn + order พร้อม product ──
  const onMultiScanned = async (codes: { barcode?: string; sn?: string; order?: string; product?: any | null }) => {
    setScannerOpen(null)
    setManualBarcode("")
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(80)

    if (!codes.barcode && !codes.sn && !codes.order) return

    // ── set product / activeProduct ──
    if (codes.barcode) {
      if (codes.product) {
        setActiveProduct(codes.product)
        setForm(f => ({
          ...f,
          barcode: codes.barcode || "",
          sold_price: codes.product.default_price ? String(codes.product.default_price) : "",
          sn: codes.sn || "",
          order_number: codes.order || "",
          qty: "1", note: "",
        }))
      } else {
        // ไม่เจอใน DB — กรอกเอง
        setActiveProduct({ __unknown: true, barcode: codes.barcode })
        setForm(f => ({
          ...f,
          barcode: codes.barcode || "",
          sold_price: "", sn: codes.sn || "", order_number: codes.order || "",
          qty: "1", note: "", manual_name: "", manual_brand: "",
        }))
        toast("ไม่พบใน DB — กรอกชื่อสินค้า", { icon: "ℹ️" })
      }
      if (codes.sn) toast.success(`เจอ Barcode + SN`, { icon: "✨" })
    } else if (codes.sn) {
      // มีแต่ SN — ไม่เจอ barcode
      setActiveProduct({ __unknown: true, barcode: null })
      setForm(f => ({
        ...f,
        barcode: "", sold_price: "", sn: codes.sn || "", order_number: codes.order || "",
        qty: "1", note: "", manual_name: "", manual_brand: "",
      }))
      toast(`ได้ SN — กรอกชื่อสินค้า + ราคา`, { icon: "🔢" })
    }
  }

  // ── Scanner callback: handle purpose (barcode lookup / SN / Order) ──
  const onBarcodeScanned = async (raw: string, purpose: ScanPurpose = "barcode") => {
    const code = cleanDecoded(raw)
    if (!code) return
    setScannerOpen(null)

    // vibration feedback
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50)

    // SN field — แค่ใส่ค่าใน form (ถ้า activeProduct เปิดอยู่แล้ว) หรือสร้าง __unknown
    if (purpose === "sn") {
      if (activeProduct) {
        setForm(f => ({ ...f, sn: code }))
        toast.success(`เพิ่ม SN: ${code}`)
      } else {
        // ยังไม่มี product → สร้าง unknown แล้วเติม SN
        setActiveProduct({ __unknown: true, barcode: null })
        setForm(f => ({ ...f, sold_price: "", sn: code, order_number: "", qty: "1", note: "", manual_name: "", manual_brand: "" }))
        toast(`ได้ SN: ${code} — กรอกชื่อสินค้า + ราคา`, { icon: "🔢" })
      }
      return
    }
    if (purpose === "order") {
      if (activeProduct) {
        setForm(f => ({ ...f, order_number: code }))
        toast.success(`เพิ่ม Order: ${code}`)
      }
      return
    }

    // barcode (product lookup) — ตรวจสอบฉลาด: ถ้าไม่ใช่ตัวเลข อาจเป็น SN
    setManualBarcode("")
    const looksLikeSn = !/^\d{8,14}$/.test(code)
    const res = await fetch(`/api/products?barcode=${encodeURIComponent(code)}`)
    const d = await res.json()

    // ── re-scan barcode จากภายใน EntryModal — แค่อัพเดต field ไม่ reset ──
    if (activeProduct && !looksLikeSn) {
      setForm(f => ({ ...f, barcode: code }))
      if (d.product) {
        setActiveProduct(d.product)
        toast.success(`อัพเดตเป็น: ${d.product.name}`)
      } else {
        toast.success(`อัพเดต barcode แล้ว`)
      }
      return
    }

    if (d.product) {
      setActiveProduct(d.product)
      setForm(f => ({
        ...f,
        barcode: code,
        sold_price: d.product.default_price ? String(d.product.default_price) : "",
        sn: "", order_number: "", qty: "1", note: "",
      }))
    } else {
      // ไม่เจอใน DB → ถ้ารูปแบบเหมือน SN ให้เติม sn อัตโนมัติ
      setActiveProduct({ __unknown: true, barcode: looksLikeSn ? null : code })
      setForm(f => ({
        ...f,
        barcode: looksLikeSn ? "" : code,
        sold_price: "", sn: looksLikeSn ? code : "",
        order_number: "", qty: "1", note: "", manual_name: "", manual_brand: "",
      }))
      toast(looksLikeSn
        ? `ดูเหมือน Serial Number — กรอกชื่อสินค้า + ราคา`
        : "ไม่พบใน DB — กรอกข้อมูลเองได้",
        { icon: looksLikeSn ? "🔢" : "ℹ️" })
    }
  }

  const resetForm = () => {
    setActiveProduct(null)
    setForm({ barcode: "", sold_price: "", sn: "", order_number: "", qty: "1", note: "", manual_name: "", manual_brand: "" })
    if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl)
    setProofPhoto(null)
    setProofPreviewUrl(null)
  }

  const submitSale = async () => {
    if (!activeProduct) return
    const priceN = Number(form.sold_price)
    if (!form.sold_price || isNaN(priceN) || priceN < 0) {
      toast.error("กรุณากรอกราคาขายให้ถูกต้อง")
      return
    }
    if (activeProduct.__unknown && !form.manual_name.trim()) {
      toast.error("กรุณากรอกชื่อสินค้า")
      return
    }
    setSubmitting(true)
    try {
      // ── 1. Upload proof photo (ถ้ามี) ──
      let proof_photo_url: string | null = null
      if (proofPhoto) {
        const fd = new FormData()
        fd.append("file", proofPhoto)
        toast.loading("กำลังอัพโหลดรูป...", { id: "ph" })
        const ures = await fetch("/api/products/sales/upload-photo", { method: "POST", body: fd })
        const ud = await ures.json()
        toast.dismiss("ph")
        if (!ures.ok) {
          toast.error("อัพโหลดรูปไม่สำเร็จ: " + (ud.error || ""))
          return
        }
        proof_photo_url = ud.url
      }

      // ── 2. Save sale ──
      const payload = activeProduct.__unknown ? {
        barcode: form.barcode || activeProduct.barcode || null,
        product_name: form.manual_name.trim(),
        brand: form.manual_brand || null,
        sold_price: priceN,
        sn: form.sn || null,
        order_number: form.order_number || null,
        qty: Number(form.qty) || 1,
        note: form.note || null,
        proof_photo_url,
      } : {
        product_id: activeProduct.id,
        barcode: form.barcode || activeProduct.barcode,
        product_name: activeProduct.name,
        brand: activeProduct.brand,
        category: activeProduct.category,
        sold_price: priceN,
        sn: form.sn || null,
        order_number: form.order_number || null,
        qty: Number(form.qty) || 1,
        note: form.note || null,
        proof_photo_url,
      }
      const res = await fetch("/api/products/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      if (!res.ok) { toast.error(d.error || "บันทึกไม่สำเร็จ"); return }
      toast.success(`บันทึกการขายแล้ว · ฿${priceN.toLocaleString()}${proof_photo_url ? " 📸" : ""}`)
      resetForm()
      await loadHistory()
    } finally { setSubmitting(false) }
  }

  const deleteSale = async (id: string) => {
    if (!confirm("ลบรายการนี้?")) return
    const res = await fetch(`/api/products/sales?id=${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("ลบแล้ว"); loadHistory() }
    else toast.error("ลบไม่สำเร็จ")
  }

  return (
    <div className="space-y-4 pb-24">

      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-2xl p-5 shadow-md text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <ScanLine size={22}/>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black">บันทึกการขายสินค้า</h1>
            <p className="text-[11px] opacity-90 mt-0.5">สแกน barcode → กรอกราคา → บันทึก</p>
          </div>
          {(myAccess === "admin" || myAccess === "manager") && (
            <span className="text-[9px] font-black bg-white/20 backdrop-blur px-2 py-1 rounded-full uppercase tracking-wider">
              {myAccess}
            </span>
          )}
        </div>
      </div>

      {/* Admin/Manager shortcut — เห็นเฉพาะคนที่มีสิทธิ์ */}
      {(myAccess === "admin" || myAccess === "manager") && (
        <Link href="/admin/sales"
          className="block bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 hover:from-slate-700 hover:via-slate-600 hover:to-slate-700 rounded-2xl p-3 text-white shadow-md relative overflow-hidden group transition-all active:scale-[0.99]">
          {/* shine */}
          <div className="absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 group-hover:translate-x-[420%] transition-transform duration-700"/>
          <div className="relative flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-inner shadow-black/20">
              <ListChecks size={16} className="text-white"/>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-wider opacity-70">
                {myAccess === "admin" ? "เครื่องมือ Admin" : "เครื่องมือ Manager"}
              </p>
              <p className="text-sm font-black mt-0.5">เปิดหน้า Dashboard + ตาราง + คลังสินค้า{myAccess === "admin" ? " + สิทธิ์" : ""}</p>
            </div>
            <ChevronRight size={16} className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all"/>
          </div>
        </Link>
      )}

      {/* Branch setting */}
      <BranchSettings/>

      {/* Personal dashboard (motivation + rank + chart) */}
      <PersonalDashboard refreshKey={history.length}/>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setScannerOpen("barcode")}
          className="bg-white rounded-2xl p-4 border-2 border-indigo-200 shadow-sm hover:shadow-md hover:border-indigo-400 transition-all active:scale-95">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Camera size={22}/>
          </div>
          <p className="text-sm font-black text-slate-800 text-center">📷 สแกน Barcode</p>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">เปิดกล้องสแกน</p>
        </button>

        <button onClick={() => setSearchOpen(true)}
          className="bg-white rounded-2xl p-4 border-2 border-amber-200 shadow-sm hover:shadow-md hover:border-amber-400 transition-all active:scale-95">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center mx-auto mb-2 shadow-sm">
            <Search size={22}/>
          </div>
          <p className="text-sm font-black text-slate-800 text-center">🔍 ค้น/กรอกเอง</p>
          <p className="text-[10px] text-slate-400 text-center mt-0.5">ค้นชื่อ/กรอก barcode</p>
        </button>
      </div>

      {/* Manual barcode input (fast path) */}
      <div className="bg-white rounded-2xl border border-slate-100 p-3 shadow-sm flex items-center gap-2">
        <Hash size={14} className="text-slate-400 ml-1"/>
        <input value={manualBarcode}
          onChange={e => setManualBarcode(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && manualBarcode.trim()) onBarcodeScanned(manualBarcode.trim()) }}
          placeholder="กรอก barcode โดยตรง (เช่นจาก scanner USB)..."
          className="flex-1 outline-none text-sm font-bold text-slate-800"/>
        {manualBarcode && (
          <button onClick={() => onBarcodeScanned(manualBarcode.trim())}
            className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black rounded-lg">
            ค้น →
          </button>
        )}
      </div>

      {/* History today */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-50">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
            <History size={14} className="text-indigo-500"/>
          </div>
          <p className="font-black text-sm text-slate-800">ยอดวันนี้</p>
          <span className="text-[10px] bg-indigo-100 text-indigo-700 font-black px-2 py-0.5 rounded-full">{history.length} รายการ</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Loader2 size={20} className="animate-spin mx-auto mb-1 text-indigo-400"/>
            กำลังโหลด...
          </div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            <Package size={24} className="mx-auto mb-2 text-slate-300"/>
            ยังไม่มีการขาย — เริ่มสแกน barcode เลย
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {history.map(s => (
              <div key={s.id} className="px-4 py-3 hover:bg-slate-50 flex items-center gap-3">
                {s.proof_photo_url ? (
                  <a href={s.proof_photo_url} target="_blank" rel="noopener"
                    className="w-10 h-10 rounded-xl ring-2 ring-emerald-300 overflow-hidden flex-shrink-0 hover:scale-110 transition-transform shadow-sm">
                    <img src={s.proof_photo_url} alt="" className="w-full h-full object-cover"/>
                  </a>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 text-white flex items-center justify-center flex-shrink-0">
                    <Package size={14}/>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{s.product_name}</p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {s.brand && `${s.brand} · `}
                    {s.sn && `SN: ${s.sn} · `}
                    {s.order_number && `#${s.order_number} · `}
                    {format(new Date(s.sold_at), "HH:mm", { locale: th })}
                    {s.proof_photo_url && <span className="ml-1 text-emerald-600">📸</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-black text-emerald-700">฿{Number(s.sold_price).toLocaleString()}</p>
                  {(s.qty || 1) > 1 && <p className="text-[9px] text-slate-400">x{s.qty}</p>}
                </div>
                <button onClick={() => deleteSale(s.id)}
                  className="p-1.5 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded">
                  <Trash2 size={12}/>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barcode scanner modal */}
      {scannerOpen && (
        <ScannerModal
          purpose={scannerOpen}
          onScan={(code) => onBarcodeScanned(code, scannerOpen)}
          onMultiScan={(scannerOpen === "barcode" && !activeProduct) ? onMultiScanned : undefined}
          onClose={() => setScannerOpen(null)}
        />
      )}

      {/* Search/Manual modal */}
      {searchOpen && <SearchModal onPick={(p) => { setSearchOpen(false); setActiveProduct(p); setForm(f => ({ ...f, sold_price: p.default_price ? String(p.default_price) : "", sn: "", order_number: "", qty: "1", note: "" })) }} onClose={() => setSearchOpen(false)}/>}

      {/* Product entry modal */}
      {activeProduct && (
        <EntryModal
          product={activeProduct}
          form={form}
          setForm={setForm}
          onSubmit={submitSale}
          onClose={resetForm}
          submitting={submitting}
          onScanSn={() => setScannerOpen("sn")}
          onScanOrder={() => setScannerOpen("order")}
          onScanBarcode={() => setScannerOpen("barcode")}
          proofPhoto={proofPhoto}
          proofPreviewUrl={proofPreviewUrl}
          onOpenPhoto={() => setPhotoCaptureOpen(true)}
          onRemovePhoto={() => {
            if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl)
            setProofPhoto(null); setProofPreviewUrl(null)
          }}
        />
      )}

      {/* Photo capture modal */}
      <PhotoCapture
        open={photoCaptureOpen}
        onClose={() => setPhotoCaptureOpen(false)}
        onCapture={(file) => {
          if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl)
          setProofPhoto(file)
          setProofPreviewUrl(URL.createObjectURL(file))
        }}
      />
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// Stat — small KPI for header
// ════════════════════════════════════════════════════════════════════
function Stat({ label, value, sub }: any) {
  return (
    <div className="bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
      <p className="text-[9px] font-bold uppercase opacity-80">{label}</p>
      <p className="text-lg font-black leading-none mt-0.5">{value}</p>
      <p className="text-[9px] opacity-70 mt-0.5">{sub}</p>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// ScannerModal — Smart camera scanner (รองรับ 1D barcode + QR + Data Matrix)
// ════════════════════════════════════════════════════════════════════
const PURPOSE_LABEL: Record<ScanPurpose, {
  title: string; hint: string; color: string;
  // ── pre-defined Tailwind classes (JIT-safe) ──
  cornerClass: string; auraClass: string; pulseDotClass: string;
}> = {
  barcode: {
    title: "สแกน Barcode สินค้า",
    hint: "เล็งบาร์โค้ดสินค้า / QR — ใช้ค้นหาสินค้าใน DB",
    color: "from-indigo-500 to-purple-600",
    cornerClass: "text-indigo-400 border-indigo-400",
    auraClass: "border-indigo-400/40",
    pulseDotClass: "bg-indigo-400",
  },
  sn: {
    title: "สแกน Serial Number",
    hint: "เล็งบาร์โค้ดที่ขึ้นต้นด้วย SN: หรือเป็นตัวเลข/ตัวอักษรใต้บาร์โค้ด",
    color: "from-emerald-500 to-teal-600",
    cornerClass: "text-emerald-400 border-emerald-400",
    auraClass: "border-emerald-400/40",
    pulseDotClass: "bg-emerald-400",
  },
  order: {
    title: "สแกนเลข Order",
    hint: "เล็งบาร์โค้ดบนใบสั่งซื้อ / ใบส่งของ",
    color: "from-amber-500 to-orange-600",
    cornerClass: "text-amber-400 border-amber-400",
    auraClass: "border-amber-400/40",
    pulseDotClass: "bg-amber-400",
  },
}

// ── beep + vibrate ──
function playFeedback() {
  if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([60, 30, 60])
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const o = ctx.createOscillator(); const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.frequency.value = 880; g.gain.value = 0.15
    o.start(); o.stop(ctx.currentTime + 0.08)
  } catch {}
}

// ── Detected item ──
type Detected = {
  value: string
  type: "barcode" | "sn" | "order"
  format?: string
  product?: any | null  // ผล lookup จาก /api/products
  reason?: string       // ทำไม classifier เลือก type นี้
  confidence?: number   // 0-100
  at: number
}

function ScannerModal({ purpose, onScan, onMultiScan, onClose }: {
  purpose: ScanPurpose
  onScan: (code: string) => void
  onMultiScan?: (codes: { barcode?: string; sn?: string; order?: string; product?: any | null }) => void
  onClose: () => void
}) {
  const continuous = purpose === "barcode" && !!onMultiScan
  const containerRef = useRef<HTMLDivElement>(null)
  const scannerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSeen, setLastSeen] = useState<{ value: string; format?: string } | null>(null)
  const [torch, setTorch] = useState(false)
  const [detected, setDetected] = useState<Detected[]>([])
  const meta = PURPOSE_LABEL[purpose]
  const detectedRef = useRef<Detected[]>([])
  useEffect(() => { detectedRef.current = detected }, [detected])

  // ── ใช้ instance สดของ html5-qrcode ── อย่าให้ callback กลายเป็น stale closure
  const onScanRef = useRef(onScan)
  useEffect(() => { onScanRef.current = onScan }, [onScan])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const fallbackRef = useRef<any>(null)
  const firedRef = useRef(false)
  const [engine, setEngine] = useState<"native" | "fallback" | "starting">("starting")

  // ── AI fallback states ──
  const [aiState, setAiState] = useState<"idle" | "countdown" | "scanning" | "done" | "failed">("idle")
  const [aiCountdown, setAiCountdown] = useState(10)
  const aiTriggeredRef = useRef(false)

  // ── AI: capture video frame + ส่งให้ Claude อ่าน ──
  const triggerAIScan = async () => {
    if (aiTriggeredRef.current) return
    aiTriggeredRef.current = true
    setAiState("scanning")

    const video = videoRef.current ||
      (containerRef.current?.querySelector("video") as HTMLVideoElement | null)
    if (!video || video.videoWidth === 0) {
      setAiState("failed")
      return
    }
    try {
      // ── Capture frame เป็น canvas → resize → JPEG blob ──
      const canvas = document.createElement("canvas")
      const sw = video.videoWidth
      const sh = video.videoHeight
      const maxDim = 1280
      const ratio = Math.min(maxDim / sw, maxDim / sh, 1)
      canvas.width  = Math.round(sw * ratio)
      canvas.height = Math.round(sh * ratio)
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("no canvas ctx")
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const blob: Blob = await new Promise((r, j) => canvas.toBlob(b => b ? r(b) : j(new Error("blob fail")), "image/jpeg", 0.85)!)

      const fd = new FormData()
      fd.append("image", new File([blob], "frame.jpg", { type: "image/jpeg" }))
      const res = await fetch("/api/products/sales/ai-scan", { method: "POST", body: fd })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || "AI failed")

      // ── Inject AI-found codes ผ่าน handleDetected (จะ classify + dedupe ให้) ──
      let added = 0
      for (const bc of (d.barcodes || [])) { handleDetected(`BC:${bc}`); added++ }
      for (const sn of (d.serials || []))  { handleDetected(`SN:${sn}`); added++ }
      for (const od of (d.orders || []))   { handleDetected(`ORD:${od}`); added++ }
      setAiState(added > 0 ? "done" : "failed")
      if (added === 0) {
        toast("AI ไม่เห็นรหัสอะไรเลย ลองถือใหม่", { icon: "🤖" })
        // อนุญาตให้ลองใหม่
        setTimeout(() => { aiTriggeredRef.current = false; setAiState("idle"); setAiCountdown(10) }, 3000)
      } else {
        toast.success(`🤖 AI อ่านได้ ${added} รหัส!`)
      }
    } catch (e: any) {
      setAiState("failed")
      toast.error("AI ผิดพลาด: " + (e?.message || ""))
      setTimeout(() => { aiTriggeredRef.current = false; setAiState("idle"); setAiCountdown(10) }, 3000)
    }
  }

  // ── Countdown 10s: ถ้ายังไม่เจออะไร → trigger AI ──
  useEffect(() => {
    if (!continuous) return
    if (detected.length > 0) {
      // มีของแล้ว ไม่ต้อง AI
      setAiState("idle"); setAiCountdown(10); aiTriggeredRef.current = false
      return
    }
    if (engine === "starting") return
    if (aiState !== "idle" && aiState !== "countdown") return

    setAiState("countdown")
    let cnt = 10
    setAiCountdown(cnt)
    const iv = setInterval(() => {
      cnt -= 1
      setAiCountdown(cnt)
      if (cnt <= 0) {
        clearInterval(iv)
        triggerAIScan()
      }
    }, 1000)
    return () => clearInterval(iv)
  }, [continuous, engine, detected.length])

  // ── unified handler ──
  const handleDetected = async (decoded: string, fmt?: string) => {
    const clean = cleanDecoded(decoded)
    if (!clean) return

    // Single-shot mode (sn / order purpose)
    if (!continuous) {
      if (firedRef.current) return
      firedRef.current = true
      setLastSeen({ value: decoded, format: fmt })
      playFeedback()
      setTimeout(() => { onScanRef.current(decoded) }, 220)
      return
    }

    // Continuous mode (barcode purpose) — smart classify
    if (detectedRef.current.find(d => d.value === clean)) return

    playFeedback()
    setLastSeen({ value: decoded, format: fmt })
    setTimeout(() => setLastSeen(prev => prev?.value === decoded ? null : prev), 700)

    const cls = await classifyCode(decoded, fmt)
    const item: Detected = {
      value: clean, type: cls.type, format: fmt,
      product: cls.product ?? null,
      reason: cls.reason, confidence: cls.confidence,
      at: Date.now(),
    }
    setDetected(prev => prev.find(d => d.value === clean) ? prev : [...prev, item])
  }

  // ── Step 1: ตรวจ engine ที่จะใช้ ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (typeof window === "undefined") return
      if ("BarcodeDetector" in window) {
        try {
          const BD = (window as any).BarcodeDetector
          const formats = await BD.getSupportedFormats()
          if (cancelled) return
          if (formats && formats.length > 0) { setEngine("native"); return }
        } catch {}
      }
      if (!cancelled) setEngine("fallback")
    })()
    return () => { cancelled = true }
  }, [])

  // ── Step 2: เริ่มทำงานตาม engine ──
  useEffect(() => {
    if (engine === "starting") return
    let cancelled = false

    const startNative = async () => {
      try {
        const BD = (window as any).BarcodeDetector
        const supportedFormats: string[] = await BD.getSupportedFormats()
        const wanted = ["code_128", "code_39", "code_93", "ean_13", "ean_8", "upc_a", "upc_e", "itf", "codabar", "qr_code", "data_matrix", "pdf417", "aztec"]
        const formats = wanted.filter(f => supportedFormats.includes(f))
        const detector = new BD({ formats })

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1920 },
            height: { ideal: 1080 },
            // @ts-ignore
            focusMode: "continuous",
          },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream

        const video = videoRef.current
        if (!video) { setError("video element not ready"); return }
        video.srcObject = stream
        await video.play().catch(() => {})

        // Detect loop ~14fps
        let lastTs = 0
        const loop = async (ts: number) => {
          if (cancelled) return
          if (ts - lastTs > 70) {
            lastTs = ts
            try {
              const codes: Array<{ rawValue: string; format: string }> = await detector.detect(video)
              for (const c of codes) handleDetected(c.rawValue, c.format)
            } catch {}
          }
          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch (e: any) {
        console.warn("Native scanner failed:", e?.message)
        // fallback หาก native ล้มเหลว
        if (!cancelled) setEngine("fallback")
      }
    }

    const startFallback = async () => {
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
        if (cancelled || !containerRef.current) return

        // รอให้ container มี dimensions
        await new Promise(r => setTimeout(r, 80))
        if (cancelled || !containerRef.current) return

        const formats = [
          Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.DATA_MATRIX,
          Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39, Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF, Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.PDF_417, Html5QrcodeSupportedFormats.AZTEC,
        ]
        const scanner = new Html5Qrcode("barcode-scanner-region", { formatsToSupport: formats, verbose: false } as any)
        fallbackRef.current = scanner

        const qrbox = (vw: number, vh: number) => ({
          width: Math.max(150, Math.floor(vw * 0.94)),
          height: Math.max(150, Math.floor(vh * 0.80)),
        })

        await scanner.start(
          { facingMode: { ideal: "environment" } },
          {
            fps: 20, qrbox, aspectRatio: 1, disableFlip: false,
            videoConstraints: {
              facingMode: { ideal: "environment" },
              width:  { ideal: 1920 },
              height: { ideal: 1080 },
              // @ts-ignore
              focusMode: "continuous",
            },
            experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          } as any,
          (decoded: string, result: any) => handleDetected(decoded, result?.result?.format?.formatName),
          () => {}
        )
      } catch (e: any) {
        console.error("Fallback scanner failed:", e)
        if (!cancelled) setError(e?.message || "เปิดกล้องไม่ได้ — โปรดอนุญาตการเข้าถึงกล้อง")
      }
    }

    if (engine === "native") startNative()
    else if (engine === "fallback") startFallback()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
        streamRef.current = null
      }
      if (fallbackRef.current) {
        try { fallbackRef.current.stop().catch(() => {}) } catch {}
        try { fallbackRef.current.clear?.() } catch {}
        fallbackRef.current = null
      }
    }
  }, [engine])

  // ── Torch toggle (รองรับทั้ง native stream + html5-qrcode) ──
  const toggleTorch = async () => {
    try {
      if (engine === "native" && streamRef.current) {
        const track = streamRef.current.getVideoTracks()[0]
        await track.applyConstraints({ advanced: [{ torch: !torch }] } as any)
      } else if (fallbackRef.current) {
        await fallbackRef.current.applyVideoConstraints({ advanced: [{ torch: !torch }] } as any)
      } else return
      setTorch(!torch)
    } catch {
      toast("อุปกรณ์ไม่รองรับไฟฉาย", { icon: "🔦" })
    }
  }

  // ── Done — รวบรวมรหัสทั้งหมด ส่งกลับ ──
  const finishMulti = () => {
    if (!onMultiScan) return
    const barcode = detected.find(d => d.type === "barcode")
    const sn = detected.find(d => d.type === "sn")
    const order = detected.find(d => d.type === "order")
    onMultiScan({
      barcode: barcode?.value,
      sn: sn?.value,
      order: order?.value,
      product: barcode?.product,
    })
  }

  const removeDetected = (val: string) => setDetected(prev => prev.filter(d => d.value !== val))
  const reclassify = (val: string, type: "barcode" | "sn" | "order") =>
    setDetected(prev => prev.map(d => d.value === val ? { ...d, type } : d))

  const hasBarcode = detected.some(d => d.type === "barcode")
  const hasSn = detected.some(d => d.type === "sn")

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 backdrop-blur-sm flex flex-col"
      style={{ height: "100dvh", maxHeight: "100dvh" }}>

      {/* ── Header (safe-area top) ── */}
      <div className={`flex items-center justify-between px-3 py-2.5 bg-gradient-to-r ${meta.color} text-white shadow flex-shrink-0`}
        style={{ paddingTop: `max(env(safe-area-inset-top), 10px)` }}>
        <p className="font-black flex items-center gap-1.5 text-sm truncate min-w-0">
          <Camera size={14} className="flex-shrink-0"/>
          <span className="truncate">{meta.title}{continuous && " · ต่อเนื่อง"}</span>
        </p>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={toggleTorch}
            className={"px-2 py-1 rounded-lg text-[10px] font-black transition-colors " + (torch ? "bg-yellow-300 text-amber-900" : "bg-white/15 hover:bg-white/25")}>
            🔦
          </button>
          <button onClick={onClose} className="p-1.5 hover:bg-white/15 rounded-lg"><X size={16}/></button>
        </div>
      </div>

      {/* ── Main area — flex column ที่ปรับอัตราเอง ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

        {/* Scanner box — กินพื้นที่ส่วนใหญ่ */}
        <div className="flex-1 flex items-center justify-center min-h-0 p-2 sm:p-3">
          <div className="relative w-full max-w-md mx-auto h-full flex items-center justify-center">
            <div className="relative w-full"
              style={{ aspectRatio: "4 / 5", maxHeight: "100%", maxWidth: "100%" }}>
              <div ref={containerRef} id="barcode-scanner-region"
                className="absolute inset-0 bg-black rounded-2xl overflow-hidden border-2 border-white/20"
                style={{ minHeight: 240 }}>
                {/* Video element สำหรับ native engine (html5-qrcode จะใส่ video เอง) */}
                {engine === "native" && (
                  <video ref={videoRef} playsInline muted autoPlay
                    className="absolute inset-0 w-full h-full object-cover"/>
                )}
              </div>

              {/* ─── Scanning overlay ─── */}
              {!lastSeen && !error && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/30 rounded-2xl"/>
                  <div className="relative w-[85%] aspect-[16/9] max-h-[60%]">
                    <div className={`absolute -inset-1 rounded-2xl border-2 ${meta.auraClass} animate-[scanAura_2s_ease-in-out_infinite]`}/>
                    <div className="absolute inset-0 rounded-xl border border-white/20 backdrop-blur-[1px]"/>
                    <div className="absolute inset-x-2 top-0 bottom-0 overflow-hidden">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_18px_4px_rgba(244,63,94,0.7)] animate-[scanLine_2.6s_ease-in-out_infinite]"/>
                    </div>
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div className="absolute -inset-y-2 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 animate-[scanShine_3s_ease-in-out_infinite]"/>
                    </div>
                    <span className={`absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] ${meta.cornerClass} rounded-tl-xl animate-[cornerPulse_1.4s_ease-in-out_infinite]`}/>
                    <span className={`absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] ${meta.cornerClass} rounded-tr-xl animate-[cornerPulse_1.4s_ease-in-out_0.2s_infinite]`}/>
                    <span className={`absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] ${meta.cornerClass} rounded-bl-xl animate-[cornerPulse_1.4s_ease-in-out_0.4s_infinite]`}/>
                    <span className={`absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] ${meta.cornerClass} rounded-br-xl animate-[cornerPulse_1.4s_ease-in-out_0.6s_infinite]`}/>
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-white/90 text-[9px] font-black tracking-widest uppercase whitespace-nowrap">
                      <span className={`w-1.5 h-1.5 rounded-full ${meta.pulseDotClass} animate-pulse`}/>
                      <span className="animate-[scanBlink_1.2s_ease-in-out_infinite]">Scanning</span>
                      <span className="inline-flex gap-0.5">
                        <span className="animate-[scanDot_1.4s_ease-in-out_infinite]">.</span>
                        <span className="animate-[scanDot_1.4s_ease-in-out_0.2s_infinite]">.</span>
                        <span className="animate-[scanDot_1.4s_ease-in-out_0.4s_infinite]">.</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* ─── Success state ─── */}
              {lastSeen && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-emerald-400/40 backdrop-blur-sm animate-[successBurst_0.6s_ease-out]"/>
                  <div className="absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-emerald-300/60 animate-[ringExpand_0.7s_ease-out]"/>
                  <div className="absolute w-32 h-32 sm:w-48 sm:h-48 rounded-full border-4 border-white/40 animate-[ringExpand_0.9s_ease-out_0.1s]"/>
                  <div className="bg-white rounded-2xl px-4 py-3 sm:px-6 sm:py-5 shadow-2xl text-center scale-0 animate-[popIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)_forwards] relative z-10 max-w-[80%]">
                    <div className="w-10 h-10 sm:w-14 sm:h-14 mx-auto rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white flex items-center justify-center mb-1.5 shadow-lg ring-4 ring-emerald-200/50">
                      <Check size={22} strokeWidth={3}/>
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-wider">{lastSeen.format || "Detected"}</p>
                    <p className="text-xs sm:text-sm font-black text-slate-800 font-mono mt-0.5 break-all">{cleanDecoded(lastSeen.value)}</p>
                  </div>
                </div>
              )}

              {/* ─── AI overlay states ─── */}
              {continuous && aiState === "scanning" && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden bg-black/50 backdrop-blur-sm">
                  <div className="bg-white/95 rounded-2xl px-5 py-4 shadow-2xl text-center max-w-[80%] animate-[popIn_0.3s_ease-out_forwards]">
                    <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center shadow-lg ring-4 ring-purple-200/50 mb-2 animate-pulse">
                      <span className="text-xl">🤖</span>
                    </div>
                    <p className="text-xs font-black text-purple-700">AI กำลังอ่านรูป...</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">Claude Vision ดูฉลากให้</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom info area — error / detected list / hint */}
        <div className="flex-shrink-0 px-3 pb-2 space-y-2 max-h-[42vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-500/20 border border-rose-500/40 rounded-xl p-2.5 text-rose-100 text-xs text-center">
              <AlertCircle size={13} className="inline mr-1"/> {error}
              <p className="text-[10px] mt-0.5 opacity-80">โปรดอนุญาตการเข้าถึงกล้อง</p>
            </div>
          )}

          {continuous && detected.length > 0 && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/80">
                  ✓ ตรวจเจอ {detected.length} รหัส
                </p>
                <div className="flex gap-1 text-[9px]">
                  {hasBarcode && <span className="bg-indigo-500/40 text-indigo-100 px-1.5 py-0.5 rounded-full font-black">📦 BC</span>}
                  {hasSn && <span className="bg-emerald-500/40 text-emerald-100 px-1.5 py-0.5 rounded-full font-black">🔢 SN</span>}
                </div>
              </div>
              <div className="space-y-1">
                {detected.map(d => (
                  <DetectedRow key={d.value} item={d} onRemove={() => removeDetected(d.value)} onReclassify={(t: "barcode" | "sn" | "order") => reclassify(d.value, t)}/>
                ))}
              </div>
            </div>
          )}

          <div className="text-center text-white/70 text-[10px] leading-tight">
            <p className="flex items-center justify-center gap-1.5 flex-wrap">
              <span className="opacity-70">QR · Code128 · EAN · UPC · DataMatrix · Code39 · ITF · PDF417</span>
              {engine === "native" && (
                <span className="text-emerald-300 font-black bg-emerald-500/20 px-1.5 py-0.5 rounded-full text-[9px]">⚡ Multi</span>
              )}
            </p>
            {continuous && detected.length === 0 && aiState === "countdown" && aiCountdown > 0 && (
              <div className="mt-1.5 flex items-center justify-center gap-2">
                <p className="text-purple-200 text-[10px] flex items-center gap-1">
                  <span>🤖</span>
                  <span>AI จะอ่านรูปใน <b className="text-white tabular-nums">{aiCountdown}s</b></span>
                </p>
                <button onClick={triggerAIScan}
                  className="px-2 py-0.5 bg-purple-500 hover:bg-purple-600 text-white text-[10px] font-black rounded-full">
                  ใช้เลย
                </button>
              </div>
            )}
            {continuous && detected.length === 0 && aiState !== "countdown" && (
              <p className="mt-1 text-indigo-200 text-[10px]">
                {engine === "native"
                  ? "💡 จับ barcode + SN พร้อมกันได้ในรอบเดียว"
                  : "💡 เลื่อนกล้องเล็กๆ ผ่านแต่ละรหัส"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── Bottom action bar (continuous) ─── */}
      {continuous && (
        <div className="px-3 py-2.5 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center gap-2 flex-shrink-0"
          style={{ paddingBottom: `max(env(safe-area-inset-bottom), 10px)` }}>
          <button onClick={onClose}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl flex-shrink-0">
            ยกเลิก
          </button>
          <button onClick={finishMulti} disabled={detected.length === 0}
            className={"flex-1 py-2.5 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow transition-all " +
              (detected.length === 0
                ? "bg-white/10 cursor-not-allowed text-white/40"
                : hasBarcode && hasSn
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 animate-[readyPulse_1.2s_ease-in-out_infinite]"
                : "bg-gradient-to-r from-indigo-500 to-purple-600")}>
            <Check size={14}/>
            {detected.length === 0
              ? "ยังไม่มีรหัส"
              : hasBarcode && hasSn
              ? `✨ พร้อมแล้ว — เสร็จ`
              : `เสร็จ (${detected.length} รหัส)`}
          </button>
        </div>
      )}

      {/* Inject scanning animations */}
      <style jsx global>{`
        @keyframes scanLine {
          0%   { top: 0%;    opacity: 0; }
          10%  { opacity: 1; }
          50%  { top: 100%;  opacity: 1; }
          60%  { opacity: 0; }
          100% { top: 0%;    opacity: 0; }
        }
        @keyframes scanAura {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.9; transform: scale(1.015); }
        }
        @keyframes scanShine {
          0%   { transform: translateX(0%)   skewX(12deg); opacity: 0; }
          20%  { opacity: 0.8; }
          100% { transform: translateX(420%) skewX(12deg); opacity: 0; }
        }
        @keyframes cornerPulse {
          0%, 100% { opacity: 0.55; filter: drop-shadow(0 0 0 currentColor); }
          50%      { opacity: 1;    filter: drop-shadow(0 0 6px currentColor); }
        }
        @keyframes scanBlink {
          0%, 100% { opacity: 0.6; }
          50%      { opacity: 1; }
        }
        @keyframes scanDot {
          0%, 100% { opacity: 0.2; }
          50%      { opacity: 1; }
        }
        @keyframes successBurst {
          0%   { opacity: 0; }
          30%  { opacity: 1; }
          100% { opacity: 0.5; }
        }
        @keyframes ringExpand {
          0%   { transform: scale(0); opacity: 1; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes popIn {
          0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
          100% { transform: scale(1) rotate(0deg);   opacity: 1; }
        }
        @keyframes readyPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.5); }
          50%      { box-shadow: 0 0 0 8px rgba(16,185,129,0); }
        }
      `}</style>
    </div>
  )
}

// ─── DetectedRow: แสดงรหัสที่ตรวจเจอใน continuous mode ───
function DetectedRow({ item, onRemove, onReclassify }: any) {
  const typeMeta: any = {
    barcode: { icon: "📦", label: "Barcode", color: "bg-indigo-500/30 text-indigo-100 border-indigo-400/30" },
    sn:      { icon: "🔢", label: "SN",      color: "bg-emerald-500/30 text-emerald-100 border-emerald-400/30" },
    order:   { icon: "📋", label: "Order",   color: "bg-amber-500/30 text-amber-100 border-amber-400/30" },
  }
  const m = typeMeta[item.type]
  return (
    <div className={`relative rounded-lg border ${m.color} px-2 py-1.5 flex items-center gap-1.5`}>
      <span className="text-sm flex-shrink-0">{m.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-mono font-bold text-white truncate">{item.value}</p>
        {item.type === "barcode" && item.product && (
          <p className="text-[9px] text-white/70 truncate">✓ {item.product.name}</p>
        )}
        {item.type === "barcode" && !item.product && (
          <p className="text-[9px] text-amber-200/80">⚠ ไม่พบใน DB</p>
        )}
        {item.reason && !item.product && (
          <p className="text-[8px] text-white/50 truncate">
            {item.confidence != null && `${item.confidence}% · `}{item.reason}
          </p>
        )}
      </div>
      <select value={item.type} onChange={e => onReclassify(e.target.value)}
        className="bg-black/30 border border-white/20 rounded px-1 py-0.5 text-[9px] font-bold text-white outline-none flex-shrink-0">
        <option value="barcode">BC</option>
        <option value="sn">SN</option>
        <option value="order">ORD</option>
      </select>
      <button onClick={onRemove} className="p-0.5 hover:bg-white/20 rounded text-white/70 hover:text-white flex-shrink-0">
        <X size={11}/>
      </button>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// SearchModal — ค้นหาสินค้าหรือเริ่มกรอกเอง
// ════════════════════════════════════════════════════════════════════
function SearchModal({ onPick, onClose }: { onPick: (p: any) => void; onClose: () => void }) {
  const [q, setQ] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=20`)
        const d = await res.json()
        setResults(d.products ?? [])
      } finally { setLoading(false) }
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2"><Search size={16}/> ค้นหาสินค้า</p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>
        <div className="p-3 border-b border-slate-100">
          <input value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder="พิมพ์ชื่อสินค้า / barcode / brand..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-amber-400"/>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">กำลังค้นหา...</div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              {q.length < 2 ? "พิมพ์อย่างน้อย 2 ตัวอักษร" : "ไม่พบสินค้า — ลองกรอกเองด้านล่าง ↓"}
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {results.map(p => (
                <button key={p.id} onClick={() => onPick(p)}
                  className="w-full text-left p-3 hover:bg-amber-50/40 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center flex-shrink-0">
                    <Package size={14}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{p.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">
                      {p.brand && `${p.brand} · `}
                      {p.barcode && `${p.barcode}`}
                      {p.sn_required && <span className="ml-1 text-rose-500">· SN required</span>}
                    </p>
                  </div>
                  {p.default_price && <p className="text-xs font-black text-emerald-700 flex-shrink-0">฿{Number(p.default_price).toLocaleString()}</p>}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-slate-100">
          <button onClick={() => onPick({ __unknown: true, barcode: null })}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl">
            ➕ กรอกสินค้าใหม่เอง (ไม่อยู่ใน DB)
          </button>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════
// EntryModal — แสดงรายละเอียดสินค้า + ฟอร์มกรอกราคา/SN/Order
// ════════════════════════════════════════════════════════════════════
function EntryModal({ product, form, setForm, onSubmit, onClose, submitting, onScanSn, onScanOrder, onScanBarcode, proofPhoto, proofPreviewUrl, onOpenPhoto, onRemovePhoto }: any) {
  const isUnknown = product.__unknown
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between">
          <p className="font-black flex items-center gap-2"><Check size={16}/> บันทึกการขาย</p>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded"><X size={18}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Product display */}
          {isUnknown ? (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
              <p className="text-[10px] font-black text-amber-700 uppercase mb-2 flex items-center gap-1">
                <AlertCircle size={11}/> สินค้าใหม่ — กรอกข้อมูล
              </p>
              <label className="block">
                <span className="text-[10px] font-bold text-slate-500">ชื่อสินค้า *</span>
                <input value={form.manual_name} onChange={e => setForm((f: any) => ({ ...f, manual_name: e.target.value }))}
                  placeholder="เช่น DDPAI X5 Pro"
                  className="w-full mt-0.5 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400" required/>
              </label>
              <label className="block mt-2">
                <span className="text-[10px] font-bold text-slate-500">แบรนด์ (ไม่บังคับ)</span>
                <input value={form.manual_brand} onChange={e => setForm((f: any) => ({ ...f, manual_brand: e.target.value }))}
                  placeholder="เช่น DDPAI"
                  className="w-full mt-0.5 bg-white border border-amber-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-amber-400"/>
              </label>
              {product.barcode && (
                <p className="text-[10px] text-slate-500 mt-2"><Hash size={10} className="inline"/> Barcode: <b>{product.barcode}</b></p>
              )}
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border-2 border-indigo-200 rounded-xl p-3 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-white to-indigo-50 ring-2 ring-indigo-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover"/>
                    : <Package size={28} className="text-indigo-300"/>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-slate-800 leading-tight">{product.name}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {product.brand && (
                      <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{product.brand}</span>
                    )}
                    {product.model && (
                      <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full font-mono">{product.model}</span>
                    )}
                    {product.color && (
                      <span className="text-[9px] font-black bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded-full">{product.color}</span>
                    )}
                    {product.category && (
                      <span className="text-[9px] font-black bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">{product.category}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono mt-1.5">
                    <Hash size={9} className="inline"/> {product.barcode}
                    {product.warranty && <span className="ml-2 text-emerald-600">· รับประกัน {product.warranty}</span>}
                  </p>
                  {product.sn_required && (
                    <span className="inline-block mt-1 text-[9px] font-black bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">⚠ ต้องระบุ SN</span>
                  )}
                </div>
                {product.default_price && (
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[9px] text-slate-400 uppercase font-bold">ราคา default</p>
                    <p className="text-sm font-black text-emerald-700">฿{Number(product.default_price).toLocaleString()}</p>
                  </div>
                )}
              </div>
              {/* Specs grid */}
              {product.specs && Object.keys(product.specs).length > 0 && (
                <details className="mt-2.5 pt-2 border-t border-indigo-200/60">
                  <summary className="text-[10px] font-black text-indigo-600 cursor-pointer hover:text-indigo-700">📋 ดู specs ({Object.keys(product.specs).length} รายการ)</summary>
                  <div className="grid grid-cols-2 gap-1 mt-2 text-[10px]">
                    {Object.entries(product.specs).map(([k, v]: any) => (
                      <p key={k} className="leading-tight"><span className="text-slate-400 capitalize">{k.replace(/_/g, " ")}:</span> <b className="text-slate-700">{String(v).slice(0, 50)}</b></p>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* Barcode — แสดง+แก้ได้เสมอ */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Hash size={11} className="text-indigo-500"/> Barcode สินค้า
              </span>
              {form.barcode && <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">✓ มี Barcode</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <input value={form.barcode}
                onChange={e => setForm((f: any) => ({ ...f, barcode: e.target.value }))}
                placeholder="กรอกหรือสแกน barcode"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 font-mono"/>
              {onScanBarcode && (
                <button type="button" onClick={onScanBarcode}
                  className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-black rounded-lg flex items-center gap-1 shadow-sm">
                  <Camera size={12}/> สแกน
                </button>
              )}
            </div>
          </div>

          {/* Price (required) */}
          <label className="block">
            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
              <CircleDollarSign size={11} className="text-emerald-500"/> ราคาขาย * (บาท)
            </span>
            <input type="number" inputMode="decimal" value={form.sold_price}
              onChange={e => setForm((f: any) => ({ ...f, sold_price: e.target.value }))}
              placeholder="เช่น 4990"
              className="w-full mt-1 bg-white border-2 border-emerald-200 rounded-xl px-4 py-3 text-2xl font-black text-emerald-700 outline-none focus:border-emerald-500 tabular-nums"/>
          </label>

          {/* Qty */}
          <label className="block">
            <span className="text-[10px] font-black text-slate-500 uppercase">จำนวน (ปกติ 1)</span>
            <input type="number" inputMode="numeric" value={form.qty}
              onChange={e => setForm((f: any) => ({ ...f, qty: e.target.value }))}
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
          </label>

          {/* SN — มีปุ่มสแกน + reminder ถ้ายังไม่มี */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                <Hash size={11}/> Serial Number {product?.sn_required ? <span className="text-rose-500">(จำเป็น)</span> : "(ไม่บังคับ)"}
              </span>
              {form.sn && <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">✓ มี SN</span>}
            </div>
            {!form.sn && !isUnknown && (
              <button type="button" onClick={onScanSn}
                className="mt-1.5 w-full bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-dashed border-emerald-300 hover:border-emerald-500 hover:from-emerald-100 hover:to-teal-100 rounded-xl px-3 py-2.5 flex items-center gap-2 group transition-all">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center shadow flex-shrink-0">
                  <Camera size={14}/>
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs font-black text-emerald-700">💡 มี Serial Number มั้ย?</p>
                  <p className="text-[10px] text-emerald-600/80">แตะเพื่อสแกน SN เพิ่ม — ใช้เก็บประวัติเครื่อง</p>
                </div>
                <ChevronRight size={13} className="text-emerald-500 group-hover:translate-x-0.5 transition"/>
              </button>
            )}
            <div className={"flex items-center gap-1.5 " + (form.sn || isUnknown ? "mt-1" : "mt-2")}>
              <input value={form.sn}
                onChange={e => setForm((f: any) => ({ ...f, sn: e.target.value }))}
                placeholder="กรอกหรือสแกน SN เช่น APVDHMN0F13102572"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 font-mono"/>
              {onScanSn && (
                <button type="button" onClick={onScanSn}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-black rounded-lg flex items-center gap-1 shadow-sm">
                  <Camera size={12}/> สแกน
                </button>
              )}
            </div>
            {form.sn && <p className="text-[9px] text-slate-400 mt-1 font-mono">✓ {form.sn.length} ตัวอักษร</p>}
          </div>

          {/* Order — มีปุ่มสแกน */}
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase">เลขออเดอร์ (ไม่บังคับ)</span>
            <div className="flex items-center gap-1.5 mt-1">
              <input value={form.order_number}
                onChange={e => setForm((f: any) => ({ ...f, order_number: e.target.value }))}
                placeholder="เช่น ORD12345"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"/>
              {onScanOrder && (
                <button type="button" onClick={onScanOrder}
                  className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-black rounded-lg flex items-center gap-1 shadow-sm">
                  <Camera size={12}/> สแกน
                </button>
              )}
            </div>
          </div>

          {/* Note */}
          <label className="block">
            <span className="text-[10px] font-black text-slate-500 uppercase">หมายเหตุ (ไม่บังคับ)</span>
            <textarea value={form.note}
              onChange={e => setForm((f: any) => ({ ...f, note: e.target.value }))}
              rows={2} placeholder="..."
              className="w-full mt-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 resize-none"/>
          </label>

          {/* Proof Photo — optional */}
          <div>
            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
              <ImagePlus size={11} className="text-emerald-500"/> รูปประกอบ (ไม่บังคับ)
            </span>
            {proofPreviewUrl ? (
              <div className="mt-1 relative group rounded-xl overflow-hidden border-2 border-emerald-300 shadow-sm">
                <img src={proofPreviewUrl} alt="proof" className="w-full max-h-64 object-cover"/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"/>
                <div className="absolute bottom-2 right-2 flex gap-1">
                  <button type="button" onClick={onOpenPhoto}
                    className="px-2.5 py-1.5 bg-white/95 hover:bg-white text-slate-700 text-[10px] font-black rounded-lg shadow flex items-center gap-1">
                    <Camera size={11}/> เปลี่ยน
                  </button>
                  <button type="button" onClick={onRemovePhoto}
                    className="px-2.5 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black rounded-lg shadow flex items-center gap-1">
                    <X size={11}/> ลบ
                  </button>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="text-[9px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full shadow">✓ พร้อมแนบ</span>
                </div>
              </div>
            ) : (
              <button type="button" onClick={onOpenPhoto}
                className="mt-1 w-full py-4 bg-gradient-to-br from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border-2 border-dashed border-emerald-300 rounded-xl text-emerald-700 text-xs font-black transition-all hover:scale-[1.01] active:scale-95 flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                  <ImagePlus size={16}/>
                </div>
                <span>เพิ่มรูปประกอบ</span>
                <span className="text-[9px] text-emerald-600/70 font-medium">📸 ถ่าย / 🖼 เลือกจาก gallery</span>
              </button>
            )}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 flex gap-2 bg-slate-50">
          <button onClick={onClose} className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-bold rounded-xl">
            ยกเลิก
          </button>
          <button onClick={onSubmit} disabled={submitting}
            className="flex-1 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-white text-sm font-black rounded-xl flex items-center justify-center gap-1.5 shadow-sm">
            {submitting ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>}
            บันทึก
          </button>
        </div>
      </div>
    </div>
  )
}
