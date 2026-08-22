import { getClient } from '@/lib/supabase'
import type { Completion, SourceType } from '@/domain/types'

const COLS = 'id,date,source_type,source_id,done_by,photo_url,done_at'

export async function listCompletionsByDate(date: string): Promise<Completion[]> {
  const db = getClient()
  const { data, error } = await db.from('completions').select(COLS).eq('date', date)
  if (error) throw error
  return (data ?? []) as Completion[]
}

export async function addCompletion(input: {
  date: string
  source_type: SourceType
  source_id: string
  done_by: string
  photo_url: string
}): Promise<{ ok: boolean; reason?: string }> {
  const db = getClient()
  const { error } = await db.from('completions').insert({
    date: input.date,
    source_type: input.source_type,
    source_id: input.source_id,
    done_by: input.done_by,
    photo_url: input.photo_url,
  })
  if (error) {
    // unique(date, source_type, source_id) 위반 = 이미 다른 근무자가 완료함
    if (error.code === '23505') return { ok: false, reason: '이미 완료된 미션이에요.' }
    throw error
  }
  return { ok: true }
}

/** 완료 취소(재촬영). id로 삭제. */
export async function deleteCompletionBySource(
  date: string,
  source_type: SourceType,
  source_id: string
): Promise<void> {
  const db = getClient()
  const { error } = await db
    .from('completions')
    .delete()
    .eq('date', date)
    .eq('source_type', source_type)
    .eq('source_id', source_id)
  if (error) throw error
}

/** 완료현황(전체 id 포함) — 관리자 화면용. */
export async function listCompletionRowsByDate(date: string) {
  const db = getClient()
  const { data, error } = await db.from('completions').select(COLS).eq('date', date)
  if (error) throw error
  return data ?? []
}
