สรุปไฟล์ทั้งหมด
ไฟล์Action🆕checkin/correction/page.tsxสร้างใหม่🆕api/correction/route.tsสร้างใหม่✏️checkin/page.tsxเพิ่มปุ่ม✏️manager/approvals/page.tsxเพิ่ม tab✏️dashboard/page.tsxcard กดได้✏️attendance/page.tsxfilter param🗄️SQL1 ตารางใหม่
🔴 สิ่งที่ต้องแก้ใน Code
1. หน้า Payroll — แก้ OT calculation
ปัญหา: ระบบปัจจุบันเก็บแค่ ot_minutes รวม ไม่แยก rate ปัจจุบันคำนวณ OT ผิด
ต้องแก้:

แยก OT เป็น 3 ประเภท: ot_1_5x_minutes, ot_1_0x_minutes, ot_3_0x_minutes
สูตรคำนวณ: ROUND(salary/30/8/60 × rate × minutes, 2)
เงินเดือน pro-rate ตาม 30 วัน เสมอ

2. หน้า Attendance — grace period ตาม department
ปัญหา: ระบบปัจจุบันใช้ late_minutes ตรงๆ ไม่มี grace period
ต้องแก้:

เพิ่ม logic: ถ้า late_minutes ≤ grace_period → ไม่หัก แต่เก็บสถิติ
Grace period ขึ้นกับ department/company

3. หน้า Settings — Leave Types ตาม Level
ปัญหา: ลาพักร้อนปัจจุบัน set เป็น 1 ค่าคงที่
ต้องแก้:

เพิ่ม field level_based ในประเภทลา
ผูก entitled_days กับ position level ของพนักงาน

4. Settings — เพิ่ม Shift Templates ครบ 22 กะ
ปัญหา: ตอนนี้มีกะน้อยมาก

ต้องการให้แก้ส่วนไหนก่อนครับ? แนะนำลำดับนี้:

Payroll (ผลกระทบเงิน — สำคัญที่สุด)
Late grace period (กฎแตกต่างตาม department)
Leave Types + Level-based annual leave
Bulk import shifts ทั้ง 22 กะ