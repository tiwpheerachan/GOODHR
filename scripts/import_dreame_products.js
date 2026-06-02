#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Import Dreame products → Supabase
//   1. Upload images → bucket "products"
//   2. Bulk insert into products table
// Pre-req: รัน scripts/extract_dreame_products.js แล้ว
//          + รัน supabase_add_product_specs.sql แล้ว
// ════════════════════════════════════════════════════════════════════
const fs = require("fs")
const path = require("path")
const { createClient } = require("@supabase/supabase-js")

// load env
const envContent = fs.readFileSync(path.join(__dirname, "..", ".env.local"), "utf-8")
const env = envContent.split("\n").reduce((a, l) => {
  const m = l.match(/^([^=]+)=(.+)$/)
  if (m) a[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, "")
  return a
}, {})

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const PRODUCTS_JSON = "/tmp/dreame_products.json"
const IMAGES_DIR    = "/tmp/dreame_images"
const BUCKET        = "products"
const BRAND         = "Dreame"
const DRY_RUN       = process.argv.includes("--dry")

const products = JSON.parse(fs.readFileSync(PRODUCTS_JSON, "utf-8"))
console.log(`📦 จะ import ${products.length} รายการ ${DRY_RUN ? "(DRY RUN)" : ""}`)

// ── 1. สร้าง bucket ถ้ายังไม่มี ──
async function ensureBucket() {
  const { data: buckets } = await sb.storage.listBuckets()
  const exists = buckets?.find(b => b.name === BUCKET)
  if (!exists) {
    console.log(`🪣 สร้าง bucket "${BUCKET}"`)
    const { error } = await sb.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
    })
    if (error) {
      console.error("❌ create bucket error:", error.message)
      process.exit(1)
    }
  } else {
    console.log(`🪣 bucket "${BUCKET}" exists`)
  }
}

// ── 2. Upload image → return public URL ──
async function uploadImage(barcode, localPath) {
  const ext = path.extname(localPath).toLowerCase() || ".jpg"
  const fname = `${barcode}${ext}`
  const buf = fs.readFileSync(localPath)
  const { error } = await sb.storage.from(BUCKET).upload(fname, buf, {
    contentType: ext === ".png" ? "image/png" : "image/jpeg",
    upsert: true,
  })
  if (error) {
    console.error(`  ❌ upload ${fname}: ${error.message}`)
    return null
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(fname)
  return data.publicUrl
}

// ── 3. Build product row จาก raw ──
function buildRow(p) {
  // map ราคา default (ไม่มีในไฟล์ ไว้ให้ admin ตั้งเอง)
  // specs JSON keep everything extra
  const specs = {}
  const keys = ["size", "weight", "box_size", "box_weight", "voltage", "current",
    "charge_time", "battery", "material", "cable_length", "home_app", "what_in_box", "gift_sku"]
  for (const k of keys) {
    if (p[k] && p[k] !== "/" && p[k] !== "") specs[k] = p[k]
  }
  // category guess จากชื่อ
  let category = "Smart Home"
  const lower = (p.name || "").toLowerCase()
  if (lower.includes("hair") || lower.includes("pocket") || lower.includes("glory") || lower.includes("miracle") || lower.includes("aero")) category = "Personal Care"
  else if (lower.includes("vacuum") || lower.includes("h12") || lower.includes("h13") || lower.includes("h15") || lower.includes("flex")) category = "Vacuum"
  else if (lower.includes("robot") || lower.includes("l10") || lower.includes("l20") || lower.includes("l30") || lower.includes("l40") || lower.includes("l50") || lower.includes("x10") || lower.includes("x20") || lower.includes("x30") || lower.includes("x40") || lower.includes("x50") || lower.includes("d10") || lower.includes("d30") || lower.includes("z10") || lower.includes("mova")) category = "Robot Vacuum"
  else if (lower.includes("fan") || lower.includes("mf10") || lower.includes("cvf")) category = "Fan"
  else if (lower.includes("air") || lower.includes("purif") || lower.includes("pm")) category = "Air Purifier"
  else if (lower.includes("dehum") || lower.includes("dd20") || lower.includes("dd30")) category = "Dehumidifier"
  else if (lower.includes("mower")) category = "Outdoor"

  return {
    barcode: p.barcode,
    name: p.name || `Dreame ${p.model || p.barcode}`,
    brand: BRAND,
    model: p.model || null,
    color: p.color || null,
    category,
    warranty: p.warranty && p.warranty !== "/" ? p.warranty : null,
    specs: Object.keys(specs).length > 0 ? specs : null,
    sn_required: false,
    is_active: true,
    image_url: null,  // จะเติมหลัง upload
    description: null,
    default_price: null,
  }
}

// ── 4. Main ──
;(async () => {
  if (!DRY_RUN) await ensureBucket()

  let okImg = 0, failImg = 0
  let okIns = 0, failIns = 0

  // Process batch 20 → upload + insert
  const BATCH = 20
  for (let i = 0; i < products.length; i += BATCH) {
    const slice = products.slice(i, i + BATCH)
    console.log(`\n[${i + 1}-${Math.min(i + BATCH, products.length)}/${products.length}]`)

    // upload images parallel
    if (!DRY_RUN) {
      await Promise.all(slice.map(async (p) => {
        if (p._image_file && fs.existsSync(p._image_file)) {
          const url = await uploadImage(p.barcode, p._image_file)
          if (url) { p._image_url = url; okImg++ }
          else failImg++
        }
      }))
    }

    // build rows
    const rows = slice.map(p => ({ ...buildRow(p), image_url: p._image_url || null }))

    if (DRY_RUN) {
      console.log("  (dry) จะ insert:", rows.length, "rows; ตัวอย่าง:")
      console.log("  ", JSON.stringify(rows[0]).slice(0, 300))
      continue
    }

    // upsert by barcode
    const { error, data } = await sb.from("products").upsert(rows, { onConflict: "barcode" }).select("id, barcode")
    if (error) {
      console.error("  ❌ upsert error:", error.message)
      failIns += rows.length
    } else {
      okIns += (data?.length ?? rows.length)
      console.log(`  ✓ upsert ${data?.length ?? rows.length} rows`)
    }
  }

  console.log("\n══════════════════════════════════════")
  console.log(`📷 Images: ${okImg} ok / ${failImg} fail`)
  console.log(`💾 Inserts: ${okIns} ok / ${failIns} fail`)
  console.log("══════════════════════════════════════")
})()
