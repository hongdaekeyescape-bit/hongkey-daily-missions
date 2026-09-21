/**
 * task_templates를 엑셀 시드로 채운다. (비파괴형: 이미 데이터가 있으면 건너뜀)
 * 실행: npm run seed  (환경변수 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
 * 강제로 전체 초기화하려면: npm run seed -- --force  (관리자 변경 전부 삭제됨, 주의!)
 */
import { getServiceClient } from '../src/lib/supabase'
import { SEED_TEMPLATES } from '../src/domain/seedData'

async function main() {
  console.log(`시드 템플릿 ${SEED_TEMPLATES.length}개 준비됨.`)

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('※ Supabase 환경변수가 없어 DB 삽입은 건너뜁니다(dry run).')
    console.log(SEED_TEMPLATES.slice(0, 3))
    return
  }

  const force = process.argv.includes('--force') || process.env.SEED_FORCE === '1'
  const db = getServiceClient()

  // 비파괴 가드: 이미 데이터가 있으면 관리자 변경 보호를 위해 중단
  const { count, error: cntErr } = await db
    .from('task_templates')
    .select('*', { count: 'exact', head: true })
  if (cntErr) throw cntErr
  if ((count ?? 0) > 0 && !force) {
    console.log(
      `⚠️ 이미 ${count}개 템플릿이 있어 시드를 건너뜁니다(관리자 변경 보호).\n` +
        `   정말 전체 초기화하려면: npm run seed -- --force`
    )
    return
  }

  if (force && (count ?? 0) > 0) {
    console.log(`--force: 기존 ${count}개 삭제 후 재삽입`)
    const { error: delErr } = await db
      .from('task_templates')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (delErr) throw delErr
  }

  const { error: insErr } = await db.from('task_templates').insert(
    SEED_TEMPLATES.map((t) => ({
      scope: t.scope,
      weekday: t.weekday,
      title: t.title,
      description: t.description ?? null,
      category: t.category,
      is_periodic: t.is_periodic,
      frequency: t.frequency,
      guide: t.guide ?? null,
      sort: t.sort,
      active: true,
    }))
  )
  if (insErr) throw insErr

  console.log(`✅ ${SEED_TEMPLATES.length}개 템플릿 삽입 완료.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
