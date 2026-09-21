import { getClient } from '@/lib/supabase'
import type { TaskTemplate } from '@/domain/types'

const COLS =
  'id,scope,weekday,title,description,category,is_periodic,frequency,guide,example_photo_url,guide_photos,guide_captions,sort,active'

export async function listActiveTemplates(): Promise<TaskTemplate[]> {
  const db = getClient()
  const { data, error } = await db.from('task_templates').select(COLS).eq('active', true)
  if (error) throw error
  return (data ?? []) as TaskTemplate[]
}

export async function listAllTemplates(): Promise<TaskTemplate[]> {
  const db = getClient()
  const { data, error } = await db
    .from('task_templates')
    .select(COLS)
    .order('scope', { ascending: true })
    .order('weekday', { ascending: true })
    .order('sort', { ascending: true })
  if (error) throw error
  return (data ?? []) as TaskTemplate[]
}

export type TemplateInput = Omit<TaskTemplate, 'id'>

export interface TemplateChange {
  action: 'create' | 'update' | 'delete'
  title: string
  scope: string
  weekday: number
  at: string
}

// 변경 로그 기록(실패해도 본 작업엔 지장 없게 무시)
async function logChange(
  action: 'create' | 'update' | 'delete',
  t: { template_id?: string; title: string; scope: string; weekday: number }
) {
  try {
    await getClient().from('template_changes').insert({
      template_id: t.template_id ?? null,
      action,
      title: t.title,
      scope: t.scope,
      weekday: t.weekday,
    })
  } catch {
    /* 로그 실패 무시 */
  }
}

export async function upsertTemplate(
  input: TemplateInput & { id?: string }
): Promise<void> {
  const db = getClient()
  const row = {
    scope: input.scope,
    weekday: input.weekday,
    title: input.title,
    description: input.description ?? null,
    category: input.category,
    is_periodic: input.is_periodic,
    frequency: input.frequency,
    guide: input.guide ?? null,
    example_photo_url: input.guide_photos?.[0] ?? input.example_photo_url ?? null,
    guide_photos: input.guide_photos ?? [],
    guide_captions: input.guide_captions ?? [],
    sort: input.sort,
    active: input.active,
    updated_at: new Date().toISOString(),
  }
  const { error } = input.id
    ? await db.from('task_templates').update(row).eq('id', input.id)
    : await db.from('task_templates').insert(row)
  if (error) throw error
  await logChange(input.id ? 'update' : 'create', {
    template_id: input.id,
    title: input.title,
    scope: input.scope,
    weekday: input.weekday,
  })
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getClient()
  // 삭제 전 정보 확보(로그용)
  const { data: prev } = await db
    .from('task_templates')
    .select('title,scope,weekday')
    .eq('id', id)
    .maybeSingle()
  const { error } = await db.from('task_templates').delete().eq('id', id)
  if (error) throw error
  if (prev)
    await logChange('delete', { template_id: id, title: prev.title, scope: prev.scope, weekday: prev.weekday })
}

/** 최근 변경 로그(관리자 조회용). */
export async function listTemplateChanges(limit = 30): Promise<TemplateChange[]> {
  const db = getClient()
  const { data, error } = await db
    .from('template_changes')
    .select('action,title,scope,weekday,at')
    .order('at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as TemplateChange[]
}
