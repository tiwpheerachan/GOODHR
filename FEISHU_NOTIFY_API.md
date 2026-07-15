# Feishu Notify API — คู่มือสำหรับต่อยอด (Bot ฝั่ง Feishu)

ชุด API สำหรับดึงข้อมูล/trigger การแจ้งเตือนเข้า Feishu
**GOODHR เป็นฝั่ง "ข้อมูล" — การส่งข้อความ Feishu (tenant_access_token → im/v1/messages) เป็นงานของ bot ที่คุณพัฒนา**

> ⚠️ ชุด API นี้ **ไม่คืนข้อมูลเงินเดือน/payroll** โดยเจตนา

---

## Auth
ทุก endpoint ต้องมี bearer secret:
```
Authorization: Bearer <FEISHU_BOT_SECRET>
```
หรือแนบ `?secret=<FEISHU_BOT_SECRET>` ก็ได้ (สำหรับ cron/ทดสอบ)

ตั้งค่า env ใน GOODHR: `FEISHU_BOT_SECRET=<สุ่มยาวๆ>` (ถ้าไม่ตั้ง จะ fallback ใช้ `CRON_SECRET`)

## การระบุผู้รับ
ทุก payload มี **`feishu_user_id`** = `employees.feishu_user_id` (Feishu internal user_id)
ยิงเข้า Feishu ด้วย `receive_id_type=user_id`, `receive_id=<feishu_user_id>`
`feishu_user_id = null` แปลว่าพนักงานคนนั้น **ยังไม่ผูก Feishu** (ข้ามหรือ log ไว้)

Base URL: `https://<your-app>/api/feishu-notify`

---

## 1) แจ้งเตือนเช็คอิน (สำหรับ user)
`GET /checkin-reminders?company_id=&date=YYYY-MM-DD`
คืนคนที่ **ยังไม่เช็คอิน** วันนี้ (เฉพาะคนที่ผูก Feishu) → bot ยิงเตือน
```jsonc
{
  "date": "2026-07-14",
  "total_active": 380, "checked_in": 250, "pending_count": 130,
  "recipients": [ { "employee_id", "feishu_user_id", "name", "department", "branch" } ]
}
```
> แนะนำให้ bot ตั้ง cron ยิงตามเวลาเข้ากะ · logic กรองตามเวลากะเพิ่มได้ฝั่ง bot

## 2) ตรวจการเข้างานของตัวเอง (สำหรับ user)
`GET /my-attendance?employee_id=|feishu_user_id=&range=today|week|month`
(หรือ `&from=YYYY-MM-DD&to=YYYY-MM-DD`)
```jsonc
{
  "employee": { "employee_id", "feishu_user_id", "name", ... },
  "range": { "from", "to" },
  "summary": { "days", "present", "late", "early_out", "absent", "on_leave",
               "total_late_minutes", "total_ot_minutes" },
  "records": [ { "work_date", "status", "clock_in", "clock_out", "late_minutes", "ot_minutes" } ]
}
```

## 3) แจ้งผลคำขอ (สำหรับ user) — ลา/OT อนุมัติ/ปฏิเสธ
`GET /events?since=<ISO>&types=leave,ot,adjustment,offsite,resignation&company_id=`
คำขอที่ **ถูกตัดสินหลังเวลา `since`** → ยิงแจ้ง "เจ้าของคำขอ"
ให้ bot poll ทุก N นาที โดยส่ง `since` = เวลารอบก่อนหน้า (ISO)
```jsonc
{
  "since": "2026-07-14T09:00:00Z", "count": 3,
  "events": [ {
    "type": "leave", "decision": "approved",  // approved | rejected
    "request_id", "decided_at",
    "recipient": { "feishu_user_id", "name", ... },
    "detail": { "start_date", "end_date", "work_date", "note" }
  } ]
}
```

## 4) คำขอที่รออนุมัติ (สำหรับ manager)
`GET /pending-approvals?manager_employee_id=|manager_feishu_id=&company_id=`
คำขอ pending จัดกลุ่ม **ตามหัวหน้า** (ระบุ manager = เฉพาะคนนั้น, ไม่ระบุ = ทุกหัวหน้า)
```jsonc
{
  "total_pending": 42,
  "managers": [ {
    "manager": { "feishu_user_id", "name", ... },
    "counts": { "leave": 3, "ot": 1, "adjustment": 0, "offsite": 2, "total": 6 },
    "items": [ { "type", "id", "employee_id", "employee_name", "date", "created_at" } ]
  } ]
}
```
> ไม่ระบุ manager → วน `managers[]` ยิงหาแต่ละหัวหน้าได้เลย

## 5) สรุปการเข้างานลูกทีม (สำหรับ manager)
`GET /team-attendance?manager_employee_id=|manager_feishu_id=&date=YYYY-MM-DD`
```jsonc
{
  "manager": { "feishu_user_id", "name" },
  "date": "2026-07-14",
  "summary": { "team_size", "present", "late", "on_leave", "absent", "not_checked_in" },
  "members": [ { "employee_id", "name", "feishu_user_id", "department",
                 "state": "present|late|on_leave|absent|not_checked_in",
                 "clock_in", "clock_out", "late_minutes", "ot_minutes" } ]
}
```

## 6) Resolve ตัวตน (glue helper)
`GET /resolve?employee_id=|feishu_user_id=|email=`
```jsonc
{
  "employee": { "employee_id", "feishu_user_id", "name", ... },
  "role": "employee|manager|hr_admin|super_admin",
  "is_manager": true, "team_size": 8,
  "manager": { "feishu_user_id", "name", ... }
}
```

---

## แนวทางต่อยอด (ฝั่ง bot)
- **Cron เตือนเช็คอิน**: เรียก (1) ตามเวลากะ → ยิงข้อความหา `recipients[].feishu_user_id`
- **แจ้งผลคำขอ**: เก็บ `last_polled_at` → เรียก (3) ด้วย `since=last_polled_at` ทุก 1–5 นาที
- **เตือนหัวหน้ามีคำขอค้าง**: เรียก (4) เช้า/เย็น → ยิงสรุปหาแต่ละ manager
- **สรุปทีมรายวัน**: เรียก (5) ตอนสาย → การ์ดสรุปหา manager
- **ผูก Feishu**: ถ้า `feishu_user_id = null` แปลว่ายังไม่ได้ map (หน้า /admin/feishu-users)

## หมายเหตุ
- ทุก endpoint เป็น `GET` อ่านอย่างเดียว (ปลอดภัยต่อการ retry)
- ทุก endpoint ข้าม `/api` ใน middleware แล้ว (auth ด้วย bearer secret ของตัวเอง)
- ตาราง request ที่ไม่มีในบางระบบจะถูกข้ามเงียบๆ (ไม่ error)
