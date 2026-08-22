import { getClient } from '@/lib/supabase'

export interface Staff {
  id: string
  name: string
  active: boolean
  sort: number
}

export async function listActiveStaff(): Promise<Staff[]> {
  const db = getClient()
  const { data, error } = await db
    .from('staff')
    .select('id,name,active,sort')
    .eq('active', true)
    .order('sort', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function listAllStaff(): Promise<Staff[]> {
  const db = getClient()
  const { data, error } = await db
    .from('staff')
    .select('id,name,active,sort')
    .order('sort', { ascending: true })
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function addStaff(name: string): Promise<void> {
  const db = getClient()
  const { error } = await db.from('staff').insert({ name })
  if (error) throw error
}

export async function setStaffActive(id: string, active: boolean): Promise<void> {
  const db = getClient()
  const { error } = await db.from('staff').update({ active }).eq('id', id)
  if (error) throw error
}
