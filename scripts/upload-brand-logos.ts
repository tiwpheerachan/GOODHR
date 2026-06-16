/**
 * ═══════════════════════════════════════════════════════════════
 * Upload Brand Logos to Supabase Storage + Update brands.logo_url
 * ═══════════════════════════════════════════════════════════════
 *
 * Usage:
 *   npx tsx scripts/upload-brand-logos.ts              # Dry-run
 *   npx tsx scripts/upload-brand-logos.ts --execute    # Upload + update DB
 */

import { createClient } from "@supabase/supabase-js"
import fs from "fs"
import path from "path"

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
}

const SUPABASE_URL = "https://kqlumdrkoopykmmylnhf.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40"

const BUCKET = "brand-logos"
const LOGO_DIR = "/Users/tiw/Documents/logo"

// ─── Brand name (canonical) → file name ───
const MAPPING: Record<string, string> = {
  "70mai":                  "images.png",
  "Anker":                  "649f273d-84d4-40a2-90c8-3214987b4e51_medium.jpg",
  "DDpai":                  "4yfnlc.jpg",
  "Dreame":                 "images (1).png",
  "Levoit":                 "images (1).jpeg",
  "Mibro":                  "images (4).png",
  "Mova":                   "images (2).png",
  "Soundcore":              "images.jpeg",
  "Thaimall":               "images (2).jpeg",
  "Toptoy":                 "images (4).jpeg",
  "Uwant":                  "images (3).png",
  "Vinko":                  "unnamed (1).png",
  "Wanbo":                  "images (3).jpeg",
  "Xiaomi Home Appliances": "Mi_home.webp",
  "Xiaomi MG":              "Xiaomi_logo.svg.png",
  "Xiaomi Smart App":       "Xiaomi_logo.svg.png",   // ใช้โลโก้ Xiaomi เดียวกัน
  "Zepp":                   "unnamed.png",
  // Jimmy — ยังไม่มี โลโก้
}

const DRY = !process.argv.includes("--execute")
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log(`\n${DRY ? "🧪 DRY RUN" : "🚀 EXECUTE"}`)
  console.log("─".repeat(60))

  // 1) Ensure bucket exists (public)
  const { data: buckets } = await supabase.storage.listBuckets()
  if (!buckets?.find(b => b.name === BUCKET)) {
    console.log(`📦 Creating bucket "${BUCKET}" (public)...`)
    if (!DRY) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024,
        allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"],
      })
    }
  } else {
    console.log(`✓ Bucket "${BUCKET}" already exists`)
  }

  // 2) Fetch all brands from DB
  const { data: brands, error } = await supabase.from("brands").select("id, name, logo_url")
  if (error) { console.error("❌ Fetch brands:", error); process.exit(1) }
  if (!brands || brands.length === 0) { console.error("❌ No brands found in DB"); process.exit(1) }

  console.log(`📋 ${brands.length} brands in DB\n`)

  // 3) For each brand in MAPPING — upload + update
  let ok = 0, skip = 0, fail = 0
  for (const [brandName, fileName] of Object.entries(MAPPING)) {
    const brand = brands.find(b => b.name === brandName)
    if (!brand) {
      console.log(`⚠️  ${brandName}: brand not found in DB — skip`)
      skip++
      continue
    }
    const srcPath = path.join(LOGO_DIR, fileName)
    if (!fs.existsSync(srcPath)) {
      console.log(`⚠️  ${brandName}: file not found "${fileName}" — skip`)
      skip++
      continue
    }

    const ext = path.extname(fileName).slice(1).toLowerCase() || "png"
    const dstPath = `${brand.id}/logo.${ext}`
    const contentType = MIME[ext] || "image/png"

    console.log(`📤 ${brandName.padEnd(28)} → ${dstPath} (${contentType})`)
    if (DRY) { ok++; continue }

    // Upload file (upsert: true → overwrite)
    const buf = fs.readFileSync(srcPath)
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(dstPath, buf, {
      contentType,
      upsert: true,
    })
    if (upErr) {
      console.log(`   ❌ Upload failed: ${upErr.message}`)
      fail++
      continue
    }

    // Get public URL
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(dstPath)
    const publicUrl = pub.publicUrl
    // ใส่ cache-bust query เพื่อกัน CDN cache รูปเก่า
    const finalUrl = `${publicUrl}?v=${Date.now()}`

    // Update brands.logo_url
    const { error: updErr } = await supabase.from("brands")
      .update({ logo_url: finalUrl }).eq("id", brand.id)
    if (updErr) {
      console.log(`   ❌ DB update failed: ${updErr.message}`)
      fail++
      continue
    }
    console.log(`   ✓ ${finalUrl}`)
    ok++
  }

  console.log("\n" + "─".repeat(60))
  console.log(`✓ Done: ${ok} ok, ${skip} skipped, ${fail} failed`)
  if (DRY) console.log(`\n💡 Run with --execute to actually upload + update DB`)
}

main().catch(err => { console.error(err); process.exit(1) })
