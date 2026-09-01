import { getClient } from '@/lib/supabase'

export type AttendanceType = 'in' | 'out'

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
  type: AttendanceType
): Promise<{ at: string; already: boolean }> {
  const db = getClient()
  const { data, error } = await db
    .from('attendance')
    .insert({ name, date, type })
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
