import { BigQuery } from "@google-cloud/bigquery"

// ── BigQuery client ─────────────────────────────────────────────────────────
// ใช้ service-account JSON จาก env `GOOGLE_APPLICATION_CREDENTIALS_JSON`
// (project: elated-channel-468406-t4 — dataset `pc`, table `serial_tracking_enriched`)
//
// ตั้งค่า env:
//   GOOGLE_APPLICATION_CREDENTIALS_JSON = <service account JSON แบบ 1 บรรทัด>
//   BQ_SERIAL_PROJECT / BQ_SERIAL_DATASET / BQ_SERIAL_TABLE

let _client: BigQuery | null = null

export function getBigQuery(): BigQuery {
  if (_client) return _client
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!raw) throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON ยังไม่ได้ตั้งค่า")
  let credentials: any
  try {
    credentials = JSON.parse(raw)
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON parse ไม่ได้ (ต้องเป็น JSON)")
  }
  _client = new BigQuery({
    projectId: credentials.project_id || process.env.BQ_SERIAL_PROJECT,
    credentials,
  })
  return _client
}

export const SERIAL_TABLE = {
  project: process.env.BQ_SERIAL_PROJECT || "elated-channel-468406-t4",
  dataset: process.env.BQ_SERIAL_DATASET || "pc",
  table: process.env.BQ_SERIAL_TABLE || "serial_tracking_enriched",
}

/** fully-qualified table id สำหรับใส่ใน SQL (มี backtick) */
export function serialTableFQ(): string {
  return `\`${SERIAL_TABLE.project}.${SERIAL_TABLE.dataset}.${SERIAL_TABLE.table}\``
}
