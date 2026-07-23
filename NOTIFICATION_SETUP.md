# ตั้งค่าระบบแจ้งเตือน Feishu — เช็คลิสต์ให้ครบ

## ① รัน SQL (Supabase SQL Editor)
```
add_notification_center.sql     -- ตาราง config/log/สิทธิ์รับ/สิทธิ์ส่ง/rollout + seed การ์ด (รันซ้ำได้)
add_feishu_open_id.sql          -- (ถ้ายังไม่รัน) คอลัมน์ open_id
add_feishu_webhook.sql          -- (ถ้ายังไม่รัน) webhook trigger
```

## ② ตั้ง Environment Variables (Render → Environment)
| ตัวแปร | ค่า | ใช้ทำอะไร |
|---|---|---|
| `FEISHU_APP_ID` | `cli_aad0bacc22389cc7` | ให้ GoodHR ส่ง Feishu เอง |
| `FEISHU_APP_SECRET` | (secret ของ app) | ↑ |
| `FEISHU_BOT_SECRET` | (ที่มีอยู่แล้ว) | auth pull endpoint (cron/notify เรียกภายใน) |
| `CRON_SECRET` | (สุ่มยาวๆ) | auth cron ทุกตัว |
| `SYNC_SECRET` | (ที่มีอยู่แล้ว) | auth feishu-sync |

## ③ Deploy โค้ดขึ้น Render

## ④ เปิดสิทธิ์รับ (แท็บ "สิทธิ์รับ" ในหน้า Feishu Mapping)
เปิดสิทธิ์ 4 คนนำร่องก่อน · พร้อมทั้งบริษัทค่อยกด "เปิดรับทุกคน"

## ⑤ ตั้ง Cron (Render Cron Jobs หรือ cron-job.org)
> เวลาเป็น **UTC** (ไทย = UTC+7) · แทน `$CRON_SECRET` ด้วยค่าจริง

| งาน | cron (UTC) | เวลาไทย | คำสั่ง |
|---|---|---|---|
| **Relay อนุมัติ/ปฏิเสธ** | `*/5 * * * *` | ทุก 5 นาที | `curl "https://goodhr.onrender.com/api/cron/notify?type=relay&secret=$CRON_SECRET"` |
| **เตือนก่อนเข้ากะ** | `*/10 0-4 * * *` | ทุก 10 นาที 07:00-11:00 | `curl "https://goodhr.onrender.com/api/cron/notify?type=checkin_due&secret=$CRON_SECRET"` |
| **เตือนลืมเช็คเอาท์** | `*/15 10-14 * * *` | ทุก 15 นาที 17:00-21:00 | `curl "https://goodhr.onrender.com/api/cron/notify?type=checkout_reminder&secret=$CRON_SECRET"` |
| **สรุปเช้า+วันเกิด+คำขอค้าง+ทดลองงาน** | `15 2 * * *` | 09:15 ทุกวัน | `curl "https://goodhr.onrender.com/api/cron/notify?type=manager_digest,celebrations,stale_approvals,probation_due&secret=$CRON_SECRET"` |
| **Sync Feishu + backfill open_id** | `0 * * * *` | ทุก 1 ชม. | `curl "https://goodhr.onrender.com/api/cron/feishu-sync?secret=$CRON_SECRET"` |

## ทดสอบหลังตั้งเสร็จ
- ให้หัวหน้าอนุมัติใบลาของ 1 ใน 4 คนนำร่อง → ภายใน ~5 นาที เด้งเข้า Feishu
- ดูผลที่แท็บ "ประวัติการส่ง" (status sent/failed + message_id)
- ยิงมือทดสอบได้: `curl ".../api/cron/notify?type=relay&secret=$CRON_SECRET"` → คืน `{result:{relay:{sent,failed}}}`

## หมายเหตุ
- **relay** ครอบคลุมทุก in-app notification (~20 ชนิด): อนุมัติลา/OT/แก้เวลา · ลาออก · KPI/ทดลองงาน · อบรม/ควิซ · เบิกอุปกรณ์ · ประเมินสาขา · เปลี่ยนหัวหน้า
- ทุก cron ส่ง **เฉพาะคนที่เปิดสิทธิ์รับ** (rollout) — เพิ่มคน/แผนกเมื่อไหร่ก็ขยายทันที
- ไม่ต้องพึ่งบอท risemanu — GoodHR ส่งเข้า Feishu เองครบทุกช่องทาง
