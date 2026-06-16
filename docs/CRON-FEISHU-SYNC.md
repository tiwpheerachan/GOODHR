# 🕒 Auto-sync Feishu Accounts (Hourly)

ตามคู่มือ `FEATURE-FEISHU-ACCOUNTS.md` — ตั้ง cron job เรียก backend ของ HRMS ทุกชั่วโมง

## ตั้งค่า cron-job.org

1. ไปที่ https://cron-job.org → สร้าง Job ใหม่
2. ใส่ค่า:

| Field | Value |
|---|---|
| **URL** | `https://goodhr.onrender.com/api/feishu-users/sync-from-feishu` |
| **Schedule** | Every hour at minute 0 (`0 * * * *`) |
| **Request method** | `POST` |
| **Timezone** | Asia/Bangkok |
| **Failure notification** | ☑ Send email |

3. **HTTP Headers:**
```
Authorization: Bearer 99wTMViSV5eqZ8McjDB86s6JmVZi2IVC
```

4. **Request body** (สามารถปล่อยว่างได้ — endpoint อ่าน param จาก query)
5. **Timeout:** อย่างน้อย 60 วินาที (sync ใช้ ~15-20 วิ + auto-match อีก ~5 วิ)
6. **Save**

## 🧪 ทดสอบ

```bash
curl -X POST "https://goodhr.onrender.com/api/feishu-users/sync-from-feishu" \
  -H "Authorization: Bearer 99wTMViSV5eqZ8McjDB86s6JmVZi2IVC" \
  --max-time 60
```

Response สำเร็จ:
```json
{
  "success": true,
  "fetched_at": "2026-06-16T...",
  "feishu_total": 710,
  "departments": 119,
  "upserted": 710,
  "failed": 0,
  "marked_inactive": 0,
  "auto_match": { "processed": ..., "updated": ..., "matched": {...} }
}
```

## 📋 ที่ Endpoint ทำเมื่อโดนเรียก

1. **เรียก Feishu API** → ดึง 710 บัญชี + leader names
2. **Map 16 ฟิลด์หลัก** + leader_name → `direct_manager_raw`
3. **Upsert** ลง `feishu_users` (key = `feishu_user_id`)
4. **Mark inactive** บัญชีที่หายจาก list
5. **Auto-match** กับพนักงาน GoodHR (email/phone/nickname)
6. **ไม่แตะ** field mapping ของเรา (`goodhr_employee_id`, `manually_verified`, ...)

## 🔄 Trigger แบบอื่น

- **Manual:** หน้า `/admin/feishu-users` → ปุ่ม "ซิงค์จาก Feishu" (สีฟ้า-ม่วง)
- **เมื่อสร้างพนักงานใหม่:** auto-match จะรันใน `/api/employees/create` ตอน create row

## ⚠️ ข้อควรระวัง

- Bearer secret อยู่ใน `.env.local` + ต้องตั้งใน Netlify env เช่นกัน
- ถ้า rate-limit ขึ้น → ลดเป็น 30 นาทีหรือ 2 ชั่วโมงต่อรอบ
- Sync ฝั่ง Feishu ตอบช้า ~15-20 วิ — อย่าตั้ง timeout ต่ำกว่า 30 วิ
