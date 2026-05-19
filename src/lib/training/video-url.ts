// ════════════════════════════════════════════════════════════════════
// Video URL Parser — รับ URL จากผู้ใช้, detect แหล่ง, คืน embed URL
// รองรับ: YouTube, Vimeo, Google Drive (shared), MP4 direct URL
// ════════════════════════════════════════════════════════════════════

export type VideoSource =
  | { type: "youtube"; embedUrl: string; videoId: string }
  | { type: "vimeo"; embedUrl: string; videoId: string }
  | { type: "drive"; embedUrl: string; fileId: string }
  | { type: "direct"; embedUrl: string }    // MP4/WebM URL ตรง
  | { type: "supabase"; embedUrl: string }  // อัปโหลดในระบบ
  | { type: "unknown"; embedUrl: string }

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""

export function parseVideoUrl(url: string): VideoSource {
  if (!url) return { type: "unknown", embedUrl: "" }
  const trimmed = url.trim()

  // ── Supabase Storage URL ─────────────────────────────────────────
  if (SUPABASE_URL && trimmed.startsWith(SUPABASE_URL)) {
    return { type: "supabase", embedUrl: trimmed }
  }

  // ── YouTube ─────────────────────────────────────────────────────
  // รองรับ: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
  const ytMatch = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
  if (ytMatch) {
    const id = ytMatch[1]
    return {
      type: "youtube",
      videoId: id,
      // rel=0: ไม่แนะนำคลิปอื่น, modestbranding=1: ลด YouTube branding
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&enablejsapi=1`,
    }
  }

  // ── Vimeo ───────────────────────────────────────────────────────
  // รองรับ: vimeo.com/123456, player.vimeo.com/video/123456
  const vimeoMatch = trimmed.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/)
  if (vimeoMatch) {
    const id = vimeoMatch[1]
    return {
      type: "vimeo",
      videoId: id,
      embedUrl: `https://player.vimeo.com/video/${id}?byline=0&portrait=0&title=0`,
    }
  }

  // ── Google Drive ────────────────────────────────────────────────
  // รองรับ: drive.google.com/file/d/ID/view, drive.google.com/open?id=ID
  const driveMatch = trimmed.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/)
  if (driveMatch) {
    const id = driveMatch[1]
    return {
      type: "drive",
      fileId: id,
      embedUrl: `https://drive.google.com/file/d/${id}/preview`,
    }
  }

  // ── Direct video URL (MP4/WebM/MOV) ─────────────────────────────
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(trimmed)) {
    return { type: "direct", embedUrl: trimmed }
  }

  // ── Unknown — assume direct ─────────────────────────────────────
  return { type: "unknown", embedUrl: trimmed }
}

// ── Display name ──────────────────────────────────────────────────
export function videoSourceName(type: VideoSource["type"]): string {
  return {
    youtube:  "YouTube",
    vimeo:    "Vimeo",
    drive:    "Google Drive",
    direct:   "ลิงก์วิดีโอตรง",
    supabase: "อัปโหลดในระบบ",
    unknown:  "ลิงก์อื่นๆ",
  }[type]
}

// ── เช็คว่ารองรับ checkpoint/watch-tracking ไหม ──────────────────
// supabase/direct (HTML5 video) + youtube (ใช้ IFrame API) → รองรับ
// vimeo/drive → ยังไม่รองรับ (ต้องใช้ Vimeo Player SDK / no API)
export function supportsCheckpoint(type: VideoSource["type"]): boolean {
  return type === "supabase" || type === "direct" || type === "youtube"
}
