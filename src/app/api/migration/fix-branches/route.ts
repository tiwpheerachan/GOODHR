import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

// ── Embedded dedup map (old_id → keep_id) ──
const DEDUP_MAP: Record<string, string> = {"04afd6ff-8cc5-50d1-b5e6-e3c8a8550b42":"99bf10a3-7ce7-4137-af75-e7458b013cc7","dda77ca5-274f-4806-9b35-970acd3d5976":"99bf10a3-7ce7-4137-af75-e7458b013cc7","ef7c7f17-4918-457b-8819-84456f339bd4":"bd6d7328-bcd7-46dd-a9ff-9673814a5669","151eda50-66bd-46b3-8a63-d9e42f9717af":"3657a9df-6194-40fe-b29f-74a91b1e6dd0","300103da-9a71-5c86-a3ec-3a811db3312d":"3657a9df-6194-40fe-b29f-74a91b1e6dd0","29a83ba9-9add-5c5b-a3b9-cf4df985e2a7":"3994f051-29fe-472e-9987-ea839e542d2b","357a212b-29e7-45a3-a79e-4eb9fa732797":"3994f051-29fe-472e-9987-ea839e542d2b","c1c77169-12d7-550b-9b59-52bb59664700":"833dfc01-d99a-4cfa-bc78-cc6e76a27701","47a09bf7-c167-44ef-aebb-ef4372835842":"58978f56-c82c-42ba-ab85-573b54297778","e172cdbf-1a69-59b8-8687-b3e6921762ff":"58978f56-c82c-42ba-ab85-573b54297778","0a6dd444-8ff6-4e2d-8285-184319e72f22":"9c6abd93-d263-4c80-965a-3cd23adc59a4","3bd4e308-bf3a-5ee4-87d6-29700259b87c":"9c6abd93-d263-4c80-965a-3cd23adc59a4","4a73a28d-4f3d-4e61-9357-ccef6870cee6":"a58c51a3-ab57-4e71-9935-a3933d6d94e7","a023fcb8-6cac-5812-8c1a-9ab0b117c36c":"a58c51a3-ab57-4e71-9935-a3933d6d94e7","4a111f3f-624e-447a-8774-8fad766df9f2":"7df62957-549e-4ecb-9bbc-4e9682c89052","8b808126-2615-5f9f-ac30-957b738bcc31":"7df62957-549e-4ecb-9bbc-4e9682c89052","13d33704-4528-5238-b624-763f6d740bfe":"3dceb826-4f1a-4836-bf34-464d1bc264f1","1c64c223-de6b-4d25-9c3b-1c6e379a91cc":"3dceb826-4f1a-4836-bf34-464d1bc264f1","be6287df-7f9d-449c-85dc-3d8fa3caee67":"55a6d6f5-bd12-48f6-aa3a-0c32ead6d2c9","171992ba-9c13-4d7b-a459-20f11a32dd8b":"245fe74e-7f06-46aa-b67c-886c7bdd2af6","ee06b0cf-ee54-5c46-9226-111eb6cbc0be":"245fe74e-7f06-46aa-b67c-886c7bdd2af6","25a95fb7-a785-50fa-b5b1-2c54591aa6ac":"3663000c-7a1c-41fb-9bca-0d6c42b253e6","721d5759-c5b3-445d-be53-0cd212f7b07a":"07cd4e7e-dafc-43ab-8c47-02459c5c8063","0bd72378-c2b4-49ea-bd18-29e9063edfe3":"26aa0fe2-3bf2-49ee-99ce-5dc71f1cb5e9","6c576a7b-089a-59f0-b6b2-a9f4c04629ee":"26aa0fe2-3bf2-49ee-99ce-5dc71f1cb5e9","6a86210f-eea7-4c02-af45-23dc40b0421c":"3480f980-377c-457f-8886-edb04dd623b4","16e46b82-97e7-5fa1-97b4-40c862dd8f45":"b6514065-51ae-4498-b8be-dc90d8d13560","2140af71-7f97-57e5-aead-7451c341765f":"24e5ed9a-de98-438c-8104-217c4052229f","5728df09-8350-5b1b-a56b-83bbfbad44bc":"24e5ed9a-de98-438c-8104-217c4052229f","707b68fa-e3d6-4ee9-abe4-a343c7ee9333":"24e5ed9a-de98-438c-8104-217c4052229f","802a706d-9cbc-4212-96f0-ca7f4dc87ea7":"24e5ed9a-de98-438c-8104-217c4052229f","fe6376f8-801d-4d0b-abed-263bbeaa13a6":"24e5ed9a-de98-438c-8104-217c4052229f","02c7ec93-59ab-4ce3-8ca4-5d4f5a5bcb2e":"24e5ed9a-de98-438c-8104-217c4052229f","02c7ec93-59ad-42e0-87c7-059f947bb626":"24e5ed9a-de98-438c-8104-217c4052229f","21d03dbf-9091-4aff-9ae2-e2e01ec7866e":"931e7fcb-e5fa-49d5-886c-fc027fe4025a","42836a20-2a11-598b-b2f9-e7e243de4c09":"931e7fcb-e5fa-49d5-886c-fc027fe4025a","6cba8814-5f13-5eff-ae2d-b9a876484dd5":"931e7fcb-e5fa-49d5-886c-fc027fe4025a","8d426d73-18ac-488d-957b-f5ca3bdcfb7b":"931e7fcb-e5fa-49d5-886c-fc027fe4025a","ad969d30-503e-56de-9166-a8dc8e191b77":"931e7fcb-e5fa-49d5-886c-fc027fe4025a","b77fdb2c-5a53-47b7-835a-ac08456490b6":"931e7fcb-e5fa-49d5-886c-fc027fe4025a","b4f82564-eb15-5941-b2cf-bf527ab44673":"0da8ec37-411f-449b-a56f-f3516afbb1cf","59cf1700-678f-44f9-8ae6-43e48ef7b5cc":"ba6228df-8e6d-4509-8359-77a98c72f019","699027f8-14d8-4938-af98-2e17676e8f8a":"17bb5eb9-505e-4f04-a3bf-5974a29ae305","6fdbf3bb-e6b5-5a80-82e2-ab389858bc7c":"17bb5eb9-505e-4f04-a3bf-5974a29ae305","e51f7458-ddec-4578-89aa-503dd36bc67c":"17bb5eb9-505e-4f04-a3bf-5974a29ae305","e7c08087-65a5-5a9a-9a04-78608d810732":"17bb5eb9-505e-4f04-a3bf-5974a29ae305","f0744ed5-7b9e-5c5d-9559-2ac2ceec8c41":"17bb5eb9-505e-4f04-a3bf-5974a29ae305","0d8eadc3-1961-42d8-959a-76bba8de5dee":"d98dddb3-7b51-4844-be85-12a0dfa6718f","b59d8328-bc9e-5290-8402-9232b7180726":"f769cda0-7d48-4d61-bf59-225120f0a68d","7ffc07bf-76b2-4e9b-9994-d228c1115aba":"82224bfc-36d9-4dd1-857f-b1739659bb79","a8b5cc03-208b-5a4a-9e14-90b2fd3831f1":"82224bfc-36d9-4dd1-857f-b1739659bb79","52c22910-daf0-41ad-b47f-63c9811f8317":"165c84b5-add4-4bfe-a1ac-931cb497ced9","1480b5ad-a74d-4d1a-a6e9-8415fe80e2c3":"d0bb0944-08c6-480c-8750-025ed83dd0f3"}

const ICS_MALL_ID = "24e5ed9a-de98-438c-8104-217c4052229f"

export async function POST(req: NextRequest) {
  try {
    const { step, confirm } = await req.json()
    if (confirm !== "YES_FIX") return NextResponse.json({ error: "Confirmation required" }, { status: 400 })

    const supa = createServiceClient()

    if (step === "dedup_branches") {
      let remapped = 0, deleted = 0
      const errors: string[] = []

      // 1. Remap employees.branch_id
      for (const [oldId, keepId] of Object.entries(DEDUP_MAP)) {
        const { data: affected } = await supa.from("employees")
          .select("id").eq("branch_id", oldId)
        if (affected?.length) {
          const { error } = await supa.from("employees")
            .update({ branch_id: keepId })
            .eq("branch_id", oldId)
          if (error) errors.push(`emp ${oldId.slice(0,8)}: ${error.message}`)
          else remapped += affected.length
        }
      }

      // 2. Remap employee_allowed_locations.branch_id
      for (const [oldId, keepId] of Object.entries(DEDUP_MAP)) {
        await supa.from("employee_allowed_locations")
          .update({ branch_id: keepId })
          .eq("branch_id", oldId)
      }

      // 3. Delete duplicate branches
      for (const oldId of Object.keys(DEDUP_MAP)) {
        const { error } = await supa.from("branches").delete().eq("id", oldId)
        if (error) {
          await supa.from("branches").update({ is_active: false }).eq("id", oldId)
        } else {
          deleted++
        }
      }

      return NextResponse.json({
        step: "dedup_branches",
        remapped_employees: remapped,
        deleted_branches: deleted,
        dedup_count: Object.keys(DEDUP_MAP).length,
        errors: errors.slice(0, 10),
      })
    }

    if (step === "assign_locations") {
      const { data: emps } = await supa.from("employees")
        .select("id, branch_id, company_id")
        .eq("is_active", true)

      if (!emps?.length) return NextResponse.json({ step: "assign_locations", ok: 0 })

      // Delete existing
      for (const emp of emps) {
        await supa.from("employee_allowed_locations").delete().eq("employee_id", emp.id)
      }

      let ok = 0, fail = 0
      const rows: any[] = []

      for (const emp of emps) {
        rows.push({ employee_id: emp.id, branch_id: ICS_MALL_ID })
        if (emp.branch_id && emp.branch_id !== ICS_MALL_ID) {
          rows.push({ employee_id: emp.id, branch_id: emp.branch_id })
        }
      }

      for (let i = 0; i < rows.length; i += 500) {
        const chunk = rows.slice(i, i + 500)
        const { error } = await supa.from("employee_allowed_locations").insert(chunk)
        if (error) {
          for (const row of chunk) {
            const { error: e2 } = await supa.from("employee_allowed_locations").insert(row)
            if (e2) fail++; else ok++
          }
        } else {
          ok += chunk.length
        }
      }

      return NextResponse.json({
        step: "assign_locations",
        employees: emps.length,
        locations_created: ok,
        fail,
        ics_mall_id: ICS_MALL_ID,
      })
    }

    return NextResponse.json({ error: "Unknown step" }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
