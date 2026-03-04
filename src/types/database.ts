export type UserRole = "super_admin" | "hr_admin" | "manager" | "employee"
export type EmploymentStatus = "active" | "probation" | "resigned" | "terminated" | "on_leave" | "suspended"
export type AttendanceStatus = "present" | "absent" | "late" | "early_out" | "leave" | "holiday" | "day_off" | "wfh"
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled"
export type RequestStatus = "pending" | "approved" | "rejected" | "cancelled"

export interface Company { id: string; code: string; name_th: string; name_en?: string; logo_url?: string; is_active: boolean }
export interface Branch { id: string; company_id: string; name: string; latitude?: number; longitude?: number; geo_radius_m: number; timezone: string }
export interface Department { id: string; company_id: string; name: string; code: string }
export interface Position { id: string; company_id: string; name: string; code: string; is_flex_time: boolean }

export interface Employee {
  id: string; company_id: string; branch_id?: string; department_id?: string; position_id?: string
  employee_code: string; first_name_th: string; last_name_th: string
  first_name_en?: string; last_name_en?: string; nickname?: string
  email?: string; phone?: string; avatar_url?: string; address?: string
  birth_date?: string; national_id?: string; gender?: string
  employment_status: EmploymentStatus; employment_type: string
  hire_date: string; probation_end_date?: string; resign_date?: string
  bank_account?: string; bank_name?: string; tax_id?: string; social_security_no?: string
  is_active: boolean; created_at: string; updated_at: string
  company?: Company; branch?: Branch; department?: Department; position?: Position
}

export interface ShiftTemplate {
  id: string; company_id: string; name: string; shift_type: string
  work_start: string; work_end: string; is_overnight: boolean
  flex_start_from?: string; flex_start_until?: string
  break_minutes: number; total_hours?: number; ot_start_after_minutes: number
}

export interface AttendanceRecord {
  id: string; employee_id: string; work_date: string; company_id: string
  clock_in?: string; clock_out?: string
  clock_in_lat?: number; clock_in_lng?: number; clock_in_distance_m?: number; clock_in_valid?: boolean
  late_minutes: number; early_out_minutes: number; work_minutes: number; ot_minutes: number
  status: AttendanceStatus; note?: string; is_manual: boolean
  employee?: Employee; shift?: ShiftTemplate
}

export interface LeaveType {
  id: string; company_id: string; code: string; name: string
  is_paid: boolean; days_per_year?: number; carry_over: boolean
  require_document: boolean; color_hex?: string; is_active: boolean
}

export interface LeaveBalance {
  id: string; employee_id: string; leave_type_id: string; year: number
  entitled_days: number; used_days: number; pending_days: number
  carried_over: number; remaining_days: number; leave_type?: LeaveType
}

export interface LeaveRequest {
  id: string; employee_id: string; company_id: string; leave_type_id: string
  start_date: string; end_date: string; total_days: number
  is_half_day: boolean; half_day_period?: string; reason?: string
  status: LeaveStatus; requested_at: string
  reviewed_by?: string; reviewed_at?: string; review_note?: string
  created_at: string; employee?: Employee; leave_type?: LeaveType
}

export interface SalaryStructure {
  id: string; employee_id: string; base_salary: number
  allowance_position: number; allowance_transport: number; allowance_food: number
  allowance_phone: number; allowance_housing: number
  ot_rate_normal: number; ot_rate_holiday: number
  effective_from: string; effective_to?: string; change_reason?: string
}

export interface PayrollRecord {
  id: string; payroll_period_id: string; employee_id: string; company_id: string
  year: number; month: number
  base_salary: number; gross_income?: number; net_salary?: number
  social_security_amount?: number; monthly_tax_withheld?: number
  total_deductions?: number; deduct_late: number; deduct_absent: number
  ot_amount: number; ot_hours: number; leave_paid_days: number; leave_unpaid_days: number
  present_days?: number; absent_days?: number; late_count?: number
  status: string; employee?: Employee
}

export interface Notification {
  id: string; employee_id: string; type: string; title: string
  body?: string; ref_table?: string; ref_id?: string
  is_read: boolean; read_at?: string; created_at: string
}

export interface User {
  id: string; employee_id?: string; role: UserRole
  company_id?: string; is_active: boolean; employee?: Employee
}
