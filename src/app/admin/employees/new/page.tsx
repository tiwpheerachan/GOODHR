"use client"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
export default function Page() { return (<div className="space-y-6"><div className="flex items-center gap-4"><Link href="/admin/employees" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={18}/></Link><h2 className="text-2xl font-bold">เพิ่มพนักงานใหม่</h2></div><div className="bg-white rounded-2xl p-6 border border-slate-100"><p className="text-slate-500 text-sm">TODO: Implement new employee form</p></div></div>) }
