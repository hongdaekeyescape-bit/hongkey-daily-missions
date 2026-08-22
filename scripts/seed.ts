/**
 * task_templates를 엑셀 시드로 채운다. (idempotent: 기존 전체 삭제 후 재삽입)
 * 실행: npm run seed  (환경변수 필요: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
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

  const db = getServiceClient()
  const { error: delErr } = await db.from('task_templates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (delErr) throw delErr

  const { error: insErr } = await db.from('task_templates').insert(
    SEED_TEMPLATES.map((t) => ({
      scope: t.scope,
      weekday: t.weekday,
      title: t.title,
      description: t.description ?? null,
      category: t.category,
      is_periodic: t.is_periodic,
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
