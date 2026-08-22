import { getClient } from '@/lib/supabase'

const BUCKET = 'mission-photos'

/** 미션 완료 사진을 Storage에 올리고 public URL을 돌려준다. */
export async function uploadMissionPhoto(
  file: File,
  date: string,
  sourceId: string
): Promise<string> {
  const db = getClient()
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${date}/${sourceId}-${Date.now()}.${ext}`
  const { error } = await db.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/jpeg',
  })
  if (error) throw error
  const { data } = db.storage.from(BUCKET).getPublicUrl(path)
  return data.publicUrl
}
