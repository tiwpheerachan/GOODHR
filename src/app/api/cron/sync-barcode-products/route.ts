import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getBigQuery, SERIAL_TABLE } from "@/lib/bigquery"

export const dynamic = "force-dynamic"
export const maxDuration = 120

// ════════════════════════════════════════════════════════════════════
// Sync BigQuery pc.barcode_products → Supabase barcode_products
//   ตารางเล็ก (~323 แถว) → ดึงเต็มทุกรอบ (full refresh) ราคาถูกมาก
//   GET/POST  Authorization: Bearer <CRON_SECRET>   [?dry_run=1]
// ════════════════════════════════════════════════════════════════════

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// คอลัมน์ที่ดึง (mirror pc.barcode_products)
const COLS = [
  "barcode", "sku", "product_name", "brand", "sale_price", "picture_url",
  "sku_type_from_prefix", "alt_skus",
  "canonical_variant_id", "canonical_product_id", "canonical_brand_id",
  "canonical_product_name", "main_product_line", "variant_label",
  "category_l1", "category_l2", "category_leaf", "category_path",
  "canonical_master_status", "jst_category_name", "colour",
]

function barcodeProductsFQ(): string {
  return `\`${SERIAL_TABLE.project}.${SERIAL_TABLE.dataset}.barcode_products\``
}

function cell(v: any): any {
  if (v == null) return null
  if (typeof v === "object") return v.value ?? String(v)   // BQ อาจ wrap บาง type
  return v
}

function mapRow(r: any) {
  const row: any = {}
  for (const c of COLS) {
    const v = cell(r[c])
    if (c === "sale_price") {
      const n = v == null || v === "" ? null : Number(v)
      row[c] = Number.isFinite(n as number) ? n : null
    } else {
      row[c] = v == null || v === "" ? null : String(v)
    }
  }
  row.synced_at = new Date().toISOString()
  return row
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const dryRun = req.nextUrl.searchParams.get("dry_run") === "1"

  const bq = getBigQuery()
  const fq = barcodeProductsFQ()

  // ดึงทั้งตาราง (เฉพาะแถวที่มี barcode)
  let rows: any[]
  try {
    const [data] = await bq.query({
      query: `SELECT ${COLS.join(", ")} FROM ${fq} WHERE barcode IS NOT NULL AND TRIM(barcode) != ''`,
      location: "US",
    })
    rows = data
  } catch (e: any) {
    return NextResponse.json({ error: "BigQuery query ล้มเหลว: " + (e?.message || String(e)) }, { status: 500 })
  }

  // dedupe by barcode (last-wins)
  const byBarcode = new Map<string, any>()
  for (const r of rows) {
    const m = mapRow(r)
    const key = String(m.barcode).trim()
    if (key) byBarcode.set(key, m)
  }
  const records = Array.from(byBarcode.values())

  if (dryRun) {
    return NextResponse.json({ success: true, dry_run: true, bq_rows: rows.length, unique_barcodes: records.length, sample: records.slice(0, 3) })
  }

  const svc = createServiceClient()
  let upserted = 0
  for (let i = 0; i < records.length; i += 500) {
    const batch = records.slice(i, i + 500)
    const { error } = await svc.from("barcode_products").upsert(batch, { onConflict: "barcode" })
    if (error) return NextResponse.json({ error: "upsert ล้มเหลว: " + error.message, upserted }, { status: 500 })
    upserted += batch.length
  }

  return NextResponse.json({ success: true, bq_rows: rows.length, unique_barcodes: records.length, upserted })
}

export async function POST(req: NextRequest) { return run(req) }
export async function GET(req: NextRequest) { return run(req) }
