"use client"
/**
 * FeishuImage — โหลดรูปจาก Feishu Drive (ต้อง auth)
 *   ลอง proxy ผ่าน /api/feishu-media
 *   ถ้า upstream proxy ยังไม่เปิด → แสดง fallback icon + "เปิดใน Feishu" link
 *
 *   props:
 *     url: รูปต้นทางจาก Feishu
 *     fileName?: ชื่อไฟล์ (สำหรับ alt)
 *     className?: tailwind class สำหรับ container
 *     onClick?: เปิด lightbox (จะส่ง proxiedUrl ให้)
 */
import { useState } from "react"
import { ExternalLink, ImageOff } from "lucide-react"

const FEISHU_PREFIXES = [
  "https://open.feishu.cn/",
  "https://s1-imfile.feishucdn.com/",
  "https://s3-imfile.feishucdn.com/",
]

export function isFeishuUrl(url: string): boolean {
  return FEISHU_PREFIXES.some(p => url.startsWith(p))
}

export function getFeishuProxyUrl(url: string): string {
  return `/api/feishu-media?url=${encodeURIComponent(url)}`
}

interface Props {
  url: string
  fileName?: string
  className?: string
  onClick?: () => void
}

export default function FeishuImage({ url, fileName, className = "", onClick }: Props) {
  const isFeishu = isFeishuUrl(url)
  const src = isFeishu ? getFeishuProxyUrl(url) : url
  const [error, setError] = useState(false)

  if (error) {
    return (
      <a href={url} target="_blank" rel="noreferrer"
        title="เปิดใน Feishu (ต้อง login)"
        className={`bg-slate-100 border border-dashed border-slate-300 flex flex-col items-center justify-center gap-0.5 text-slate-400 hover:bg-slate-200 transition-colors ${className}`}>
        <ImageOff size={14}/>
        <span className="text-[9px] font-bold flex items-center gap-0.5">
          <ExternalLink size={8}/> Feishu
        </span>
      </a>
    )
  }

  if (onClick) {
    return (
      <button onClick={onClick} className={`overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={fileName || ""}
          onError={() => setError(true)}
          className="w-full h-full object-cover"/>
      </button>
    )
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={fileName || ""}
        onError={() => setError(true)}
        className="w-full h-full object-cover"/>
    </div>
  )
}
