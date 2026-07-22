# GOODHR Bot — สเปกเมนู "อยากรู้" (on-demand) สำหรับ risemanu

ทุก endpoint: `GET https://goodhr.onrender.com/api/feishu-notify/...`
Header: `Authorization: Bearer <FEISHU_BOT_SECRET>`

## ⚠️ กติกา ID (สำคัญสุด — เหตุผลที่กดแล้วไม่แสดงผล)
เรา resolve ด้วย **`feishu_user_id` = user_id แบบสั้น** (เช่น `3a7b99a4`) ตรงกับ `feishu_users.feishu_user_id`
- ตอนคนกดเมนู Feishu ส่ง event ที่มัก**ให้ open_id (`ou_...`)**
- บอทต้องส่ง **user_id** ไม่ใช่ open_id → ถ้ามีแค่ open_id ให้เรียก Feishu API
  `GET /open-apis/contact/v3/users/:open_id?user_id_type=user_id` แปลง open_id → user_id ก่อน
- หรือส่ง `email=` แทนก็ได้ (เรารองรับ resolve by email)

---

## เมนูพนักงาน (ทุกคน)

### 1) My Profile
```
GET /resolve?feishu_user_id=<user_id>
```
คืน: `employee{name,employee_code,department,branch,position}`, `role`, `manager{name,feishu_user_id}`

### 2) My Attendance
```
GET /my-attendance?feishu_user_id=<user_id>&range=month   (range: today|week|month)
```
คืน: `summary{present,late,absent,on_leave,ot_minutes...}`, `records[]{work_date,status,clock_in,clock_out}`

### 3) My Leave Balance
```
GET /my-leave-balance?feishu_user_id=<user_id>&year=2026
```
คืน: `balances[]{type,entitled,used,pending,remaining}` (⚠️ ไม่มีข้อมูลเงินเดือน)

---

## เมนูหัวหน้า (Leader)

### 4) Pending Approvals (Leader)
```
GET /pending-approvals?manager_feishu_id=<user_id>
```
คืน: `managers[]{manager, counts{leave,ot,adjustment,offsite}, items[]{type,employee_name,date}}`
(offsite นับเฉพาะ 3 วันล่าสุด กัน backlog เก่าถล่ม)

### 5) Team Today
```
GET /team-attendance?manager_feishu_id=<user_id>
```
คืน: `summary{team_size,present,late,on_leave,absent,not_checked_in}`, `members[]{name,status,clock_in,clock_out}`

---

## ตัวอย่าง flow (บอทควรทำ)
```
คนกดเมนู "My Leave Balance"
  → บอทได้ open_id ของคนกด
  → แปลงเป็น user_id (ถ้าจำเป็น)
  → GET /my-leave-balance?feishu_user_id=<user_id>
  → ได้ JSON → render เป็นการ์ด → ส่งกลับหาคนนั้น
```

## เช็คด่วนถ้ายังไม่แสดงผล
1. ลองยิง endpoint ตรงด้วย user_id จริง (เช่น `3a7b99a4`) — ถ้าได้ 200+data = ฝั่งเราโอเค
2. ถ้าบอทส่ง `ou_...` มา จะได้ 404 "ไม่พบพนักงาน" → นี่คือสาเหตุ ให้แปลงเป็น user_id
3. 206/389 คนมี Feishu ID จริง (ที่เหลือไม่มีบัญชี Feishu) — คนนอกกลุ่มนี้จะ resolve ไม่เจอ (ปกติ)
