#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Import Q2 2026 sales from "Compare By Product (DREAME).xlsx"
//   - Map Excel serial date → ISO date
//   - Look up product_id by barcode
//   - employee_id = null (historical, ไม่รู้คนขาย)
//   - source = 'import', imported_batch = 'q2-2026'
// ════════════════════════════════════════════════════════════════════
const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

const args = process.argv.slice(2).filter(a => !a.startsWith("--"))
const SRC = args[0] || "/Users/tiw/Downloads/Compare By Product (DREAME).xlsx"
const BATCH_ID = "q2-2026"
const DRY = process.argv.includes("--dry")

const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8")
const env = envContent.split("\n").reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.+)$/)
  if (m) a[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "")
  return a
}, {})
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// Excel serial date (days since 1900-01-01, with 1900 leap year bug) → JS Date
function excelSerialToDate(n) {
  if (typeof n !== "number") return null
  // Excel epoch: Dec 30, 1899
  const ms = (n - 25569) * 86400 * 1000
  return new Date(ms)
}

;(async () => {
  console.log("📂 อ่านไฟล์:", SRC)
  const wb = XLSX.readFile(SRC)
  const ws = wb.Sheets["Q2 2026"]
  if (!ws) { console.error("❌ ไม่พบ sheet 'Q2 2026'"); process.exit(1) }
  const data = XLSX.utils.sheet_to_json(ws, { defval: null })
  console.log(`📊 พบ ${data.length} แถว`)

  // ── 1. ดึง products mapping ──
  console.log("🔎 ดึง products → map by barcode...")
  const { data: products } = await sb.from("products").select("id, barcode, name, brand, category, image_url")
  const productByBC = new Map((products ?? []).map(p => [p.barcode, p]))
  console.log(`   มีสินค้าใน DB: ${productByBC.size}`)

  // ── 2. ดึง Data Barcode sheet (master barcode→SKU mapping) ──
  const wsBC = wb.Sheets["Data Barcode"]
  const bcMaster = new Map()
  if (wsBC) {
    const bcData = XLSX.utils.sheet_to_json(wsBC, { defval: null })
    for (const r of bcData) {
      const bc = String(r.Barcode || "").replace(/\D/g, "")
      if (bc) bcMaster.set(bc, {
        sku: r.SKU || null,
        brand: (r.Brand || "").trim() || null,
        category: (r.Category || "").trim() || null,
        color: r.Color || null,
        parent: r["Parent items"] || null,
      })
    }
    console.log(`   Master barcode มี: ${bcMaster.size} รายการ`)
  }

  // ── 3. แปลง rows ──
  // helper: ดึงค่าจาก row โดย trim key (Excel อาจมี space ในชื่อคอลัมน์)
  const getCol = (r, name) => {
    if (r[name] != null) return r[name]
    for (const k of Object.keys(r)) {
      if (k.trim().toLowerCase() === name.toLowerCase()) return r[k]
    }
    return null
  }

  const rows = []
  let missingBC = 0, badDate = 0
  for (const r of data) {
    const barcode = String(getCol(r, "Barcode") || "").replace(/\D/g, "")
    const name = getCol(r, "Product Name")
    if (!barcode || !name) continue

    const date = excelSerialToDate(getCol(r, "Date"))
    if (!date || isNaN(date.getTime())) { badDate++; continue }

    const product = productByBC.get(barcode)
    const master = bcMaster.get(barcode)
    if (!product) missingBC++

    const qty = Number(getCol(r, "Quantity")) || 1
    const total = Number(getCol(r, "Total Sales")) || 0
    const unitPrice = qty > 0 ? total / qty : total

    rows.push({
      // historical → no employee
      employee_id: null,
      company_id: null,
      branch_id: null,
      branch_name: String(getCol(r, "Branch") || "").trim() || null,
      sales_channel: String(getCol(r, "Sales Channel") || "").trim() || null,
      product_id: product?.id || null,
      barcode,
      product_name: String(name).trim(),
      brand: String(getCol(r, "Brand") || master?.brand || "").trim() || null,
      category: String(getCol(r, "Category") || master?.category || "").trim() || null,
      sold_price: unitPrice,
      qty,
      order_number: getCol(r, "Order No.") ? String(getCol(r, "Order No.")) : null,
      sold_at: date.toISOString(),
      source: "import",
      imported_batch: BATCH_ID,
      note: `Imported from Q2 2026 Excel · ${getCol(r, "Month") || ""}`,
    })
  }
  console.log(`✓ พร้อม insert: ${rows.length} แถว`)
  console.log(`  - ไม่พบ barcode ใน products table: ${missingBC} (จะใส่แบบ snapshot อย่างเดียว)`)
  console.log(`  - date ผิด: ${badDate}`)

  if (DRY) {
    console.log("\n🔍 DRY RUN — sample row:")
    console.log(JSON.stringify(rows[0], null, 2))
    return
  }

  // ── 4. ล้าง batch เก่าก่อน (re-import-safe) ──
  console.log(`\n🧹 ลบ batch '${BATCH_ID}' เก่า...`)
  const { error: delErr } = await sb.from("product_sales").delete().eq("imported_batch", BATCH_ID)
  if (delErr) { console.error("❌ delete error:", delErr.message); process.exit(1) }

  // ── 5. Bulk insert (batch 200) ──
  let ok = 0, fail = 0
  for (let i = 0; i < rows.length; i += 200) {
    const slice = rows.slice(i, i + 200)
    const { error, data: inserted } = await sb.from("product_sales").insert(slice).select("id")
    if (error) { console.error(`❌ batch ${i}: ${error.message}`); fail += slice.length }
    else { ok += inserted?.length ?? slice.length; process.stdout.write(`\r  ✓ inserted ${ok}/${rows.length}`) }
  }
  console.log(`\n\n══════════════════════════════════════`)
  console.log(`💾 Inserted: ${ok}/${rows.length}  (fail: ${fail})`)
  console.log(`══════════════════════════════════════`)

  // ── 6. สรุป ──
  const { data: stats } = await sb.from("product_sales")
    .select("id", { count: "exact", head: true }).eq("imported_batch", BATCH_ID)
  console.log(`✓ batch '${BATCH_ID}' ใน DB: ${stats}`)
})()
