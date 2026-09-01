import { getClient } from '@/lib/supabase'
import type { AttendanceRecord } from '@/domain/attendance'
import type { Role } from '@/domain/types'

export type AttendanceType = 'in' | 'out'

/** 전체 출근(in) 기록 — 미이행 판정용. */
export async function listAllAttendanceIns(): Promise<
  { name: string; date: string; role: Role | null }[]
> {
  const db = getClient()
  const { data, error } = await db
    .from('attendance')
    .select('name,date,role')
    .eq('type', 'in')
  if (error) throw error
  return (data ?? []) as { name: string; date: string; role: Role | null }[]
}

/** 지난주 미이행이 있고 아직 경고 안 봤으면 표시 후 기록. */
export async function checkAndAckWarning(
  name: string,
  week: string
): Promise<'need' | 'seen'> {
  const db = getClient()
  const { data } = await db
    .from('warning_ack')
    .select('name')
    .eq('name', name)
    .eq('week', week)
    .maybeSingle()
  if (data) return 'seen'
  await db.from('warning_ack').insert({ name, week })
  return 'need'
}

/** 특정 월(YYYY-MM)의 모든 출퇴근 기록. */
export async function getAttendanceForMonth(month: string): Promise<AttendanceRecord[]> {
  const db = getClient()
  const start = `${month}-01`
  const [y, m] = month.split('-').map(Number)
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`
  const { data, error } = await db
    .from('attendance')
    .select('name,date,type,at')
    .gte('date', start)
    .lt('date', next)
    .order('at', { ascending: true })
  if (error) throw error
  return (data ?? []) as AttendanceRecord[]
}

/** 오늘 출/퇴근 기록 시각(ISO) 조회. */
export async function getTodayAttendance(
  name: string,
  date: string
): Promise<{ in?: string; out?: string }> {
  const db = getClient()
  const { data, error } = await db
    .from('attendance')
    .select('type,at')
    .eq('name', name)
    .eq('date', date)
  if (error) throw error
  const result: { in?: string; out?: string } = {}
  for (const r of data ?? []) result[r.type as AttendanceType] = r.at
  return result
}

/** 출/퇴근 인증 기록. 이미 있으면 기존 시각 반환(중복 방지). */
export async function recordAttendance(
  name: string,
  date: string,
  type: AttendanceType,
  role?: string
): Promise<{ at: string; already: boolean }> {
  const db = getClient()
  const { data, error } = await db
    .from('attendance')
    .insert({ name, date, type, role: role ?? null })
    .select('at')
    .single()
  if (error) {
    if (error.code === '23505') {
      const { data: d2 } = await db
        .from('attendance')
        .select('at')
        .eq('name', name)
        .eq('date', date)
        .eq('type', type)
        .single()
      return { at: d2?.at ?? '', already: true }
    }
    throw error
  }
  return { at: data?.at ?? '', already: false }
}
