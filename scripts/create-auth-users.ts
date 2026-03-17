/**
 * ═══════════════════════════════════════════════════════════════
 * Create Auth Users & Send Credential Emails
 * ═══════════════════════════════════════════════════════════════
 *
 * สคริปต์นี้จะ:
 * 1. ดึงพนักงานทั้งหมดที่มี email จาก public.employees
 * 2. สร้างรหัสผ่านเฉพาะสำหรับแต่ละคน
 * 3. สร้าง auth.users ผ่าน Supabase Admin API
 * 4. อัปเดต public.users ให้ id ตรงกับ auth.users.id
 * 5. ส่งอีเมลแจ้งรหัสผ่านให้พนักงานผ่าน Resend
 *
 * Usage:
 *   npx tsx scripts/create-auth-users.ts              # Dry-run (default)
 *   npx tsx scripts/create-auth-users.ts --execute     # Actually create users & send emails
 *   npx tsx scripts/create-auth-users.ts --no-email    # Create users but skip sending emails
 */

import { createClient } from "@supabase/supabase-js"
import { Resend } from "resend"
import crypto from "crypto"

// ── Config ──────────────────────────────────────────────────
const SUPABASE_URL = "https://kqlumdrkoopykmmylnhf.supabase.co"
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtxbHVtZHJrb29weWttbXlsbmhmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjU0MDU5OCwiZXhwIjoyMDg4MTE2NTk4fQ.VnEPB5i48CnAhsdA8eIejseQlkoe9Pfch95sVyzDd40"
const RESEND_API_KEY = process.env.RESEND_API_KEY || "re_Ldg7S4vF_F2Gf2QRbKKH7m3Vo6FNoMXHh"
const APP_URL = "https://goodhr.app" // เปลี่ยนเป็น production URL จริง

// Protected users — ห้ามแตะ (มี auth อยู่แล้ว)
const PROTECTED_USER_IDS = new Set([
  "0655563a-cf5c-4999-a563-9caa18773a87",
  "e68d3811-a0ae-4536-b854-3209ad08533a",
])

// ── Args ────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = !args.includes("--execute")
const SKIP_EMAIL = args.includes("--no-email")

// ── Clients ─────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const resend = new Resend(RESEND_API_KEY)

// ── Password Generator ──────────────────────────────────────
function generatePassword(length = 10): string {
  // สร้างรหัสที่อ่านง่าย ไม่สับสน (ไม่มี 0/O, 1/l/I)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"
  const specials = "!@#$%"
  let password = ""
  const bytes = crypto.randomBytes(length)
  for (let i = 0; i < length - 1; i++) {
    password += chars[bytes[i] % chars.length]
  }
  // เพิ่ม special char 1 ตัว
  password += specials[bytes[length - 1] % specials.length]
  // สลับตำแหน่ง
  const arr = password.split("")
  const swapIdx = bytes[0] % (length - 1)
  ;[arr[swapIdx], arr[length - 1]] = [arr[length - 1], arr[swapIdx]]
  return arr.join("")
}

// ── Email Template ──────────────────────────────────────────
function buildEmailHtml(params: {
  employeeName: string
  employeeCode: string
  email: string
  password: string
  companyName: string
  loginUrl: string
}): string {
  const { employeeName, employeeCode, email, password, companyName, loginUrl } = params
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color:#ffffff;font-size:24px;margin:0;font-weight:700;letter-spacing:-0.5px;">
                GOOD HR
              </h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:8px 0 0;">
                ระบบบริหารจัดการทรัพยากรบุคคล
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 20px;">
              <p style="font-size:16px;color:#1e293b;margin:0 0 8px;">
                สวัสดีคุณ <strong>${employeeName}</strong>
              </p>
              <p style="font-size:14px;color:#64748b;margin:0 0 24px;line-height:1.6;">
                บัญชีผู้ใช้ของคุณในระบบ GOOD HR สำหรับ <strong>${companyName}</strong> พร้อมใช้งานแล้ว
                กรุณาใช้ข้อมูลด้านล่างเพื่อเข้าสู่ระบบ
              </p>

              <!-- Credentials Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:6px 0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">รหัสพนักงาน</span><br>
                          <span style="font-size:15px;color:#1e293b;font-weight:600;">${employeeCode}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">อีเมล</span><br>
                          <span style="font-size:15px;color:#1e293b;font-weight:600;">${email}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:6px 0;border-top:1px solid #e2e8f0;">
                          <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">รหัสผ่าน</span><br>
                          <code style="font-size:18px;color:#dc2626;font-weight:700;background:#fef2f2;padding:4px 12px;border-radius:4px;letter-spacing:1px;">${password}</code>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td align="center">
                    <a href="${loginUrl}" target="_blank" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:14px 40px;border-radius:8px;font-size:15px;font-weight:600;letter-spacing:0.3px;">
                      เข้าสู่ระบบ GOOD HR
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Note -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="font-size:13px;color:#92400e;margin:0;line-height:1.6;">
                      <strong>หมายเหตุ:</strong> คุณสามารถเปลี่ยนรหัสผ่านได้ในหน้าตั้งค่าโปรไฟล์หลังจากเข้าสู่ระบบ
                      หากลืมรหัสผ่าน สามารถกดปุ่ม "ลืมรหัสผ่าน" ที่หน้า Login เพื่อรับลิงก์รีเซ็ทรหัสผ่านทางอีเมลได้
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 32px;border-top:1px solid #e2e8f0;">
              <p style="font-size:12px;color:#94a3b8;margin:0;text-align:center;line-height:1.6;">
                อีเมลนี้ถูกส่งอัตโนมัติจากระบบ GOOD HR<br>
                กรุณาอย่าตอบกลับอีเมลนี้ หากมีคำถามกรุณาติดต่อฝ่ายบุคคล
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ── Main ────────────────────────────────────────────────────
interface EmployeeRow {
  id: string
  employee_code: string
  first_name_th: string
  last_name_th: string
  email: string
  company_id: string
  company: { code: string; name_th: string } | null
}

interface PublicUser {
  id: string
  employee_id: string
  role: string
}

async function main() {
  console.log("═══════════════════════════════════════════════════")
  console.log(DRY_RUN ? "🔍 DRY RUN MODE — จะไม่สร้าง user หรือส่งอีเมลจริง" : "🚀 EXECUTE MODE — จะสร้าง user และส่งอีเมลจริง!")
  if (SKIP_EMAIL) console.log("📧 SKIP EMAIL — จะไม่ส่งอีเมล")
  console.log("═══════════════════════════════════════════════════\n")

  // 1. ดึงพนักงานที่มี email
  const { data: employees, error: empErr } = await supabase
    .from("employees")
    .select("id, employee_code, first_name_th, last_name_th, email, company_id, company:companies(code, name_th)")
    .not("email", "is", null)
    .neq("email", "")
    .eq("is_active", true)
    .order("employee_code")

  if (empErr) {
    console.error("❌ ดึงข้อมูลพนักงานไม่สำเร็จ:", empErr.message)
    process.exit(1)
  }

  const empList = employees as unknown as EmployeeRow[]
  console.log(`📋 พนักงานที่มีอีเมลทั้งหมด: ${empList.length} คน\n`)

  // 2. ดึง public.users ทั้งหมด
  const { data: publicUsers, error: puErr } = await supabase
    .from("users")
    .select("id, employee_id, role")

  if (puErr) {
    console.error("❌ ดึง public.users ไม่สำเร็จ:", puErr.message)
    process.exit(1)
  }

  const userMap = new Map<string, PublicUser>()
  for (const u of publicUsers || []) {
    userMap.set(u.employee_id, u as PublicUser)
  }

  // 3. ดึง auth.users ที่มีอยู่แล้ว
  const { data: authListData, error: authListErr } = await supabase.auth.admin.listUsers({
    perPage: 1000,
  })
  if (authListErr) {
    console.error("❌ ดึง auth.users ไม่สำเร็จ:", authListErr.message)
    process.exit(1)
  }
  const existingAuthEmails = new Set(authListData.users.map(u => u.email?.toLowerCase()))
  console.log(`🔐 auth.users ที่มีอยู่แล้ว: ${authListData.users.length} คน\n`)

  // 4. กรอง — ข้ามพนักงานที่มี auth อยู่แล้ว
  const toCreate: Array<EmployeeRow & { password: string }> = []
  const skipped: string[] = []

  for (const emp of empList) {
    const pubUser = userMap.get(emp.id)

    // ข้าม protected users
    if (pubUser && PROTECTED_USER_IDS.has(pubUser.id)) {
      skipped.push(`${emp.employee_code} (${emp.email}) — protected user`)
      continue
    }

    // ข้ามถ้ามี auth อยู่แล้ว
    if (existingAuthEmails.has(emp.email.toLowerCase())) {
      skipped.push(`${emp.employee_code} (${emp.email}) — auth exists`)
      continue
    }

    toCreate.push({
      ...emp,
      password: generatePassword(10),
    })
  }

  console.log(`⏭️  ข้าม: ${skipped.length} คน`)
  skipped.forEach(s => console.log(`   - ${s}`))
  console.log(`\n✅ จะสร้าง: ${toCreate.length} คน\n`)

  if (DRY_RUN) {
    console.log("── Preview (แสดง 10 คนแรก) ──")
    for (const emp of toCreate.slice(0, 10)) {
      const companyCode = emp.company ? (emp.company as any).code || "?" : "?"
      console.log(`  ${emp.employee_code} | ${emp.first_name_th} ${emp.last_name_th} | ${emp.email} | ${companyCode} | pw: ${emp.password}`)
    }
    if (toCreate.length > 10) console.log(`  ... และอีก ${toCreate.length - 10} คน`)
    console.log("\n🔍 DRY RUN เสร็จสิ้น — ใช้ --execute เพื่อรันจริง")
    return
  }

  // ══════════════════════════════════════════════════
  // EXECUTE MODE
  // ══════════════════════════════════════════════════
  const results = { success: 0, failed: 0, emailSent: 0, emailFailed: 0 }
  const failedList: Array<{ code: string; email: string; error: string }> = []
  const credentialLog: Array<{ code: string; name: string; email: string; password: string }> = []

  for (const emp of toCreate) {
    const companyInfo = emp.company as any
    const companyName = companyInfo?.name_th || "GOOD HR"
    const pubUser = userMap.get(emp.id)

    try {
      // A. สร้าง auth.users
      const { data: authUser, error: createErr } = await supabase.auth.admin.createUser({
        email: emp.email,
        password: emp.password,
        email_confirm: true, // ยืนยันอีเมลทันที ไม่ต้องคลิก verify
        user_metadata: {
          employee_code: emp.employee_code,
          full_name: `${emp.first_name_th} ${emp.last_name_th}`,
        },
      })

      if (createErr) throw new Error(`auth.createUser: ${createErr.message}`)

      const authId = authUser.user.id

      // B. อัปเดต public.users — ลบอันเก่า สร้างใหม่ด้วย id ตรงกับ auth
      if (pubUser) {
        await supabase.from("users").delete().eq("id", pubUser.id)
      }

      const { error: insertErr } = await supabase.from("users").insert({
        id: authId,
        employee_id: emp.id,
        company_id: emp.company_id,
        role: pubUser?.role || "employee",
        is_active: true,
      })

      if (insertErr) {
        console.warn(`⚠️  ${emp.employee_code}: public.users insert failed — ${insertErr.message}`)
        // ไม่ throw เพราะ auth.users สร้างสำเร็จแล้ว
      }

      results.success++
      credentialLog.push({
        code: emp.employee_code,
        name: `${emp.first_name_th} ${emp.last_name_th}`,
        email: emp.email,
        password: emp.password,
      })

      // C. ส่งอีเมล
      if (!SKIP_EMAIL) {
        try {
          await resend.emails.send({
            from: "GOOD HR <noreply@goodhr.app>", // ต้องตั้ง domain ใน Resend ก่อน
            to: emp.email,
            subject: `[GOOD HR] ข้อมูลเข้าสู่ระบบของคุณ — ${companyName}`,
            html: buildEmailHtml({
              employeeName: `${emp.first_name_th} ${emp.last_name_th}`,
              employeeCode: emp.employee_code,
              email: emp.email,
              password: emp.password,
              companyName,
              loginUrl: `${APP_URL}/login`,
            }),
          })
          results.emailSent++
        } catch (emailErr: any) {
          results.emailFailed++
          console.warn(`⚠️  ${emp.employee_code}: ส่งอีเมลไม่สำเร็จ — ${emailErr.message}`)
        }
      }

      console.log(`✅ ${emp.employee_code} — ${emp.email}`)

      // Rate limiting — Resend Free tier: 2/sec
      await sleep(600)

    } catch (err: any) {
      results.failed++
      failedList.push({ code: emp.employee_code, email: emp.email, error: err.message })
      console.error(`❌ ${emp.employee_code} — ${err.message}`)
    }
  }

  // ══════════════════════════════════════════════════
  // สรุปผล
  // ══════════════════════════════════════════════════
  console.log("\n═══════════════════════════════════════════════════")
  console.log("📊 สรุปผล")
  console.log("═══════════════════════════════════════════════════")
  console.log(`✅ สร้าง auth user สำเร็จ: ${results.success}`)
  console.log(`❌ สร้างไม่สำเร็จ:        ${results.failed}`)
  if (!SKIP_EMAIL) {
    console.log(`📧 ส่งอีเมลสำเร็จ:       ${results.emailSent}`)
    console.log(`📧 ส่งอีเมลไม่สำเร็จ:    ${results.emailFailed}`)
  }

  if (failedList.length > 0) {
    console.log("\n── รายการที่ล้มเหลว ──")
    failedList.forEach(f => console.log(`  ${f.code} | ${f.email} | ${f.error}`))
  }

  // บันทึก credentials ลงไฟล์ (สำคัญ — เก็บไว้เผื่อต้องดูรหัสทีหลัง)
  if (credentialLog.length > 0) {
    const logPath = `scripts/credentials-${new Date().toISOString().slice(0, 10)}.json`
    const fs = await import("fs")
    fs.writeFileSync(logPath, JSON.stringify(credentialLog, null, 2), "utf-8")
    console.log(`\n📁 บันทึก credentials ไว้ที่: ${logPath}`)
    console.log("⚠️  ไฟล์นี้มีรหัสผ่าน — กรุณาเก็บรักษาให้ดีและลบหลังใช้งาน")
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})
