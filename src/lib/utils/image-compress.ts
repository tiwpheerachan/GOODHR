// บีบอัดรูปฝั่ง client ก่อนอัปโหลด — ลดขนาดไฟล์/ประหยัด storage + เร็วบนเน็ตช้า
//   ย่อด้านยาวสุดไม่เกิน maxDim, คุณภาพ quality, output JPEG
//   ถ้าไม่ใช่รูป หรือบีบแล้วใหญ่กว่าเดิม → คืนไฟล์เดิม
export async function compressImage(file: File, maxDim = 1600, quality = 0.8): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file
  try {
    const bitmap = await createImageBitmap(file).catch(() => null)
    if (!bitmap) return file
    let { width, height } = bitmap
    if (width > maxDim || height > maxDim) {
      const scale = maxDim / Math.max(width, height)
      width = Math.round(width * scale); height = Math.round(height * scale)
    }
    const canvas = document.createElement("canvas")
    canvas.width = width; canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    bitmap.close?.()
    const blob: Blob | null = await new Promise(res => canvas.toBlob(res, "image/jpeg", quality))
    if (!blob || blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() })
  } catch { return file }
}
