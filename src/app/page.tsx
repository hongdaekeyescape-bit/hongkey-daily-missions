'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { guessRole } from '@/domain/shift'
import { ROLE_LABELS, type Role } from '@/domain/types'
import { nowHourSeoul } from '@/lib/time'
import { listActiveStaff, type Staff } from '@/data/staff'

const ROLES: Role[] = ['open', 'middle', 'close']
const ROLE_EMOJI: Record<Role, string> = { open: '🌅', middle: '☀️', close: '🌙' }

function greeting(hour: number): string {
  if (hour < 11) return '좋은 아침이에요'
  if (hour < 17) return '오늘도 화이팅이에요'
  return '마무리까지 힘내요'
}

export default function StartPage() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('open')
  const [autoRole, setAutoRole] = useState<Role>('open')
  const [staff, setStaff] = useState<Staff[]>([])
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [hour, setHour] = useState(9)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const h = nowHourSeoul()
    const g = guessRole(h)
    setHour(h)
    setRole(g)
    setAutoRole(g)
    listActiveStaff()
      .then((s) => setStaff(s))
      .catch((e) => setError(e.message ?? '직원 명단을 불러오지 못했어요.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(
    () => staff.filter((s) => s.name.includes(query.trim())),
    [staff, query]
  )

  function start() {
    if (!name) return
    router.push(`/missions?role=${role}&name=${encodeURIComponent(name)}`)
  }

  return (
    <main className="flex flex-col gap-6">
      <header className="pt-6 text-center">
        <div className="text-5xl">🧹✨</div>
        <h1 className="font-display mt-2 text-3xl tracking-tight">홍키 데일리 미션</h1>
        <p className="mt-1 text-sm text-ink-soft">{greeting(hour)}! 오늘 할일을 미션으로 준비했어요.</p>
      </header>

      {/* 근무형태 (자동 추정, 탭해서 변경) */}
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink-soft">오늘 근무형태</h2>
          {role === autoRole ? (
            <span className="rounded-full bg-mint-100 px-2 py-0.5 text-xs font-semibold text-mint-700">
              자동 추정됨
            </span>
          ) : (
            <button onClick={() => setRole(autoRole)} className="text-xs font-semibold text-pink-600">
              자동으로 되돌리기
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {ROLES.map((r) => {
            const on = r === role
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={
                  'flex flex-col items-center gap-1 rounded-2xl border-2 py-3 text-sm font-bold transition ' +
                  (on
                    ? 'border-mint-500 bg-mint-500 text-white shadow-md'
                    : 'border-mint-100 bg-white text-ink-soft')
                }
              >
                <span className="text-xl">{ROLE_EMOJI[r]}</span>
                {ROLE_LABELS[r]}
              </button>
            )
          })}
        </div>
      </section>

      {/* 이름 선택 */}
      <section>
        <h2 className="mb-2 text-sm font-bold text-ink-soft">이름 선택</h2>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="이름 검색"
          className="mb-3 w-full rounded-2xl border-2 border-pink-100 bg-white px-4 py-3 text-base outline-none focus:border-pink-400"
        />
        {loading ? (
          <p className="py-6 text-center text-sm text-ink-soft">불러오는 중…</p>
        ) : error ? (
          <p className="rounded-2xl bg-pink-50 p-4 text-center text-sm text-pink-600">
            {error}
          </p>
        ) : filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-soft">
            {staff.length === 0 ? '등록된 직원이 없어요. 관리자 화면에서 추가해 주세요.' : '검색 결과가 없어요.'}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map((s) => {
              const on = s.name === name
              return (
                <button
                  key={s.id}
                  onClick={() => setName(s.name)}
                  className={
                    'rounded-2xl border-2 py-3 text-sm font-bold transition ' +
                    (on
                      ? 'border-pink-500 bg-pink-500 text-white shadow-md'
                      : 'border-pink-100 bg-white text-ink')
                  }
                >
                  {s.name}
                </button>
              )
            })}
          </div>
        )}
      </section>

      <button
        onClick={start}
        disabled={!name}
        className="sticky bottom-4 mt-2 rounded-full bg-mint-500 py-4 text-lg font-extrabold text-white shadow-lg transition disabled:opacity-40"
      >
        {name ? `${name}님, 미션 시작 🚀` : '이름을 선택해 주세요'}
      </button>

      <a href="/admin" className="text-center text-xs text-ink-soft underline">
        관리자
      </a>
    </main>
  )
}
