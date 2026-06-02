#!/usr/bin/env node
// ════════════════════════════════════════════════════════════════════
// Extract Dreame products from xlsx → JSON
//   - อ่านทั้ง 3 ชีต (Dreame / Dreame Copy / Sheet3)
//   - normalize column layout
//   - dedupe by barcode (เลือก row ที่ข้อมูลครบที่สุด)
//   - ส่งออก /tmp/dreame_products.json
//   - ดึงรูป + map ผ่าน drawings xml → /tmp/dreame_images/
// ════════════════════════════════════════════════════════════════════
const XLSX = require("xlsx")
const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const SRC = process.argv[2] || "/Users/tiw/Downloads/Dreame Product Information บาร์โค้ด+รูปภาพ.xlsx"
const OUT_JSON = "/tmp/dreame_products.json"
const OUT_DIR_IMG = "/tmp/dreame_images"
const OUT_DIR_EXTRACT = "/tmp/dreame_xlsx_extract"

// ── 1. อ่าน workbook ──
console.log("📂 อ่านไฟล์:", SRC)
const wb = XLSX.readFile(SRC)

const sNorm = (v) => v == null ? "" : String(v).replace(/\s+/g, " ").trim()
const isValidBarcode = (s) => /^\d{8,14}$/.test(String(s || "").replace(/\D/g, ""))
const cleanBarcode = (s) => String(s || "").replace(/\D/g, "")

// ── 2. extract แต่ละ sheet ──
function extractDreameSheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const out = []
  // header row 0
  for (let i = 1; i < data.length; i++) {
    const r = data[i] || []
    const barcode = cleanBarcode(r[4])
    if (!isValidBarcode(barcode)) continue
    out.push({
      name:         sNorm(r[1]),
      model:        sNorm(r[3]),
      barcode,
      status:       sNorm(r[5]),
      size:         sNorm(r[6]),
      weight:       sNorm(r[7]),
      box_size:     sNorm(r[8]),
      box_weight:   sNorm(r[9]),
      color:        sNorm(r[10]),
      what_in_box:  sNorm(r[12]),
      voltage:      sNorm(r[13]),
      charge_time:  sNorm(r[14]),
      battery:      sNorm(r[15]),
      material:     sNorm(r[16]),
      cable_length: sNorm(r[17]),
      home_app:     sNorm(r[18]),
      warranty:     sNorm(r[19]),
      _source: "Dreame",
      _row: i,
    })
  }
  return out
}

function extractDreameCopySheet(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const out = []
  for (let i = 2; i < data.length; i++) {
    const r = data[i] || []
    // ใน Copy: col 4=Product Code(EAN), col 5=Barcode
    const c4 = cleanBarcode(r[4])
    const c5 = cleanBarcode(r[5])
    const barcode = isValidBarcode(c5) ? c5 : (isValidBarcode(c4) ? c4 : "")
    if (!barcode) continue
    out.push({
      name:         sNorm(r[1]),
      model:        sNorm(r[3]),
      barcode,
      status:       sNorm(r[6]),
      size:         sNorm(r[7]),
      weight:       sNorm(r[8]),
      box_size:     sNorm(r[9]),
      box_weight:   sNorm(r[10]),
      color:        sNorm(r[12]),
      what_in_box:  sNorm(r[13]),
      current:      sNorm(r[14]),
      voltage:      sNorm(r[15]),
      charge_time:  sNorm(r[16]),
      battery:      sNorm(r[17]),
      material:     sNorm(r[18]),
      home_app:     sNorm(r[19]),
      cable_length: sNorm(r[20]),
      warranty:     sNorm(r[21]),
      gift_sku:     sNorm(r[22]),
      _source: "Dreame(Copy)",
      _row: i,
    })
  }
  return out
}

function extractSheet3(ws) {
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })
  const out = []
  for (let i = 0; i < data.length; i++) {
    const r = data[i] || []
    const barcode = cleanBarcode(r[3])
    if (!isValidBarcode(barcode)) continue
    out.push({
      name:         sNorm(r[0]),
      model:        sNorm(r[2]),
      barcode,
      status:       sNorm(r[5]),
      size:         sNorm(r[6]),
      weight:       sNorm(r[7]),
      box_size:     sNorm(r[8]),
      box_weight:   sNorm(r[9]),
      color:        sNorm(r[11]),
      what_in_box:  sNorm(r[12]),
      voltage:      sNorm(r[14]),
      charge_time:  sNorm(r[15]),
      battery:      sNorm(r[16]),
      home_app:     sNorm(r[18]),
      cable_length: sNorm(r[19]),
      _source: "Sheet3",
      _row: i,
    })
  }
  return out
}

const all = [
  ...extractDreameSheet(wb.Sheets["Dreame"]),
  ...extractDreameCopySheet(wb.Sheets["Dreame（Copy）"] || wb.Sheets["Dreame(Copy)"] || wb.Sheets["Sheet2"] || {}),
  ...extractSheet3(wb.Sheets["Sheet3"] || {}),
]
console.log(`📊 รวมทั้งหมด ${all.length} รายการ (ก่อน dedupe)`)

// ── 3. Dedupe by barcode ── เลือกตัวที่มีข้อมูลครบที่สุด
const byBC = new Map()
for (const p of all) {
  if (!p.barcode) continue
  const filled = Object.entries(p).filter(([k, v]) => !k.startsWith("_") && v && v !== "/").length
  const cur = byBC.get(p.barcode)
  if (!cur || filled > cur._filled) {
    byBC.set(p.barcode, { ...p, _filled: filled })
  }
}
const dedup = Array.from(byBC.values()).map(({ _filled, _source, _row, ...p }) => ({ ...p, _source, _row }))
console.log(`✓ Dedupe เหลือ ${dedup.length} รายการ (unique barcode)`)

// ── 4. Extract images ── unzip xlsx + parse drawings ──
console.log("🖼  กำลังแกะรูปภาพจาก xlsx...")
if (fs.existsSync(OUT_DIR_EXTRACT)) execSync(`rm -rf "${OUT_DIR_EXTRACT}"`)
fs.mkdirSync(OUT_DIR_EXTRACT, { recursive: true })
execSync(`unzip -q "${SRC}" -d "${OUT_DIR_EXTRACT}"`)

// list image files
const mediaDir = path.join(OUT_DIR_EXTRACT, "xl/media")
const mediaFiles = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir) : []
console.log(`   พบรูป ${mediaFiles.length} ไฟล์`)

// อ่าน drawing files แต่ละ sheet → หา anchor cell ของแต่ละรูป
// drawings/_rels/drawingN.xml.rels — mapping rId → media/imageN.jpeg
// drawings/drawingN.xml — anchor (fromRow/fromCol) → rId

function parseDrawing(sheetIdx) {
  const drawingPath = path.join(OUT_DIR_EXTRACT, `xl/drawings/drawing${sheetIdx}.xml`)
  const relsPath    = path.join(OUT_DIR_EXTRACT, `xl/drawings/_rels/drawing${sheetIdx}.xml.rels`)
  if (!fs.existsSync(drawingPath) || !fs.existsSync(relsPath)) return []
  const rels = fs.readFileSync(relsPath, "utf-8")
  const drawing = fs.readFileSync(drawingPath, "utf-8")
  // build map: rId → image filename
  const rmap = {}
  for (const m of rels.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
    rmap[m[1]] = m[2].replace(/^\.\.\//, "").replace(/^\//, "")  // เช่น "../media/image1.jpeg"
  }
  // หา anchor ทุกตัว
  const anchors = []
  // จับ <xdr:twoCellAnchor>...</xdr:twoCellAnchor> หรือ oneCellAnchor
  const anchorRe = /<xdr:(?:twoCellAnchor|oneCellAnchor)[\s\S]*?<\/xdr:(?:twoCellAnchor|oneCellAnchor)>/g
  for (const a of drawing.matchAll(anchorRe)) {
    const block = a[0]
    const fromRow = parseInt((block.match(/<xdr:from>[\s\S]*?<xdr:row>(\d+)<\/xdr:row>/) || [])[1] ?? "-1", 10)
    const fromCol = parseInt((block.match(/<xdr:from>[\s\S]*?<xdr:col>(\d+)<\/xdr:col>/) || [])[1] ?? "-1", 10)
    const rId = (block.match(/r:embed="([^"]+)"/) || [])[1]
    if (rId && rmap[rId]) {
      anchors.push({ row: fromRow, col: fromCol, image: rmap[rId] })
    }
  }
  return anchors
}

// หา sheet index ของแต่ละ sheet name ผ่าน workbook.xml + workbook.xml.rels
function getSheetDrawingMap() {
  const wbXml = fs.readFileSync(path.join(OUT_DIR_EXTRACT, "xl/workbook.xml"), "utf-8")
  const wbRels = fs.readFileSync(path.join(OUT_DIR_EXTRACT, "xl/_rels/workbook.xml.rels"), "utf-8")
  // sheet name → sheet xml path
  const relMap = {}
  for (const m of wbRels.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
    relMap[m[1]] = m[2]
  }
  const sheets = []
  for (const m of wbXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"/g)) {
    sheets.push({ name: m[1], path: relMap[m[2]] })
  }
  // for each sheet, read sheetN.xml.rels to find drawing rel
  const out = {}
  for (const s of sheets) {
    const sheetRelPath = path.join(OUT_DIR_EXTRACT, "xl", s.path.replace(/[^\/]+$/, "_rels/" + path.basename(s.path) + ".rels"))
    if (!fs.existsSync(sheetRelPath)) continue
    const rels = fs.readFileSync(sheetRelPath, "utf-8")
    const m = rels.match(/Target="\.\.\/drawings\/drawing(\d+)\.xml"/)
    if (m) out[s.name] = parseInt(m[1], 10)
  }
  return out
}

const sheetToDrawingIdx = getSheetDrawingMap()
console.log("   Sheet → drawing index:", sheetToDrawingIdx)

// ── 5. Map images to rows ── ใช้ anchor.row (0-indexed) === _row
if (fs.existsSync(OUT_DIR_IMG)) execSync(`rm -rf "${OUT_DIR_IMG}"`)
fs.mkdirSync(OUT_DIR_IMG, { recursive: true })

const sheetAnchors = {}
for (const [sheetName, idx] of Object.entries(sheetToDrawingIdx)) {
  sheetAnchors[sheetName] = parseDrawing(idx)
}

let imgFound = 0
for (const p of dedup) {
  const anchors = sheetAnchors[p._source] || []
  // หา anchor ที่ row ตรงกับ _row (0-indexed) หรือใกล้ๆ
  const a = anchors.find(x => x.row === p._row)
  if (a) {
    const srcImg = path.join(OUT_DIR_EXTRACT, "xl", a.image)
    if (fs.existsSync(srcImg)) {
      const ext = path.extname(a.image) || ".jpeg"
      const dest = path.join(OUT_DIR_IMG, `${p.barcode}${ext}`)
      fs.copyFileSync(srcImg, dest)
      p._image_file = dest
      imgFound++
    }
  }
}
console.log(`   จับคู่รูปได้ ${imgFound}/${dedup.length} รายการ`)

// ── 6. Save JSON ──
fs.writeFileSync(OUT_JSON, JSON.stringify(dedup, null, 2), "utf-8")
console.log(`\n✅ บันทึก → ${OUT_JSON}`)
console.log(`✅ รูปภาพ → ${OUT_DIR_IMG}`)
console.log(`\n📝 ตัวอย่าง 3 รายการ:`)
for (const p of dedup.slice(0, 3)) {
  console.log(`   ${p.barcode}  ${p.name}  [${p.model}]  ${p._image_file ? "🖼" : "  "}`)
}
