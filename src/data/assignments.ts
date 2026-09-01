import { getClient } from '@/lib/supabase'
import type { Assignment, Role } from '@/domain/types'

const COLS = 'id,date,role,title,note,active'

export async function listAssignmentsByDate(date: string): Promise<Assignment[]> {
  const db = getClient()
  const { data, error } = await db
    .from('assignments')
    .select(COLS)
    .eq('date', date)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as Assignment[]
}

/** 전체 약속업무 — 순위/미이행 집계용. */
export async function listAllAssignments(): Promise<Assignment[]> {
  const db = getClient()
  const { data, error } = await db.from('assignments').select(COLS)
  if (error) throw error
  return (data ?? []) as Assignment[]
}

export async function addAssignment(input: {
  date: string
  role: Role
  title: string
  note?: string
}): Promise<void> {
  const db = getClient()
  const { error } = await db.from('assignments').insert({
    date: input.date,
    role: input.role,
    title: input.title,
    note: input.note ?? null,
  })
  if (error) throw error
}

export async function deleteAssignment(id: string): Promise<void> {
  const db = getClient()
  const { error } = await db.from('assignments').delete().eq('id', id)
  if (error) throw error
}
