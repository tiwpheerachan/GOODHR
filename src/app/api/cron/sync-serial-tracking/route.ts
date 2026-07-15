import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getBigQuery, serialTableFQ } from "@/lib/bigquery"

export const dynamic = "force-dynamic"
export const maxDuration = 300 // ให้เวลา sync นาน (Render ไม่มี timeout serverless)

// ── ความปลอดภัย: Authorization: Bearer <CRON_SECRET> (fail-closed) ──
function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? ""
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return auth === `Bearer ${secret}`
}

// คอลัมน์ที่ดึงจาก BigQuery (mirror enriched table)
const BQ_COLS = [
  "sku", "product_name", "brand", "serial_number", "barcode",
  "canonical_variant_id", "sku_type", "canonical_product_id", "canonical_brand_id",
  "canonical_product_name", "main_product_line", "variant_label",
  "category_l1", "category_l2", "category_leaf", "category_path",
  "canonical_master_status", "colour", "storage", "ram",
  "sku_type_from_prefix", "jst_shop", "shop_type",
]

const CHUNK = 1000
// ถ้า serial ใหม่มากกว่านี้ (เช่น seed ครั้งแรก) → ดึงเต็มทั้งตารางทีเดียวถูกกว่ายิง IN หลายรอบ
const FETCH_ALL_THRESHOLD = 20000

function mapRow(r: any) {
  const row: any = {}
  for (const c of BQ_COLS) {
    let v = r[c]
    // BigQuery คืน object สำหรับบาง type — แปลงเป็น string
    if (v != null && typeof v === "object") v = v.value ?? String(v)
    row[c] = v == null || v === "" ? null : String(v)
  }
  return row
}

async function run(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const limit = parseInt(sp.get("limit") || "0")            // 0 = ทั้งหมด (จำกัดตอนเทสต์)
  const writeProducts = sp.get("products") === "1"          // upsert เข้า products ด้วย (keyed by sku)
  const dryRun = sp.get("dry_run") === "1"
  // mode=new (default) → ประหยัด: Phase A scan แค่ serial_number → หา serial ใหม่ → ดึงเต็มเฉพาะใหม่
  // mode=full          → ดึงเต็มทั้งตาราง upsert ทับทุกแถว (sync ข้อมูล enriched ที่แก้ไข)
  const mode = sp.get("mode") === "full" ? "full" : "new"

  const svc = createServiceClient()
  const bq = getBigQuery()
  const fq = serialTableFQ()
  const limitSql = limit > 0 ? ` LIMIT ${limit}` : ""

  // helper: ดึงเต็มทั้งตาราง (ใช้กับ mode=full และ seed ครั้งแรก)
  async function fetchAllRows(): Promise<any[]> {
    const sql =
      `SELECT ${BQ_COLS.join(", ")} FROM ${fq} ` +
      `WHERE serial_number IS NOT NULL AND TRIM(serial_number) != ''` + limitSql
    const [data] = await bq.query({ query: sql, location: "US" })
    return data
  }

  let records: any[]           // แถวเต็มที่จะเขียน
  let bqScannedRows = 0        // จำนวนแถวที่อ่านจาก BQ (สำหรับ report)
  let candidateSerials = 0     // serial ทั้งหมดใน BQ (mode=new)
  let newSerials = 0           // serial ใหม่ที่ไม่มีใน Supabase

  try {
    if (mode === "full") {
      // ── FULL: ดึงเต็มทั้งตาราง ──
      const rows = await fetchAllRows()
      bqScannedRows = rows.length
      const bySerial = new Map<string, any>()
      for (const r of rows) {
        const m = mapRow(r)
        const key = String(m.serial_number).trim()
        if (key) bySerial.set(key, m)
      }
      records = Array.from(bySerial.values())
      candidateSerials = records.length
      newSerials = records.length
    } else {
      // ── NEW (2 เฟส): ประหยัด BQ scan ──
      // Phase A: scan แค่คอลัมน์ serial_number (bytes น้อยมาก)
      const [serialRows] = await bq.query({
        query: `SELECT serial_number FROM ${fq} WHERE serial_number IS NOT NULL AND TRIM(serial_number) != ''${limitSql}`,
        location: "US",
      })
      const allSerials = Array.from(new Set(
        serialRows.map((r: any) => String((r.serial_number?.value ?? r.serial_number) ?? "").trim()).filter(Boolean)
      )) as string[]
      candidateSerials = allSerials.length

      // diff กับ Supabase → หา serial ที่ยังไม่มี (เช็คทีละ chunk)
      const missing: string[] = []
      for (let i = 0; i < allSerials.length; i += CHUNK) {
        const batch = allSerials.slice(i, i + CHUNK)
        const { data: existing, error } = await svc
          .from("serial_tracking").select("serial_number").in("serial_number", batch)
        if (error) throw new Error("เช็ค existing ล้มเหลว: " + error.message)
        const have = new Set((existing ?? []).map((e: any) => e.serial_number))
        for (const s of batch) if (!have.has(s)) missing.push(s)
      }
      newSerials = missing.length

      if (missing.length === 0) {
        records = []
      } else if (missing.length > FETCH_ALL_THRESHOLD) {
        // ใหม่เยอะมาก (seed) → ดึงเต็มทีเดียวแล้ว filter เอา (1 full scan ถูกกว่ายิง IN เป็นพันรอบ)
        const rows = await fetchAllRows()
        bqScannedRows = rows.length
        const missingSet = new Set(missing)
        const bySerial = new Map<string, any>()
        for (const r of rows) {
          const m = mapRow(r)
          const key = String(m.serial_number).trim()
          if (key && missingSet.has(key)) bySerial.set(key, m)
        }
        records = Array.from(bySerial.values())
      } else {
        // Phase B: ดึงเต็มเฉพาะ serial ใหม่ (parameterized IN — ยิงเป็น chunk)
        const bySerial = new Map<string, any>()
        for (let i = 0; i < missing.length; i += CHUNK) {
          const batch = missing.slice(i, i + CHUNK)
          const [rows] = await bq.query({
            query: `SELECT ${BQ_COLS.join(", ")} FROM ${fq} WHERE serial_number IN UNNEST(@serials)`,
            params: { serials: batch },
            location: "US",
          })
          bqScannedRows += rows.length
          for (const r of rows) {
            const m = mapRow(r)
            const key = String(m.serial_number).trim()
            if (key) bySerial.set(key, m)
          }
        }
        records = Array.from(bySerial.values())
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: "BigQuery/sync ล้มเหลว: " + (e?.message || String(e)) }, { status: 502 })
  }

  if (dryRun) {
    return NextResponse.json({
      dry_run: true, mode,
      candidate_serials: candidateSerials,
      new_serials: newSerials,
      to_write: records.length,
      sample: records.slice(0, 3),
    })
  }

  // เขียนเข้า serial_tracking (conflict = serial_number)
  let upserted = 0
  const now = new Date().toISOString()
  for (let i = 0; i < records.length; i += CHUNK) {
    const batch = records.slice(i, i + CHUNK).map(r => ({ ...r, synced_at: now }))
    const { error } = await svc.from("serial_tracking").upsert(batch, { onConflict: "serial_number" })
    if (error) return NextResponse.json({ error: "upsert serial_tracking ล้มเหลว: " + error.message, upserted }, { status: 500 })
    upserted += batch.length
  }

  // (ทางเลือก) upsert เข้า products เป็นฐานสินค้า — keyed by sku (ปิด default; ?products=1)
  let productsUpserted = 0
  if (writeProducts) {
    const bySku = new Map<string, any>()
    for (const r of records) {
      const sku = r.sku
      if (!sku || bySku.has(sku)) continue
      bySku.set(sku, {
        barcode: r.barcode || sku,   // ใช้ barcode จริงถ้ามี ไม่งั้น fallback เป็น sku
        name: r.canonical_product_name || r.product_name || sku,
        brand: r.brand || null,
        model: r.main_product_line || null,
        color: r.colour || null,
        sku,
        category: r.category_leaf || r.category_l2 || r.category_l1 || null,
        specs: {
          storage: r.storage, ram: r.ram, variant_label: r.variant_label,
          category_path: r.category_path, source: "serial_tracking_enriched",
        },
      })
    }
    const prodRecords = Array.from(bySku.values())
    for (let i = 0; i < prodRecords.length; i += CHUNK) {
      const batch = prodRecords.slice(i, i + CHUNK)
      const { error } = await svc.from("products").upsert(batch, { onConflict: "barcode" })
      if (error) return NextResponse.json({ error: "upsert products ล้มเหลว: " + error.message, upserted, productsUpserted }, { status: 500 })
      productsUpserted += batch.length
    }
  }

  return NextResponse.json({
    success: true,
    mode,
    candidate_serials: candidateSerials,
    new_serials: newSerials,
    bq_rows_fetched: bqScannedRows,
    serial_tracking_upserted: upserted,
    products_upserted: productsUpserted,
  })
}

export async function POST(req: NextRequest) { return run(req) }
export async function GET(req: NextRequest) { return run(req) }
