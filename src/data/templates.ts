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
  }
  const { error } = input.id
    ? await db.from('task_templates').update(row).eq('id', input.id)
    : await db.from('task_templates').insert(row)
  if (error) throw error
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = getClient()
  const { error } = await db.from('task_templates').delete().eq('id', id)
  if (error) throw error
}
