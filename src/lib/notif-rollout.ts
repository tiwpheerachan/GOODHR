// ── Rollout gate: ใครได้รับแจ้งเตือนบ้าง (เริ่มใช้จริงเฉพาะที่เปิดสิทธิ์) ──
//   kind='all' → ทุกคน · 'employee' → รายคน · 'department' → ทั้งแผนก
//   ไม่มี row เลย = ยังไม่เปิดให้ใคร (นำร่อง) → ไม่มีใครได้รับ (ปลอดภัย)

// คืน Set ของ employee_id ที่ "ได้รับแจ้งเตือน" จากรายชื่อที่ให้มา
export async function enabledRecipientSet(svc: any, employeeIds: string[]): Promise<Set<string>> {
  if (!employeeIds.length) return new Set()
  const { data: rows } = await svc.from("notification_rollout").select("kind, ref_id")
  const list = rows ?? []
  if (list.some((r: any) => r.kind === "all")) return new Set(employeeIds)   // เปิดทุกคน

  const empSet = new Set(list.filter((r: any) => r.kind === "employee").map((r: any) => r.ref_id))
  const deptSet = new Set(list.filter((r: any) => r.kind === "department").map((r: any) => r.ref_id))
  if (empSet.size === 0 && deptSet.size === 0) return new Set()             // ยังไม่เปิดให้ใคร

  const out = new Set<string>()
  const need = employeeIds.filter((id) => !empSet.has(id))                  // คนที่ยังไม่ผ่านทาง employee → เช็คแผนก
  employeeIds.forEach((id) => { if (empSet.has(id)) out.add(id) })
  if (deptSet.size && need.length) {
    for (let i = 0; i < need.length; i += 300) {
      const { data } = await svc.from("employees").select("id, department_id").in("id", need.slice(i, i + 300))
      for (const e of data ?? []) if (e.department_id && deptSet.has(e.department_id)) out.add(e.id)
    }
  }
  return out
}

// กรอง array ของผู้รับ → เหลือเฉพาะคนที่เปิดสิทธิ์รับ (ตาม rollout)
//   getId ดึง employee_id จากแต่ละ item · ถ้าปิด gate (param) ให้ข้าม
export async function filterEnabled<T>(svc: any, items: T[], getId: (t: T) => string | null | undefined): Promise<T[]> {
  if (!items.length) return items
  const ids = items.map(getId).filter(Boolean) as string[]
  const set = await enabledRecipientSet(svc, ids)
  return items.filter((t) => { const id = getId(t); return !!id && set.has(id) })
}

// โหมดปัจจุบัน: 'all' | 'pilot' (มีบางคน) | 'none' (ยังไม่เปิด)
export async function rolloutMode(svc: any): Promise<"all" | "pilot" | "none"> {
  const { data: rows } = await svc.from("notification_rollout").select("kind")
  const list = rows ?? []
  if (list.some((r: any) => r.kind === "all")) return "all"
  return list.length ? "pilot" : "none"
}
