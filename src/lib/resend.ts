import { Resend } from "resend"

// Lazy initialization — ป้องกัน build error เมื่อ RESEND_API_KEY ไม่มีใน build environment
let _resend: Resend | null = null
export function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY)
  }
  return _resend
}
/** @deprecated ใช้ getResend() แทน */
export const resend = null as unknown as Resend // keep backward compat type

// ── Email templates ──────────────────────────────────────────────

export function passwordResetEmail(resetUrl: string, employeeName: string) {
  return {
    subject: "GOODHR — รีเซ็ตรหัสผ่าน",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">GOODHR</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">ระบบบริหารจัดการพนักงาน</p>
    </div>
    <!-- Body -->
    <div style="padding:32px 24px;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 8px;">สวัสดีคุณ <strong>${employeeName}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 24px;">
        เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ กดปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#3b82f6);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;letter-spacing:0.3px;">
          ตั้งรหัสผ่านใหม่
        </a>
      </div>
      <p style="color:#94a3b8;font-size:12px;line-height:1.6;margin:24px 0 0;">
        ลิงก์นี้จะหมดอายุใน 1 ชั่วโมง หากคุณไม่ได้ขอรีเซ็ตรหัสผ่าน กรุณาเพิกเฉยอีเมลนี้
      </p>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid #e2e8f0;">
        <p style="color:#cbd5e1;font-size:11px;margin:0;">หากกดปุ่มไม่ได้ ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:</p>
        <p style="color:#94a3b8;font-size:11px;word-break:break-all;margin:4px 0 0;">${resetUrl}</p>
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} SHD Technology Co., Ltd. — GOODHR</p>
    </div>
  </div>
</body>
</html>`,
  }
}

export function passwordChangedNotifyEmail(employeeName: string) {
  return {
    subject: "GOODHR — รหัสผ่านถูกเปลี่ยนแล้ว",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#059669,#10b981);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">GOODHR</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">แจ้งเตือนความปลอดภัย</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 8px;">สวัสดีคุณ <strong>${employeeName}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 16px;">
        รหัสผ่าน GOODHR ของคุณถูกเปลี่ยนเรียบร้อยแล้วเมื่อ <strong>${new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</strong>
      </p>
      <div style="background:#fef3c7;border:1px solid #fbbf24;border-radius:10px;padding:12px 16px;margin:16px 0;">
        <p style="color:#92400e;font-size:13px;margin:0;font-weight:600;">
          ⚠️ หากคุณไม่ได้เป็นผู้เปลี่ยนรหัสผ่าน กรุณาแจ้ง HR ทันที
        </p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} SHD Technology Co., Ltd. — GOODHR</p>
    </div>
  </div>
</body>
</html>`,
  }
}

export function adminResetNotifyEmail(employeeName: string, newPassword: string) {
  return {
    subject: "GOODHR — รหัสผ่านถูกรีเซ็ตโดย HR",
    html: `
<!DOCTYPE html>
<html lang="th">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#f8fafc;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
    <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);padding:32px 24px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">GOODHR</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">รีเซ็ตรหัสผ่าน</p>
    </div>
    <div style="padding:32px 24px;">
      <p style="color:#334155;font-size:15px;line-height:1.6;margin:0 0 8px;">สวัสดีคุณ <strong>${employeeName}</strong>,</p>
      <p style="color:#64748b;font-size:14px;line-height:1.6;margin:0 0 16px;">
        HR ได้รีเซ็ตรหัสผ่าน GOODHR ของคุณแล้ว กรุณาใช้รหัสผ่านใหม่ด้านล่างเพื่อเข้าสู่ระบบ:
      </p>
      <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:12px;padding:16px;text-align:center;margin:20px 0;">
        <p style="color:#94a3b8;font-size:11px;margin:0 0 6px;">รหัสผ่านใหม่ของคุณ</p>
        <p style="color:#1e293b;font-size:22px;font-weight:800;letter-spacing:2px;margin:0;font-family:monospace;">${newPassword}</p>
      </div>
      <div style="background:#dbeafe;border:1px solid #93c5fd;border-radius:10px;padding:12px 16px;margin:16px 0;">
        <p style="color:#1e40af;font-size:13px;margin:0;">
          💡 แนะนำให้เปลี่ยนรหัสผ่านทันทีหลังเข้าสู่ระบบ ที่ โปรไฟล์ → ตั้งค่า → เปลี่ยนรหัสผ่าน
        </p>
      </div>
    </div>
    <div style="background:#f8fafc;padding:16px 24px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} SHD Technology Co., Ltd. — GOODHR</p>
    </div>
  </div>
</body>
</html>`,
  }
}
