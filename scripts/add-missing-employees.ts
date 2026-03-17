/**
 * ═══════════════════════════════════════════════════════════════
 * ADD Missing Employees — เพิ่ม 54 พนักงานที่หายไปจาก Excel
 * ═══════════════════════════════════════════════════════════════
 *
 * 1. ตรวจสอบ/สร้าง company PTC (ถ้ายังไม่มี)
 * 2. สร้าง departments ที่ขาด
 * 3. สร้าง positions ที่ขาด
 * 4. สร้าง branches ที่ขาด
 * 5. Insert employees เข้า public.employees
 * 6. สร้าง auth.users + public.users
 * 7. บันทึก credentials JSON
 *
 * Usage:
 *   npx tsx scripts/add-missing-employees.ts              # Dry-run
 *   npx tsx scripts/add-missing-employees.ts --execute     # สร้างจริง
 */

import { createClient } from "@supabase/supabase-js"
import crypto from "crypto"
import fs from "fs"
import path from "path"

// ── Config ──────────────────────────────────────────────────
const SUPABASE_URL = "https://kqlumdrkoopykmmylnhf.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40"

const args = process.argv.slice(2)
const DRY_RUN = !args.includes("--execute")

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

// ── Password Generator ──────────────────────────────────────
function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const specials = "!@#$%"
  let password = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length - 1; i++) {
    password += chars[bytes[i] % chars.length]
  }
  password += specials[bytes[length - 1] % specials.length]
  const arr = password.split("")
  const swapIdx = bytes[0] % (length - 1)
  ;[arr[swapIdx], arr[length - 1]] = [arr[length - 1], arr[swapIdx]]
  return arr.join("")
}

// ── Company Code Mapping (Excel → DB) ──────────────────────
const COMPANY_CODE_MAP: Record<string, string> = {
  "SHD": "SHD",
  "RABBIT": "RABBIT",
  "TOP ONE": "TOP1",
  "PTC": "PTC",
}

// ── Department Mapping (Excel ฝ่าย → DB name) ──────────────
// DB stores department names with ฝ่าย prefix
const DEPT_NAME_MAP: Record<string, string> = {
  "ฝ่ายการตลาดออนไลน์": "ฝ่ายการตลาดออนไลน์",
  "ฝ่ายขาย": "ฝ่ายขาย",
  "ฝ่ายบริหาร": "ฝ่ายบริหาร",
}

// ── 54 Missing Employees Data ───────────────────────────────
// Parsed from cleandata v1.xlsx — employees with valid emails not in credentials
interface MissingEmployee {
  employee_code: string
  nickname: string | null
  title: string       // นาย, น.ส., นาง
  full_name_th: string // ชื่อ นามสกุล combined
  name_en: string | null
  nationality: string
  birth_date_be: string | null  // Buddhist Era date
  gender: string    // ชาย/หญิง
  national_id: string | null
  address: string | null
  phone: string | null
  email: string
  company: string   // Excel company name
  dept_name: string // ฝ่าย from Excel
  sub_dept: string  // แผนก from Excel
  branch: string    // สาขา
  position: string  // ตำแหน่ง
  bank_name: string | null
  bank_account: string | null
  hire_date_be: string | null
  probation_end_be: string | null
  manager_code: string | null
}

const MISSING_EMPLOYEES: MissingEmployee[] = [
  // ── RABBIT (18 คน) — ฝ่ายการตลาดออนไลน์ / แอดมินออนไลน์ ──
  { employee_code: "63000004", nickname: "โบ๊ท", title: "นาย", full_name_th: "ปณิธิ หวังเพื่อสุข", name_en: "PANITI WANGPHUEASUK", nationality: "ไทย", birth_date_be: "15/04/2540", gender: "ชาย", national_id: "1102002743611", address: "75/99 หมู่ที่ 1 แขวงจอมทอง เขตจอมทอง กรุงเทพมหานคร 10150", phone: "0809000304", email: "boatmumu123@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "120-2-53725-7", hire_date_be: "2563-11-02", probation_end_be: "2563-10-06", manager_code: "62000002" },
  { employee_code: "63000013", nickname: "แพท", title: "น.ส.", full_name_th: "วิทุพร สระแก้ว", name_en: "WITUPORN SAKAEW", nationality: "ไทย", birth_date_be: "03/03/2541", gender: "หญิง", national_id: "1103702193691", address: "34 ม.10 ต.ดอนยายหอม อ.เมือง จ.นครปฐม 73000", phone: "0625629554", email: "sakaew_pat1998@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "111-2-73919-2", hire_date_be: "2563-07-06", probation_end_be: "2563-10-06", manager_code: "62000002" },
  { employee_code: "66000103", nickname: "ดาว", title: "น.ส.", full_name_th: "วีรดา ภูมินำ", name_en: "WEERADA PHUMNUM", nationality: "ไทย", birth_date_be: "06/11/2543", gender: "หญิง", national_id: "1100201394371", address: null, phone: "0955916359", email: "weeradaphumnum@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "438-1-05747-1", hire_date_be: "2566-09-16", probation_end_be: "2566-12-16", manager_code: "62000002" },
  { employee_code: "67000016", nickname: "กาย", title: "นาย", full_name_th: "พิตตินัทธ์ รุ่งขจรทรัพย์", name_en: "PITTINATH ROONGKAJORNSAB", nationality: "ไทย", birth_date_be: "19/02/2545", gender: "ชาย", national_id: "1100201640051", address: null, phone: "0945919193", email: "guyroongkajorn19@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "405-6-89965-4", hire_date_be: "2567-01-08", probation_end_be: "2567-04-08", manager_code: "62000002" },
  { employee_code: "67000047", nickname: "อาน", title: "น.ส.", full_name_th: "กัญญา เขียวหวาน", name_en: "KANYA KHIEOWWAN", nationality: "ไทย", birth_date_be: "01/12/2545", gender: "หญิง", national_id: "1460700147281", address: null, phone: "0629399135", email: "aanawin.02077@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "438-1-12816-0", hire_date_be: "2567-04-01", probation_end_be: "2567-07-01", manager_code: "62000002" },
  { employee_code: "67000048", nickname: "มิ้น", title: "น.ส.", full_name_th: "สุภาภรณ์ วงษ์เขียน", name_en: "SUPAPORN WONGKIAN", nationality: "ไทย", birth_date_be: "08/03/2542", gender: "หญิง", national_id: "1100702620580", address: null, phone: "0973015553", email: "minlalalalalin@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "115-2-10653-5", hire_date_be: "2567-04-01", probation_end_be: "2567-07-01", manager_code: "62000002" },
  { employee_code: "67000079", nickname: "เอิร์น", title: "น.ส.", full_name_th: "อารียา เพ่งพินิจธรรม", name_en: "AREEYA PENGPINITHAM", nationality: "ไทย", birth_date_be: "28/10/2542", gender: "หญิง", national_id: "1103702037311", address: null, phone: "0970699920", email: "asryean@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "402-1-38765-0", hire_date_be: "2567-06-10", probation_end_be: "2567-09-10", manager_code: "62000002" },
  { employee_code: "67000122", nickname: "เมย์", title: "น.ส.", full_name_th: "ณัฐมน งอยผาลา", name_en: "NATTAMON NGOIPHALA", nationality: "ไทย", birth_date_be: "05/06/2545", gender: "หญิง", national_id: "1471200218122", address: null, phone: "0642535246", email: "nattamonx2@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "406-7-56484-2", hire_date_be: "2567-10-14", probation_end_be: "2568-01-14", manager_code: "62000002" },
  { employee_code: "67000131", nickname: "ขนุน", title: "น.ส.", full_name_th: "กชกร ปิ่นกุมภีร์", name_en: "KOCHAKORN PINKUMPEE", nationality: "ไทย", birth_date_be: "03/12/2543", gender: "หญิง", national_id: "1100201378580", address: null, phone: "0801100299", email: "kochakornpinkumpee@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "406-7-59505-2", hire_date_be: "2567-11-11", probation_end_be: "2568-02-11", manager_code: "62000002" },
  { employee_code: "67000141", nickname: "มุก", title: "น.ส.", full_name_th: "ณัฐมล เพชไพทูรย์", name_en: "NUTTHAMON PHETPHAITOON", nationality: "ไทย", birth_date_be: "25/02/2545", gender: "หญิง", national_id: "1102002639843", address: null, phone: "0648942254", email: "nutthamon2502@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "406-7-65479-3", hire_date_be: "2567-12-02", probation_end_be: "2568-03-02", manager_code: "62000002" },
  { employee_code: "67000142", nickname: "พลอย", title: "น.ส.", full_name_th: "พลอยประกาย ธรรมขันธ์", name_en: "PLOYPRAKAI THAMMAKHAN", nationality: "ไทย", birth_date_be: "22/08/2545", gender: "หญิง", national_id: "1104300572660", address: null, phone: "0992488838", email: "mynameis.ploi1@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "406-7-63527-9", hire_date_be: "2567-12-02", probation_end_be: "2568-03-02", manager_code: "62000002" },
  { employee_code: "68000083", nickname: "มิน", title: "น.ส.", full_name_th: "พรไพลิน ปัททรัพย์", name_en: "PORNPILIN PATTARASAP", nationality: "ไทย", birth_date_be: "17/04/2540", gender: "หญิง", national_id: "1100702200011", address: null, phone: "0632457431", email: "pornpilin7431@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "438-1-17694-3", hire_date_be: "2568-01-13", probation_end_be: "2568-04-13", manager_code: "62000002" },
  { employee_code: "68000092", nickname: "ไอซ์", title: "น.ส.", full_name_th: "กรวรรณ หล้าบ้านโพน", name_en: "KORNWAN LABANPON", nationality: "ไทย", birth_date_be: "03/09/2545", gender: "หญิง", national_id: "1411200096261", address: null, phone: "0924414789", email: "kornwanice@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "438-1-18014-5", hire_date_be: "2568-01-20", probation_end_be: "2568-04-20", manager_code: "62000002" },
  { employee_code: "68000181", nickname: "ปาล์ม", title: "นาย", full_name_th: "นิธิโชติ จำพรต", name_en: "NITHICHOT JAMPROT", nationality: "ไทย", birth_date_be: "03/03/2544", gender: "ชาย", national_id: "1103300226641", address: null, phone: "0614793694", email: "palm030344@gmail.com", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "438-1-20373-7", hire_date_be: "2568-02-17", probation_end_be: "2568-05-17", manager_code: "62000002" },
  { employee_code: "68000191", nickname: "นิม", title: "น.ส.", full_name_th: "ณัชชา เอื้ออุดมวโรดม", name_en: "NATCHA AUEAUDOMWARODOM", nationality: "ไทย", birth_date_be: "07/10/2540", gender: "หญิง", national_id: "1100700795100", address: null, phone: "0839159391", email: "nim.natcha@shd-technology.co.th", company: "RABBIT", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "แอดมินออนไลน์", branch: "Ratchadaphisek 8", position: "เจ้าหน้าที่แอดมินออนไลน์", bank_name: "SCB", bank_account: "438-1-20602-7", hire_date_be: "2568-02-24", probation_end_be: "2568-05-24", manager_code: "62000002" },

  // ── TOP ONE (13 คน) — ฝ่ายการตลาดออนไลน์ / MC Live Streaming ──
  { employee_code: "65000026", nickname: "โบ๊ท", title: "น.ส.", full_name_th: "ชนิตา กัลยาณภาคย์", name_en: "CHANITA KANLAYANAPHAK", nationality: "ไทย", birth_date_be: "14/09/2534", gender: "หญิง", national_id: "1100400728610", address: null, phone: "0826568811", email: "boat.chanita@shd-technology.co.th", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "Senior MC Live Streaming (TIKTOK)", bank_name: "SCB", bank_account: "402-1-05697-3", hire_date_be: "2565-07-01", probation_end_be: "2565-10-01", manager_code: null },
  { employee_code: "66000043", nickname: "อาร์ม", title: "นาย", full_name_th: "ศิริศักดิ์ รักพร้า", name_en: "SIRISAK RAKPRA", nationality: "ไทย", birth_date_be: "17/01/2541", gender: "ชาย", national_id: "1103702079851", address: null, phone: "0981329348", email: "arm0981329348@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "111-2-69484-3", hire_date_be: "2566-08-07", probation_end_be: "2566-11-07", manager_code: null },
  { employee_code: "66000057", nickname: "แบม", title: "น.ส.", full_name_th: "วิรัญญา วันสืบ", name_en: "WIRANYA WANSUEB", nationality: "ไทย", birth_date_be: "03/08/2543", gender: "หญิง", national_id: "1650400130841", address: null, phone: "0894225674", email: "Wiranya5674@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "Senior MC Live Streaming (TIKTOK)", bank_name: "SCB", bank_account: "111-2-72091-0", hire_date_be: "2566-10-18", probation_end_be: "2567-01-18", manager_code: null },
  { employee_code: "66000065", nickname: "แบม", title: "น.ส.", full_name_th: "ชณิตา พึ่งสุรภาพ", name_en: "CHANITA PHUNGSURAPHAP", nationality: "ไทย", birth_date_be: "30/06/2544", gender: "หญิง", national_id: "1100201239261", address: null, phone: "0892289449", email: "chanitabam9@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "Admin Tiktok", bank_name: "SCB", bank_account: "052-4-09268-5", hire_date_be: "2567-01-02", probation_end_be: "2567-04-02", manager_code: null },
  { employee_code: "66000081", nickname: "เพชร", title: "น.ส.", full_name_th: "วชิราภรณ์ นีละมัย", name_en: "WACHIRAPORN NEELAMAI", nationality: "ไทย", birth_date_be: "31/01/2542", gender: "หญิง", national_id: "1341200200310", address: null, phone: "0864648830", email: "Petch031142@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "Senior MC Live Streaming (TIKTOK)", bank_name: "SCB", bank_account: "111-2-69612-9", hire_date_be: "2566-09-06", probation_end_be: "2566-12-06", manager_code: null },
  { employee_code: "66000090", nickname: "อิง", title: "น.ส.", full_name_th: "ณัฐชา อัศวเสนา", name_en: "NATTACHA ASAVASENA", nationality: "ไทย", birth_date_be: "01/06/2541", gender: "หญิง", national_id: "1240300051590", address: null, phone: "0954149519", email: "nattachaasvasena@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "111-2-73906-1", hire_date_be: "2566-09-11", probation_end_be: "2566-12-11", manager_code: null },
  { employee_code: "67000025", nickname: "บาส", title: "นาย", full_name_th: "เพชรน้ำหนึ่ง ลิมปจิตคุตาภรณ์", name_en: "PHETNAMNUNG LIMPAJITKHUTAPHON", nationality: "ไทย", birth_date_be: "12/05/2544", gender: "ชาย", national_id: "1100201193773", address: null, phone: "0800846623", email: "classfor6623@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "Senior MC Live Streaming (TIKTOK)", bank_name: "SCB", bank_account: "111-2-73901-0", hire_date_be: "2567-02-12", probation_end_be: "2567-05-12", manager_code: null },
  { employee_code: "67000030", nickname: "เนสท์", title: "น.ส.", full_name_th: "นัฐธินี เสาสูง", name_en: "NUTTINEE SAOSOONG", nationality: "ไทย", birth_date_be: "27/10/2542", gender: "หญิง", national_id: "1330500285660", address: null, phone: "0636149804", email: "Nuttinee.saosoong04@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "111-2-71979-6", hire_date_be: "2567-02-19", probation_end_be: "2567-05-19", manager_code: null },
  { employee_code: "67000121", nickname: "เชน", title: "นาย", full_name_th: "สิทธิพงษ์ คงสิน", name_en: "SITTHIPHONG KHONGSIN", nationality: "ไทย", birth_date_be: "11/02/2544", gender: "ชาย", national_id: "1102400051071", address: null, phone: "0957695233", email: "sitthiphong_44@icloud.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "406-7-59411-0", hire_date_be: "2567-10-07", probation_end_be: "2568-01-07", manager_code: null },
  { employee_code: "67000155", nickname: "ญา", title: "น.ส.", full_name_th: "ศรีนภา ตันงาม", name_en: "SINAPHA TANNGAM", nationality: "ไทย", birth_date_be: "14/05/2545", gender: "หญิง", national_id: "1102002654831", address: null, phone: "0654279362", email: "sinaphatanngam@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "406-7-65308-8", hire_date_be: "2567-12-16", probation_end_be: "2568-03-16", manager_code: null },
  { employee_code: "67000206", nickname: "ฟิว", title: "น.ส.", full_name_th: "วิมลสิริ มณีเจริญ", name_en: "WIMONSIRI MANEECHAROEN", nationality: "ไทย", birth_date_be: "01/01/2545", gender: "หญิง", national_id: "1100201527711", address: null, phone: "0957769200", email: "wimonsirifiw@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "167-2-14102-7", hire_date_be: "2568-01-13", probation_end_be: "2568-04-13", manager_code: null },
  { employee_code: "67000216", nickname: "เฮเลน", title: "น.ส.", full_name_th: "ไอรินลดา อารยะเรืองปัญญา", name_en: "AIRINLADA ARAYARUANGPANYA", nationality: "ไทย", birth_date_be: "03/04/2541", gender: "หญิง", national_id: "1103702060690", address: null, phone: "0946951998", email: "helenxgust1998@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "406-7-68063-9", hire_date_be: "2568-01-20", probation_end_be: "2568-04-20", manager_code: null },
  { employee_code: "68000031", nickname: "ชาย", title: "นาย", full_name_th: "ทัชชาพิชญ์ ชยรัฐสิริมงคล", name_en: "THATCHAPHIT CHAYARATTISIRIMONGKON", nationality: "ไทย", birth_date_be: "06/06/2544", gender: "ชาย", national_id: "1100201195599", address: null, phone: "0646493698", email: "thatchaphit.chaya@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "438-1-16319-1", hire_date_be: "2568-01-06", probation_end_be: "2568-04-06", manager_code: null },
  { employee_code: "68000184", nickname: "วิว", title: "น.ส.", full_name_th: "วิภาณี หลูโป", name_en: "WIPHANEE HLUPO", nationality: "ไทย", birth_date_be: "30/12/2544", gender: "หญิง", national_id: "1630100121951", address: null, phone: "0636266339", email: "wiphanihlupo1@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "438-1-20386-9", hire_date_be: "2568-02-17", probation_end_be: "2568-05-17", manager_code: null },
  { employee_code: "68000185", nickname: "ชมุก", title: "น.ส.", full_name_th: "นวกชมณ ผลจันทร์", name_en: "NAWAKCHAMON PHONJAN", nationality: "ไทย", birth_date_be: "18/01/2543", gender: "หญิง", national_id: "1101800431970", address: null, phone: "0924925234", email: "chamook.cs25@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "438-1-20436-9", hire_date_be: "2568-02-17", probation_end_be: "2568-05-17", manager_code: null },
  { employee_code: "68000238", nickname: "ฟ้าใส", title: "น.ส.", full_name_th: "ชลิดา เพิ่มชาติ", name_en: "CHALIDA PHOEMCHAT", nationality: "ไทย", birth_date_be: "21/01/2544", gender: "หญิง", national_id: "1103702256460", address: null, phone: "0951419161", email: "fhasaicharida@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "438-1-21268-5", hire_date_be: "2568-03-03", probation_end_be: "2568-06-03", manager_code: null },
  { employee_code: "68000247", nickname: "ชัย", title: "นาย", full_name_th: "ภูมิปรมภัทร์ บุญภูงา", name_en: "POOMPARAMAPAT BOONPUNGA", nationality: "ไทย", birth_date_be: "12/03/2543", gender: "ชาย", national_id: "1101801618781", address: null, phone: "0954964449", email: "poomparamapat.chai@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "438-1-21404-1", hire_date_be: "2568-03-10", probation_end_be: "2568-06-10", manager_code: null },
  { employee_code: "68000257", nickname: "บามิ", title: "น.ส.", full_name_th: "ณัฐนันท์ ด่านแก้ว", name_en: "NATTHANAN DANKAEW", nationality: "ไทย", birth_date_be: "03/04/2546", gender: "หญิง", national_id: "1101500373431", address: null, phone: "0924415544", email: "bbamiiz.chatt@gmail.com", company: "TOP ONE", dept_name: "ฝ่ายการตลาดออนไลน์", sub_dept: "MC Live Streaming", branch: "Ratchadaphisek 8", position: "MC Live Streaming", bank_name: "SCB", bank_account: "438-1-21521-8", hire_date_be: "2568-03-10", probation_end_be: "2568-06-10", manager_code: null },

  // ── PTC (21 คน) — ฝ่ายขาย ──
  { employee_code: "68000010", nickname: "ซม", title: "น.ส.", full_name_th: "มันฑนา แซ่เล้า", name_en: "MANTANA SAELAO", nationality: "ไทย", birth_date_be: "15/11/2535", gender: "หญิง", national_id: "3100400966131", address: null, phone: "0994949595", email: "sommantana2535@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "70 Mai ท่าพระ", position: "PC Event", bank_name: "SCB", bank_account: "438-1-16474-0", hire_date_be: "2568-01-06", probation_end_be: "2568-04-06", manager_code: null },
  { employee_code: "69000017", nickname: "แบงค์", title: "นาย", full_name_th: "สุริยา มโนชาติ", name_en: "SURIYA MANOCHAT", nationality: "ไทย", birth_date_be: "27/04/2541", gender: "ชาย", national_id: "1560200128590", address: null, phone: "0927541453", email: "Suriyamanochat27@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "70 Mai กาญจนาภิเษก", position: "PC Event", bank_name: "SCB", bank_account: "438-1-21759-8", hire_date_be: "2569-03-13", probation_end_be: null, manager_code: null },
  { employee_code: "69000018", nickname: "แบงค์", title: "นาย", full_name_th: "โกศล ประสาทพรชัย", name_en: "KOSON PRASATPORNCHAI", nationality: "ไทย", birth_date_be: "23/04/2543", gender: "ชาย", national_id: "1319900870660", address: null, phone: "0823031234", email: "bankjoga1234@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "70 Mai กาญจนาภิเษก", position: "PC Event", bank_name: "SCB", bank_account: "438-1-21760-1", hire_date_be: "2569-03-13", probation_end_be: null, manager_code: null },
  { employee_code: "69000023", nickname: "อะตอม", title: "น.ส.", full_name_th: "ญาณิศา พากเพียร", name_en: "YANISA PAKPIAN", nationality: "ไทย", birth_date_be: "30/04/2547", gender: "หญิง", national_id: "1440600154481", address: null, phone: "0826161283", email: "Atomatom30@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "70 Mai รามอินทรา", position: "PC Event", bank_name: "SCB", bank_account: "438-1-22017-3", hire_date_be: "2569-03-17", probation_end_be: null, manager_code: null },
  { employee_code: "68000255", nickname: "พั้นซ์", title: "น.ส.", full_name_th: "กัญญารัตน์ ป้อมเปรม", name_en: "KANYARAT POMPREM", nationality: "ไทย", birth_date_be: "17/12/2545", gender: "หญิง", national_id: "1100201687021", address: null, phone: "0632484524", email: "Kanyaratpomprem17@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anker Central world", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21505-6", hire_date_be: "2568-03-10", probation_end_be: "2568-06-10", manager_code: null },
  { employee_code: "68000192", nickname: "เนส", title: "น.ส.", full_name_th: "ณัฐิดา สุขคณิต", name_en: "NATTHIDA SUKKHANIT", nationality: "ไทย", birth_date_be: "28/09/2540", gender: "หญิง", national_id: "1103100107960", address: null, phone: "0804484465", email: "natthidasukkhanit@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anker Central Pinklao", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-20613-2", hire_date_be: "2568-02-24", probation_end_be: "2568-05-24", manager_code: null },
  { employee_code: "67000074", nickname: "ชมพู่", title: "น.ส.", full_name_th: "พัสตราภรณ์ งามวิจิตร", name_en: "PASTRAPORN NGAMVIJIT", nationality: "ไทย", birth_date_be: "20/04/2539", gender: "หญิง", national_id: "1103100108010", address: null, phone: "0656499955", email: "pastrapornngamvijit@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anker Fashion Island", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-14447-9", hire_date_be: "2567-06-01", probation_end_be: "2567-09-01", manager_code: null },
  { employee_code: "68000216", nickname: "เต๋อ", title: "น.ส.", full_name_th: "ศรัณพร สมาน", name_en: "SARANPORN SAMAN", nationality: "ไทย", birth_date_be: "27/01/2545", gender: "หญิง", national_id: "1100201523421", address: null, phone: "0990099684", email: "saransrp2701@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anker The Mall Ngamwongwan", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21062-3", hire_date_be: "2568-03-01", probation_end_be: "2568-06-01", manager_code: null },
  { employee_code: "69000021", nickname: "ซั่ม", title: "นาย", full_name_th: "อนัญญ์นพ เหลี่ยมมกราเจริญ", name_en: "ANANNOP LIAMMOKRACHAROEN", nationality: "ไทย", birth_date_be: "04/09/2543", gender: "ชาย", national_id: "1103702340811", address: null, phone: "0659614994", email: "huangkub4994@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anker The mall bangkapi", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21861-6", hire_date_be: "2569-03-17", probation_end_be: null, manager_code: null },
  { employee_code: "69000028", nickname: "มุก", title: "น.ส.", full_name_th: "สุวาภา อาบสุวรรณ์", name_en: "SUWAPHA APSUWAN", nationality: "ไทย", birth_date_be: "22/03/2546", gender: "หญิง", national_id: "1100201800060", address: null, phone: "0632621889", email: "Suwaphaa@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Hashtag Central Westgate", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-22099-8", hire_date_be: "2569-03-17", probation_end_be: null, manager_code: null },
  { employee_code: "67000057", nickname: "ลินลิน", title: "น.ส.", full_name_th: "ลลินี ประเสริฐสุข", name_en: "LALINEE PRASERTSUK", nationality: "ไทย", birth_date_be: "30/06/2544", gender: "หญิง", national_id: "1101800381841", address: null, phone: "0958356532", email: "lalineetnt@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Dreame Central Rama2", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-13329-5", hire_date_be: "2567-05-01", probation_end_be: "2567-08-01", manager_code: null },
  { employee_code: "69000005", nickname: "ท๊อป", title: "นาย", full_name_th: "ณัฐวุฒิ เซี่ยงหว่อง", name_en: "NATTHAWUT SIANGHWONG", nationality: "ไทย", birth_date_be: "08/08/2542", gender: "ชาย", national_id: "1100200873521", address: null, phone: "0917519555", email: "somya.som2564@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Dreame The Mall Ngamwongwan", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21606-0", hire_date_be: "2569-03-01", probation_end_be: "2569-06-01", manager_code: null },
  { employee_code: "68000233", nickname: "เบลล์", title: "น.ส.", full_name_th: "สุกานดา โสพันธ์", name_en: "SUKANDA SOPHAN", nationality: "ไทย", birth_date_be: "12/06/2543", gender: "หญิง", national_id: "1103702323250", address: null, phone: "0937329463", email: "n.sukanda12@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Central Maga Bangna", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21213-8", hire_date_be: "2568-03-03", probation_end_be: "2568-06-03", manager_code: null },
  { employee_code: "69000004", nickname: "ดิว", title: "นาย", full_name_th: "พิชิตชล ยาดี", name_en: "PHICHITCHON YADEE", nationality: "ไทย", birth_date_be: "21/04/2541", gender: "ชาย", national_id: "1570400174601", address: null, phone: "0849495997", email: "phichi2141@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Betrand The Mall Bangkapi", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21605-2", hire_date_be: "2569-03-01", probation_end_be: "2569-06-01", manager_code: null },
  { employee_code: "68000124", nickname: "พัน", title: "น.ส.", full_name_th: "พันธิตรา อ.วิจิตรอนันท์", name_en: "PHANTITRA O.WIJITANANT", nationality: "ไทย", birth_date_be: "20/10/2542", gender: "หญิง", national_id: "1100702598440", address: null, phone: "0647649090", email: "pvijianan@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anywhere", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-18503-1", hire_date_be: "2568-02-03", probation_end_be: "2568-05-03", manager_code: null },
  { employee_code: "69000016", nickname: "เอิง", title: "น.ส.", full_name_th: "มนทกานต์ พรมนิกร", name_en: "MONTHAKAN PROMNIKON", nationality: "ไทย", birth_date_be: "17/01/2546", gender: "หญิง", national_id: "1101500385011", address: null, phone: "0984826662", email: "Ootsppa@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Sale offline", branch: "Anywhere", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-21757-1", hire_date_be: "2569-03-13", probation_end_be: null, manager_code: null },
  { employee_code: "69000027", nickname: "ฝน", title: "น.ส.", full_name_th: "น้ำฝน อินทร์โสม", name_en: "NAMFON INSOM", nationality: "ไทย", birth_date_be: "12/06/2545", gender: "หญิง", national_id: "1102002651111", address: null, phone: "0826684485", email: "Nafnlisom@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Brand Shop", branch: "Anywhere", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-22098-0", hire_date_be: "2569-03-17", probation_end_be: null, manager_code: null },
  { employee_code: "67000187", nickname: "หมอก", title: "นาย", full_name_th: "อาทิตย์ สำอางค์อินทร์", name_en: "ARTHIT SAMANGIN", nationality: "ไทย", birth_date_be: "06/09/2541", gender: "ชาย", national_id: "1600100403600", address: null, phone: "0953263916", email: "mok0953263916@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Brand Shop", branch: "70 Mai รามอินทรา", position: "ช่างติดตั้งกล้องประจำร้าน 70mai", bank_name: "SCB", bank_account: "438-1-19283-8", hire_date_be: "2568-01-02", probation_end_be: "2568-04-02", manager_code: null },
  { employee_code: "69000010", nickname: "ออม", title: "นาย", full_name_th: "จิรพัฒน์ เอี่ยมมัน", name_en: "JIRAPHAT IAMMAN", nationality: "ไทย", birth_date_be: "25/11/2528", gender: "ชาย", national_id: "1100200447571", address: null, phone: "0880014415", email: "Carolina_2528@outlook.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Brand Shop", branch: "70 Mai ท่าพระ", position: "ช่างติดตั้งกล้องประจำร้าน 70mai", bank_name: "SCB", bank_account: "438-1-21684-2", hire_date_be: "2569-03-10", probation_end_be: "2569-06-10", manager_code: null },
  { employee_code: "69000026", nickname: "ฟิล์ม", title: "นาย", full_name_th: "กีรติ แก้วย้อย", name_en: "KEERATI KAEWYOI", nationality: "ไทย", birth_date_be: "12/10/2541", gender: "ชาย", national_id: "1103702071740", address: null, phone: "0970519558", email: "filmtvgon@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Brand Shop", branch: "70 Mai กาญจนาภิเษก", position: "Product Consultant (PC)", bank_name: "SCB", bank_account: "438-1-22016-5", hire_date_be: "2569-03-17", probation_end_be: null, manager_code: null },
  { employee_code: "68000248", nickname: "จิมมี่", title: "นาย", full_name_th: "ศุภชัย โชติชื่น", name_en: "SUPHACHAI CHOTCHUEN", nationality: "ไทย", birth_date_be: "01/02/2538", gender: "ชาย", national_id: "1103500365480", address: null, phone: "0619415201", email: "jimmy.suphachai.01@gmail.com", company: "PTC", dept_name: "ฝ่ายขาย", sub_dept: "Brand Shop", branch: "70 Mai กาญจนาภิเษก", position: "ช่างติดตั้งกล้องประจำร้าน 70mai", bank_name: "SCB", bank_account: "438-1-21420-3", hire_date_be: "2568-03-10", probation_end_be: "2568-06-10", manager_code: null },
]

// ── Date Helpers ─────────────────────────────────────────────
function beToIso(beDate: string | null): string | null {
  if (!beDate) return null
  // Format: "2563-11-02" or "15/04/2540"
  if (beDate.includes("/")) {
    const [d, m, y] = beDate.split("/")
    const ceYear = parseInt(y) - 543
    return `${ceYear}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  }
  const parts = beDate.split("-")
  const ceYear = parseInt(parts[0]) - 543
  return `${ceYear}-${parts[1]}-${parts[2]}`
}

function splitName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0] || "", last: "" }
  return { first: parts[0], last: parts.slice(1).join(" ") }
}

function splitEnName(name: string | null): { first: string | null; last: string | null } {
  if (!name) return { first: null, last: null }
  const parts = name.trim().split(/\s+/)
  if (parts.length <= 1) return { first: parts[0], last: null }
  return { first: parts[0], last: parts.slice(1).join(" ") }
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log(DRY_RUN ? "🔍 DRY RUN MODE" : "🚀 EXECUTE MODE — จะสร้างจริง!")
  console.log(`📊 พนักงานที่จะเพิ่ม: ${MISSING_EMPLOYEES.length} คน`)
  console.log("═══════════════════════════════════════════════════\n")

  // ──────────────────────────────────────────────────────────
  // STEP 1: ตรวจสอบ companies
  // ──────────────────────────────────────────────────────────
  console.log("📋 STEP 1: ตรวจสอบ companies...")
  const { data: companies } = await supabase.from("companies").select("id, code, name_th")
  const companyMap = new Map(companies?.map(c => [c.code, c.id]) || [])
  // Also map by name for PTC
  for (const c of companies || []) {
    if (c.name_th === "PTC" && !companyMap.has("PTC")) {
      companyMap.set("PTC", c.id)
    }
  }
  console.log("   Companies:", [...companyMap.entries()].map(([k,v]) => `${k}=${v.substring(0,8)}`).join(", "))

  // Check if PTC exists
  if (!companyMap.has("PTC")) {
    console.log("   ⚠️ PTC company ไม่พบ — ต้องสร้างใหม่")
    if (!DRY_RUN) {
      const { data: newCompany, error } = await supabase.from("companies").insert({
        code: "PTC",
        name_th: "PTC",
        name_en: "PTC",
        is_active: true,
      }).select().single()
      if (error) { console.error("❌ สร้าง PTC ไม่ได้:", error.message); process.exit(1) }
      companyMap.set("PTC", newCompany.id)
      console.log(`   ✅ สร้าง PTC: ${newCompany.id}`)
    }
  } else {
    console.log("   ✅ PTC พบแล้ว")
  }

  // ──────────────────────────────────────────────────────────
  // STEP 2: สร้าง departments ที่ขาด
  // ──────────────────────────────────────────────────────────
  console.log("\n📋 STEP 2: ตรวจสอบ/สร้าง departments...")
  const { data: depts } = await supabase.from("departments").select("id, company_id, name")
  const deptMap = new Map<string, string>() // "companyCode:deptName" → id
  for (const d of depts || []) {
    const compCode = [...companyMap.entries()].find(([_, v]) => v === d.company_id)?.[0]
    if (compCode) deptMap.set(`${compCode}:${d.name}`, d.id)
  }

  // Find needed departments
  const neededDepts = new Set<string>()
  for (const emp of MISSING_EMPLOYEES) {
    const dbCompCode = COMPANY_CODE_MAP[emp.company]
    const key = `${dbCompCode}:${emp.dept_name}`
    if (!deptMap.has(key)) neededDepts.add(key)
  }

  for (const key of neededDepts) {
    const [compCode, deptName] = key.split(":")
    const companyId = companyMap.get(compCode)
    if (!companyId) { console.log(`   ⚠️ Company ${compCode} ไม่พบ`); continue }
    const code = deptName.replace("ฝ่าย", "").substring(0, 30)
    console.log(`   + สร้าง department: ${deptName} (${compCode})`)
    if (!DRY_RUN) {
      const { data: newDept, error } = await supabase.from("departments").insert({
        company_id: companyId,
        name: deptName,
        code: code,
      }).select().single()
      if (error) { console.log(`     ❌ ${error.message}`); continue }
      deptMap.set(key, newDept.id)
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 3: สร้าง positions ที่ขาด
  // ──────────────────────────────────────────────────────────
  console.log("\n📋 STEP 3: ตรวจสอบ/สร้าง positions...")
  const { data: positions } = await supabase.from("positions").select("id, company_id, name")
  const posMap = new Map<string, string>()
  for (const p of positions || []) {
    const compCode = [...companyMap.entries()].find(([_, v]) => v === p.company_id)?.[0]
    if (compCode) posMap.set(`${compCode}:${p.name}`, p.id)
  }

  const neededPositions = new Set<string>()
  for (const emp of MISSING_EMPLOYEES) {
    const dbCompCode = COMPANY_CODE_MAP[emp.company]
    const key = `${dbCompCode}:${emp.position}`
    if (!posMap.has(key)) neededPositions.add(key)
  }

  for (const key of neededPositions) {
    const [compCode, posName] = key.split(":")
    const companyId = companyMap.get(compCode)
    if (!companyId) continue
    console.log(`   + สร้าง position: ${posName} (${compCode})`)
    if (!DRY_RUN) {
      const { data: newPos, error } = await supabase.from("positions").insert({
        company_id: companyId,
        name: posName,
        code: posName.substring(0, 30),
        is_flex_time: false,
      }).select().single()
      if (error) { console.log(`     ❌ ${error.message}`); continue }
      posMap.set(key, newPos.id)
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 4: สร้าง branches ที่ขาด
  // ──────────────────────────────────────────────────────────
  console.log("\n📋 STEP 4: ตรวจสอบ/สร้าง branches...")
  const { data: branches } = await supabase.from("branches").select("id, company_id, name")
  const branchMap = new Map<string, string>()
  for (const b of branches || []) {
    const compCode = [...companyMap.entries()].find(([_, v]) => v === b.company_id)?.[0]
    if (compCode) branchMap.set(`${compCode}:${b.name}`, b.id)
  }

  const neededBranches = new Set<string>()
  for (const emp of MISSING_EMPLOYEES) {
    const dbCompCode = COMPANY_CODE_MAP[emp.company]
    const key = `${dbCompCode}:${emp.branch}`
    if (!branchMap.has(key)) neededBranches.add(key)
  }

  for (const key of neededBranches) {
    const [compCode, branchName] = key.split(":")
    const companyId = companyMap.get(compCode)
    if (!companyId) continue
    const code = branchName.substring(0, 4).toUpperCase().replace(/\s/g, "")
    console.log(`   + สร้าง branch: ${branchName} (${compCode})`)
    if (!DRY_RUN) {
      const { data: newBranch, error } = await supabase.from("branches").insert({
        company_id: companyId,
        name: branchName,
        code: code,
        latitude: 13.75,
        longitude: 100.52,
        geo_radius_m: 200,
        timezone: "Asia/Bangkok",
      }).select().single()
      if (error) { console.log(`     ❌ ${error.message}`); continue }
      branchMap.set(key, newBranch.id)
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 5: ตรวจสอบว่า employee_code ยังไม่มีใน DB
  // ──────────────────────────────────────────────────────────
  console.log("\n📋 STEP 5: ตรวจสอบ employee_code ที่มีอยู่แล้ว...")
  const codes = MISSING_EMPLOYEES.map(e => e.employee_code)
  const { data: existing } = await supabase.from("employees").select("employee_code").in("employee_code", codes)
  const existingCodes = new Set((existing || []).map(e => e.employee_code))
  const toInsert = MISSING_EMPLOYEES.filter(e => !existingCodes.has(e.employee_code))
  console.log(`   มีอยู่แล้ว: ${existingCodes.size} คน`)
  console.log(`   ต้องเพิ่มใหม่: ${toInsert.length} คน`)

  if (DRY_RUN) {
    console.log("\n── Preview (ทั้งหมด) ──")
    for (const emp of toInsert) {
      const { first, last } = splitName(emp.full_name_th)
      console.log(`  ${emp.employee_code} | ${first} ${last} | ${emp.email} | ${emp.company} | ${emp.position}`)
    }
    console.log("\n🔍 DRY RUN เสร็จสิ้น — ใช้ --execute เพื่อรันจริง")
    return
  }

  // ══════════════════════════════════════════════════════════
  // EXECUTE MODE
  // ══════════════════════════════════════════════════════════

  // ──────────────────────────────────────────────────────────
  // STEP 6: Insert employees + Create auth users
  // ──────────────────────────────────────────────────────────
  console.log("\n🔨 STEP 6: เพิ่มพนักงาน + สร้าง auth users...")
  const results = { empSuccess: 0, empFailed: 0, authSuccess: 0, authFailed: 0 }
  const credentialLog: Array<{ code: string; name: string; email: string; password: string }> = []
  const failedList: Array<{ code: string; error: string }> = []

  for (const emp of toInsert) {
    const dbCompCode = COMPANY_CODE_MAP[emp.company]
    const companyId = companyMap.get(dbCompCode)
    const deptId = deptMap.get(`${dbCompCode}:${emp.dept_name}`) || null
    const posId = posMap.get(`${dbCompCode}:${emp.position}`) || null
    const branchId = branchMap.get(`${dbCompCode}:${emp.branch}`) || null
    const { first, last } = splitName(emp.full_name_th)
    const enName = splitEnName(emp.name_en)
    const hireDate = beToIso(emp.hire_date_be)
    const probEndDate = beToIso(emp.probation_end_be)
    const birthDate = beToIso(emp.birth_date_be)

    try {
      // A. Insert into public.employees
      const { data: newEmp, error: empErr } = await supabase.from("employees").insert({
        company_id: companyId,
        branch_id: branchId,
        department_id: deptId,
        position_id: posId,
        employee_code: emp.employee_code,
        first_name_th: first,
        last_name_th: last,
        first_name_en: enName.first,
        last_name_en: enName.last,
        nickname: emp.nickname,
        email: emp.email.trim(),
        phone: emp.phone,
        address: emp.address,
        birth_date: birthDate,
        national_id: emp.national_id,
        gender: emp.gender === "ชาย" ? "male" : "female",
        employment_status: "active",
        employment_type: "full_time",
        hire_date: hireDate,
        probation_end_date: probEndDate,
        bank_name: emp.bank_name,
        bank_account: emp.bank_account,
        is_active: true,
      }).select("id").single()

      if (empErr) throw new Error(`employees insert: ${empErr.message}`)
      results.empSuccess++

      // B. Create auth user
      const password = generatePassword(10)
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email: emp.email.trim(),
        password,
        email_confirm: true,
        user_metadata: {
          employee_code: emp.employee_code,
          full_name: `${first} ${last}`,
        },
      })

      if (authErr) {
        console.log(`   ⚠️ ${emp.employee_code}: employee สร้างแล้ว แต่ auth error: ${authErr.message}`)
        results.authFailed++
        continue
      }

      // C. Create public.users
      const { error: userErr } = await supabase.from("users").insert({
        id: authUser.user.id,
        employee_id: newEmp.id,
        company_id: companyId,
        role: "employee",
        is_active: true,
      })

      if (userErr) {
        console.log(`   ⚠️ ${emp.employee_code}: auth สร้างแล้ว แต่ public.users error: ${userErr.message}`)
      }

      credentialLog.push({
        code: emp.employee_code,
        name: `${first} ${last}`,
        email: emp.email.trim(),
        password,
      })
      results.authSuccess++

      if ((results.empSuccess) % 10 === 0) {
        console.log(`   ... สร้างแล้ว ${results.empSuccess}/${toInsert.length}`)
      }
    } catch (err: any) {
      results.empFailed++
      failedList.push({ code: emp.employee_code, error: err.message })
      console.log(`   ❌ ${emp.employee_code} (${emp.email}): ${err.message}`)
    }
  }

  // ──────────────────────────────────────────────────────────
  // STEP 7: บันทึก credentials
  // ──────────────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0]
  const credPath = path.join(__dirname, `credentials-missing-${today}.json`)
  fs.writeFileSync(credPath, JSON.stringify(credentialLog, null, 2), "utf-8")

  // ──────────────────────────────────────────────────────────
  // Summary
  // ──────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════")
  console.log("📊 สรุปผล:")
  console.log(`   ✅ Employee สร้างสำเร็จ: ${results.empSuccess}`)
  console.log(`   ❌ Employee ล้มเหลว: ${results.empFailed}`)
  console.log(`   ✅ Auth user สร้างสำเร็จ: ${results.authSuccess}`)
  console.log(`   ❌ Auth user ล้มเหลว: ${results.authFailed}`)
  if (failedList.length > 0) {
    console.log("\n   รายการที่ล้มเหลว:")
    failedList.forEach(f => console.log(`   - ${f.code}: ${f.error}`))
  }
  console.log(`\n📁 Credentials บันทึกที่: ${credPath}`)
  console.log("═══════════════════════════════════════════════════")
}

main().catch(console.error)
