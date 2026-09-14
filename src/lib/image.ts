/** 업로드 전 이미지 리사이즈/압축. 폭·높이를 maxDim 이하로 줄여 JPEG로 변환. */
export async function compressImage(
  file: File,
  maxDim = 1600,
  quality = 0.8
): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const { width, height, draw } = await decode(file)
    if (!width || !height) return file
    const scale = Math.min(1, maxDim / Math.max(width, height))
    if (scale >= 1 && file.size < 800_000) return file // 이미 작으면 그대로
    const w = Math.max(1, Math.round(width * scale))
    const h = Math.max(1, Math.round(height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    draw(ctx, w, h)
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob((b) => res(b), 'image/jpeg', quality)
    )
    if (!blob || blob.size === 0) return file
    // 압축 결과가 원본보다 크면(작은 원본 등) 원본 유지
    if (blob.size >= file.size) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    return file // 실패 시 원본 사용
  }
}

type Decoded = {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
}

/** createImageBitmap 우선, 실패 시 <img> 폴백(대용량·일부 브라우저 호환). */
async function decode(file: File): Promise<Decoded> {
  // 1) createImageBitmap (빠름)
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      if (bitmap.width && bitmap.height) {
        return {
          width: bitmap.width,
          height: bitmap.height,
          draw: (ctx, w, h) => {
            ctx.drawImage(bitmap, 0, 0, w, h)
            bitmap.close?.()
          },
        }
      }
      bitmap.close?.()
    } catch {
      /* 폴백으로 */
    }
  }
  // 2) <img> 폴백
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('image load failed'))
      el.src = url
    })
    const width = img.naturalWidth
    const height = img.naturalHeight
    return {
      width,
      height,
      draw: (ctx, w, h) => {
        ctx.drawImage(img, 0, 0, w, h)
        URL.revokeObjectURL(url)
      },
    }
  } catch (e) {
    URL.revokeObjectURL(url)
    throw e
  }
}
