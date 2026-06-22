import { createClient, createServiceClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { logEmployeeChange } from "@/lib/auditLog"

export async function POST(req: Request) {
  try {
    // ใช้ cookie client สำหรับตรวจสิทธิ์ caller
    const cookieClient = createClient()
    const { data: { user: caller } } = await cookieClient.auth.getUser()
    if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // ใช้ service role client สำหรับ admin operations ทั้งหมด
    const supabase = createServiceClient()

    const body = await req.json()
    const {
      email, password,
      title_th,
      first_name_th, last_name_th, first_name_en, last_name_en,
      nickname, phone, address, national_id, gender, birth_date,
      nationality, religion,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
      bank_account, bank_name, tax_id, social_security_no,
      employee_code, hire_date, probation_end_date,
      employment_type, employment_status,
      company_id, branch_id, department_id, position_id,
      base_salary, allowance_position, allowance_transport,
      allowance_food, allowance_phone, allowance_housing, allowance_vehicle,
      ot_rate_normal, ot_rate_holiday, tax_withholding_pct,
      kpi_standard_amount,
      // post-probation promotion
      post_base_salary, post_allowance_position, post_allowance_transport,
      post_allowance_food, post_allowance_phone, post_allowance_housing, post_allowance_vehicle,
      post_ot_rate_normal, post_ot_rate_holiday, post_tax_withholding_pct,
      post_position_id, post_kpi_amount,
      supervisor_id,
      role,
      // schedule
      schedule_type, default_shift_id, fixed_dayoffs, can_self_schedule,
      // checkin settings
      checkin_anywhere, is_attendance_exempt,
      allowed_branch_ids,
      // Feishu data (optional — กรอกในขั้นตอนที่ 4 ของ form หรือเว้นไว้กรอกย้อนหลังในแท็บ Feishu Link)
      feishu,
    } = body

    // Validate: ป้องกันปี พ.ศ. (> 2100)
    for (const [val, label] of [[hire_date, "วันเริ่มงาน"], [probation_end_date, "สิ้นสุดทดลองงาน"], [birth_date, "วันเกิด"]]) {
      if (val && parseInt(String(val).split("-")[0]) > 2100) {
        return NextResponse.json({ error: `${label}: ปีต้องเป็น ค.ศ. (เช่น 2026) ไม่ใช่ พ.ศ.` }, { status: 400 })
      }
    }

    // 1. สร้าง auth user (ต้องใช้ service role)
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email,
      password: password || Math.random().toString(36).slice(-8) + "A1!",
      email_confirm: true,
      user_metadata: { full_name: `${first_name_th} ${last_name_th}` },
    })
    if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })

    const authId = authData.user.id

    // 2. ตรวจสอบรหัสพนักงานซ้ำก่อน insert
    if (employee_code) {
      const { data: existingEmp } = await supabase
        .from("employees")
        .select("id, first_name_th, last_name_th")
        .eq("company_id", company_id)
        .eq("employee_code", employee_code)
        .maybeSingle()
      if (existingEmp) {
        await supabase.auth.admin.deleteUser(authId)
        return NextResponse.json({
          error: `รหัสพนักงาน "${employee_code}" ถูกใช้งานแล้วโดย ${existingEmp.first_name_th} ${existingEmp.last_name_th} — กรุณาใช้รหัสอื่น`,
        }, { status: 409 })
      }
    }

    // 3. สร้าง employee record
    const { data: emp, error: empErr } = await supabase.from("employees").insert({
      company_id, branch_id: branch_id || null,
      department_id: department_id || null,
      position_id: position_id || null,
      employee_code,
      title_th: title_th || null,
      first_name_th, last_name_th,
      first_name_en: first_name_en || null, last_name_en: last_name_en || null,
      nickname: nickname || null, phone: phone || null,
      email, address: address || null,
      national_id: national_id || null, gender: gender || null,
      birth_date: birth_date || null,
      nationality: nationality || null,
      religion: religion || null,
      emergency_contact_name: emergency_contact_name || null,
      emergency_contact_phone: emergency_contact_phone || null,
      emergency_contact_relation: emergency_contact_relation || null,
      bank_account: bank_account || null, bank_name: bank_name || null,
      tax_id: tax_id || null, social_security_no: social_security_no || null,
      hire_date, probation_end_date: probation_end_date || null,
      supervisor_id: supervisor_id || null,
      employment_type: employment_type || "full_time",
      employment_status: employment_status || "probation",
      is_active: true,
      checkin_anywhere: !!checkin_anywhere,
      is_attendance_exempt: !!is_attendance_exempt,
      can_self_schedule: !!can_self_schedule,
    }).select().single()
    if (empErr) {
      await supabase.auth.admin.deleteUser(authId)
      const isDuplicate = empErr.message?.includes("employees_company_id_employee_code_key")
      return NextResponse.json({
        error: isDuplicate
          ? `รหัสพนักงาน "${employee_code}" ซ้ำในระบบ — กรุณาใช้รหัสอื่น`
          : empErr.message,
      }, { status: isDuplicate ? 409 : 400 })
    }

    // 3. สร้าง users record
    const { error: userErr } = await supabase.from("users").insert({
      id: authId,
      employee_id: emp.id,
      company_id,
      role: role || "employee",
    })
    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })

    // 3.5 สร้าง employee_manager_history ถ้ามีหัวหน้า
    if (supervisor_id) {
      // หา employee_id ของ caller สำหรับ created_by
      const { data: callerUser } = await supabase.from("users").select("employee_id").eq("id", caller.id).maybeSingle()
      await supabase.from("employee_manager_history").insert({
        employee_id: emp.id,
        manager_id: supervisor_id,
        effective_from: hire_date,
        created_by: callerUser?.employee_id ?? null,
      })
    }

    // 4. สร้าง salary structure ถ้ามี
    if (base_salary) {
      await supabase.from("salary_structures").insert({
        employee_id: emp.id,
        base_salary: +base_salary,
        allowance_position: +(allowance_position || 0),
        allowance_transport: +(allowance_transport || 0),
        allowance_food: +(allowance_food || 0),
        allowance_phone: +(allowance_phone || 0),
        allowance_housing: +(allowance_housing || 0),
        allowance_vehicle: +(allowance_vehicle || 0),
        ot_rate_normal: ot_rate_normal ? +ot_rate_normal : 1.5,
        ot_rate_holiday: ot_rate_holiday ? +ot_rate_holiday : 3.0,
        tax_withholding_pct: tax_withholding_pct != null && tax_withholding_pct !== "" ? +tax_withholding_pct : null,
        effective_from: hire_date,
      })
    }

    // 5. สร้าง leave balances จาก leave_types ของ company
    const { data: leaveTypes } = await supabase.from("leave_types")
      .select("id, days_per_year").eq("company_id", company_id).eq("is_active", true)
    const year = new Date().getFullYear()
    if (leaveTypes && leaveTypes.length > 0) {
      await supabase.from("leave_balances").insert(
        leaveTypes.map((lt: any) => ({
          employee_id: emp.id,
          leave_type_id: lt.id,
          year,
          entitled_days: lt.days_per_year || 0,
          used_days: 0, pending_days: 0, carried_over: 0,
          remaining_days: lt.days_per_year || 0,
        }))
      )
    }

    // 5.5 บันทึก post-probation promotion settings ถ้ามี
    const hasPromo = post_base_salary || post_position_id || post_kpi_amount != null
    if (hasPromo) {
      await supabase.from("employee_probation_promotions").insert({
        employee_id: emp.id,
        company_id,
        base_salary:           post_base_salary           ? +post_base_salary           : null,
        allowance_position:    post_allowance_position    != null && post_allowance_position    !== "" ? +post_allowance_position    : null,
        allowance_transport:   post_allowance_transport   != null && post_allowance_transport   !== "" ? +post_allowance_transport   : null,
        allowance_food:        post_allowance_food        != null && post_allowance_food        !== "" ? +post_allowance_food        : null,
        allowance_phone:       post_allowance_phone       != null && post_allowance_phone       !== "" ? +post_allowance_phone       : null,
        allowance_housing:     post_allowance_housing     != null && post_allowance_housing     !== "" ? +post_allowance_housing     : null,
        allowance_vehicle:     post_allowance_vehicle     != null && post_allowance_vehicle     !== "" ? +post_allowance_vehicle     : null,
        ot_rate_normal:        post_ot_rate_normal        ? +post_ot_rate_normal        : null,
        ot_rate_holiday:       post_ot_rate_holiday       ? +post_ot_rate_holiday       : null,
        tax_withholding_pct:   post_tax_withholding_pct  != null && post_tax_withholding_pct !== "" ? +post_tax_withholding_pct : null,
        new_position_id:       post_position_id           || null,
        kpi_standard_amount:   post_kpi_amount            != null && post_kpi_amount !== "" ? +post_kpi_amount : null,
        is_applied: false,
        created_by: caller.id,
      })
    }

    // 6. สร้าง KPI bonus settings ถ้ามี
    if (kpi_standard_amount && +kpi_standard_amount > 0) {
      await supabase.from("kpi_bonus_settings").insert({
        employee_id: emp.id,
        company_id,
        standard_amount: +kpi_standard_amount,
        effective_from: hire_date,
        is_active: true,
      })
    }

    // 7. สร้าง schedule profile + can_self_schedule
    if (schedule_type) {
      await supabase.from("employee_schedule_profiles").upsert({
        employee_id: emp.id,
        company_id,
        schedule_type: schedule_type || "fixed",
        default_shift_id: default_shift_id || null,
        fixed_dayoffs: Array.isArray(fixed_dayoffs) ? fixed_dayoffs : [],
      }, { onConflict: "employee_id" })
    }
    // 8. สร้าง employee_allowed_locations สำหรับเช็คอิน
    if (Array.isArray(allowed_branch_ids) && allowed_branch_ids.length > 0) {
      const callerUser2 = await supabase.from("users").select("employee_id").eq("id", caller.id).maybeSingle()
      await supabase.from("employee_allowed_locations").insert(
        allowed_branch_ids.map((bid: string) => ({
          employee_id: emp.id,
          branch_id: bid,
          created_by: callerUser2?.data?.employee_id ?? null,
        }))
      )
    }

    // 9. สร้าง feishu_users row + auto-link → goodhr_employee_id (ถ้า admin กรอกข้อมูล Feishu)
    let feishuWarning: string | null = null
    if (feishu && typeof feishu === "object" && feishu.feishu_user_id) {
      const fuId = String(feishu.feishu_user_id).trim()
      const fuName = (feishu.name || "").trim() || fuId
      // ตรวจสอบซ้ำ — feishu_user_id เป็น UNIQUE
      const { data: existing } = await supabase.from("feishu_users")
        .select("id, goodhr_employee_id, name").eq("feishu_user_id", fuId).maybeSingle()
      if (existing) {
        feishuWarning = `Feishu User ID "${fuId}" มีอยู่แล้วในระบบ (ผูกกับ "${existing.name}"${existing.goodhr_employee_id ? " ซึ่ง link กับพนักงานคนอื่น" : ""}) — ข้ามการสร้าง Feishu row, สามารถ link ด้วยตนเองในแท็บ 🔗 Feishu Link`
      } else {
        const norm = (s: any) => {
          if (s == null) return null
          const v = String(s).trim()
          return v ? v : null
        }
        const normEmail = (s: any) => {
          const v = norm(s); return v ? v.toLowerCase() : null
        }
        const { error: fErr } = await supabase.from("feishu_users").insert({
          feishu_user_id:    fuId,
          name:              fuName,
          name_cn:           norm(feishu.name_cn),
          name_en:           norm(feishu.name_en),
          nickname:          norm(feishu.nickname),
          employee_number:   norm(feishu.employee_number),
          email:             normEmail(feishu.email),
          email_work:        normEmail(feishu.email_work),
          email_business:    normEmail(feishu.email_business),
          phone:             norm(feishu.phone),
          department_path:   norm(feishu.department_path),
          job_title:         norm(feishu.job_title),
          workforce_type:    norm(feishu.workforce_type),
          start_date:        feishu.start_date || null,
          gender:            norm(feishu.gender),
          city:              norm(feishu.city),
          status:            norm(feishu.status) || "Active",
          brand:             norm(feishu.brand),
          mentor:            norm(feishu.mentor),
          direct_manager_raw: norm(feishu.direct_manager_raw),
          // ── auto-link → newly created GoodHR employee ──
          goodhr_employee_id: emp.id,
          match_method:       "manual",
          match_confidence:   100,
          matched_at:         new Date().toISOString(),
          manually_verified:  true,
          match_note:         "Created via new employee form",
        })
        if (fErr) {
          feishuWarning = `สร้าง Feishu user ไม่สำเร็จ: ${fErr.message} — สามารถ link ด้วยตนเองในแท็บ 🔗 Feishu Link`
        }
      }
    }

    // ── 9.5 Auto-match — ถ้า admin ไม่ได้กรอก Feishu data → ลอง match อัตโนมัติกับ feishu_users ที่มี ──
    //    จับด้วย email/phone/nickname/first_name_en (กฎเดียวกับ /api/feishu-users/auto-match)
    let autoMatchedFeishu: { feishu_user_id: string; name: string; method: string; confidence: number } | null = null
    if (!feishu?.feishu_user_id) {
      try {
        const normPhone = (p: string | null | undefined): string => {
          if (!p) return ""
          return String(p).replace(/[\s\-()]/g, "").replace(/^\+?66/, "0").replace(/^\+?86/, "")
        }
        const empEmail   = email ? String(email).trim().toLowerCase() : ""
        const empPhone   = normPhone(phone)
        const empNickEn  = (body.nickname_en || "").trim().toLowerCase()
        const empNickTh  = (nickname || "").trim().toLowerCase()
        const empFNameEn = (first_name_en || "").trim().toLowerCase()

        // ดึงเฉพาะ feishu_users ที่ยังไม่ link
        const { data: candidates } = await supabase.from("feishu_users")
          .select("feishu_user_id, name, name_en, nickname, email, email_work, email_business, phone")
          .is("goodhr_employee_id", null)

        let pick: { row: any; method: string; confidence: number } | null = null
        for (const r of (candidates ?? [])) {
          // 1) email
          if (empEmail && (
            (r.email && r.email.toLowerCase() === empEmail) ||
            (r.email_work && r.email_work.toLowerCase() === empEmail) ||
            (r.email_business && r.email_business.toLowerCase() === empEmail)
          )) { pick = { row: r, method: "email", confidence: 95 }; break }
          // 2) phone
          if (empPhone && r.phone) {
            const rp = normPhone(r.phone)
            if (rp && rp.length >= 8 && rp === empPhone) { pick = { row: r, method: "phone", confidence: 93 }; break }
          }
          // 3) nickname (en > th)
          if (empNickEn && r.nickname && r.nickname.toLowerCase() === empNickEn) {
            if (!pick || pick.confidence < 88) pick = { row: r, method: "nickname", confidence: 88 }
          }
          if (empNickTh && r.nickname && r.nickname.toLowerCase() === empNickTh) {
            if (!pick || pick.confidence < 75) pick = { row: r, method: "nickname", confidence: 75 }
          }
          // 4) first_name_en ↔ name_en
          if (empFNameEn && r.name_en && r.name_en.toLowerCase() === empFNameEn) {
            if (!pick || pick.confidence < 78) pick = { row: r, method: "name_en", confidence: 78 }
          }
        }

        if (pick) {
          const { error } = await supabase.from("feishu_users").update({
            goodhr_employee_id: emp.id,
            match_method: pick.method,
            match_confidence: pick.confidence,
            matched_at: new Date().toISOString(),
          }).eq("feishu_user_id", pick.row.feishu_user_id)
            .eq("manually_verified", false)
          if (!error) {
            autoMatchedFeishu = {
              feishu_user_id: pick.row.feishu_user_id,
              name: pick.row.name,
              method: pick.method,
              confidence: pick.confidence,
            }
          }
        }
      } catch {
        // best-effort — ไม่ block การสร้างพนักงาน
      }
    }

    // Audit log
    const { data: actorUser } = await supabase.from("users").select("employee_id, employee:employees(first_name_th, last_name_th)").eq("id", caller.id).single()
    const ae = actorUser?.employee as any
    logEmployeeChange(supabase, {
      actorId: actorUser?.employee_id || caller.id,
      actorName: ae ? `${ae.first_name_th} ${ae.last_name_th}` : undefined,
      action: "create",
      employeeId: emp.id,
      employeeName: `${first_name_th} ${last_name_th}`,
      companyId: company_id,
    })

    return NextResponse.json({
      employee_id: emp.id,
      auth_id: authId,
      ...(feishuWarning ? { feishu_warning: feishuWarning } : {}),
      ...(autoMatchedFeishu ? { feishu_auto_matched: autoMatchedFeishu } : {}),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}