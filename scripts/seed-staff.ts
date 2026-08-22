/**
 * 기존 employees(staff-schedule) 명단을 daily-missions staff로 복사한다.
 * '운영자' 등 비근무 계정은 제외. idempotent: 이름 중복이면 건너뜀.
 * 실행: npm run seed:staff
 */
import { getServiceClient } from '../src/lib/supabase'

const EXCLUDE = new Set(['운영자'])

async function main() {
  const db = getServiceClient()

  const { data: emps, error: e1 } = await db.from('employees').select('name')
  if (e1) throw e1
  const names = (emps ?? []).map((e) => e.name).filter((n) => n && !EXCLUDE.has(n))

  const { data: existing, error: e2 } = await db.from('staff').select('name')
  if (e2) throw e2
  const have = new Set((existing ?? []).map((s) => s.name))

  const toInsert = names
    .filter((n) => !have.has(n))
    .map((name, i) => ({ name, sort: i, active: true }))

  if (toInsert.length === 0) {
    console.log('추가할 직원이 없습니다(이미 반영됨).')
    return
  }

  const { error: e3 } = await db.from('staff').insert(toInsert)
  if (e3) throw e3
  console.log(`✅ ${toInsert.length}명 복사: ${toInsert.map((s) => s.name).join(', ')}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
