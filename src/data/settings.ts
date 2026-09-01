import { getClient } from '@/lib/supabase'

/** 불리언 설정 조회(없거나 실패 시 기본값). */
export async function getBoolSetting(key: string, fallback: boolean): Promise<boolean> {
  try {
    const db = getClient()
    const { data } = await db.from('app_settings').select('value').eq('key', key).maybeSingle()
    if (!data) return fallback
    return data.value === 'true'
  } catch {
    return fallback
  }
}

export async function setBoolSetting(key: string, value: boolean): Promise<void> {
  const db = getClient()
  const { error } = await db
    .from('app_settings')
    .upsert({ key, value: value ? 'true' : 'false', updated_at: new Date().toISOString() })
  if (error) throw error
}
