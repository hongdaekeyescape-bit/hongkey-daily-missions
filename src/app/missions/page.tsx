'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildMissions } from '@/domain/missions'
import {
  CATEGORY_LABELS,
  ROLE_LABELS,
  type Mission,
  type MissionBoard,
  type Role,
} from '@/domain/types'
import { todaySeoul, weekdaySeoul } from '@/lib/time'
import { CATEGORY_COLOR } from '@/lib/categoryColor'
import { listActiveTemplates } from '@/data/templates'
import { listAssignmentsByDate } from '@/data/assignments'
import {
  addCompletion,
  deleteCompletionBySource,
  listCompletionsByDate,
} from '@/data/completions'
import { uploadMissionPhoto } from '@/data/photos'

const VALID_ROLES: Role[] = ['open', 'middle', 'close']

function MissionsInner() {
  const router = useRouter()
  const params = useSearchParams()
  const name = params.get('name') ?? ''
  const roleParam = params.get('role') as Role | null
  const role: Role = roleParam && VALID_ROLES.includes(roleParam) ? roleParam : 'open'

  const date = todaySeoul()
  const weekday = weekdaySeoul(date)

  const [board, setBoard] = useState<MissionBoard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [active, setActive] = useState<Mission | null>(null)

  const load = useCallback(async () => {
    try {
      const [templates, assignments, completions] = await Promise.all([
        listActiveTemplates(),
        listAssignmentsByDate(date),
        listCompletionsByDate(date),
      ])
      setBoard(buildMissions({ date, weekday, role, templates, assignments, completions }))
    } catch (e) {
      setError((e as Error).message ?? '미션을 불러오지 못했어요.')
    }
  }, [date, weekday, role])

  useEffect(() => {
    if (!name) {
      router.replace('/')
      return
    }
    load()
  }, [name, load, router])

  if (!name) return null

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <button onClick={() => router.push('/')} className="text-sm text-ink-soft">
          ← 처음
        </button>
        <div className="text-center">
          <div className="text-xs text-ink-soft">{date}</div>
          <div className="text-sm font-bold">
            {name} · {ROLE_LABELS[role]}
          </div>
        </div>
        <div className="w-10" />
      </header>

      {error ? (
        <p className="rounded-2xl bg-pink-50 p-4 text-center text-sm text-pink-600">{error}</p>
      ) : !board ? (
        <p className="py-10 text-center text-sm text-ink-soft">미션 불러오는 중…</p>
      ) : (
        <>
          <Progress done={board.doneCount} total={board.totalCount} />
          {board.totalCount === 0 ? (
            <p className="py-10 text-center text-sm text-ink-soft">
              오늘 {ROLE_LABELS[role]} 미션이 없어요. 푹 쉬어요 🌿
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {board.items.map((m) => (
                <MissionCardItem key={`${m.source_type}:${m.source_id}`} m={m} onTap={() => setActive(m)} />
              ))}
            </ul>
          )}
          {board.totalCount > 0 && board.doneCount === board.totalCount && <Celebrate />}
        </>
      )}

      {active && (
        <CompleteSheet
          mission={active}
          name={name}
          date={date}
          onClose={() => setActive(null)}
          onChanged={async () => {
            setActive(null)
            await load()
          }}
        />
      )}
    </main>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-bold">오늘의 미션</span>
        <span className="text-sm font-extrabold text-mint-600">
          {done} / {total} 완료
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-mint-50">
        <div
          className="h-full rounded-full bg-mint-500 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {text}
    </span>
  )
}

function MissionCardItem({ m, onTap }: { m: Mission; onTap: () => void }) {
  const color = CATEGORY_COLOR[m.category]
  return (
    <li>
      <button
        onClick={onTap}
        className={
          'flex w-full items-stretch gap-3 overflow-hidden rounded-2xl border-2 bg-white text-left shadow-sm transition ' +
          (m.done ? 'border-mint-100 opacity-70' : 'border-transparent active:scale-[0.99]')
        }
      >
        <span className="w-1.5 shrink-0" style={{ backgroundColor: color }} />
        <span className="flex flex-1 flex-col gap-1 py-3 pr-3">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={'text-base font-bold ' + (m.done ? 'text-ink-soft line-through' : '')}>
              {m.title}
            </span>
            {m.is_periodic && <Badge text="🔁 정기" color="#f0609a" />}
            {m.is_collab && <Badge text="협업" color="#a78bfa" />}
            {m.is_assignment && <Badge text="약속" color="#ff7a66" />}
            {m.has_guide && <Badge text="📖 가이드" color="#1fb89d" />}
          </span>
          <span className="text-xs text-ink-soft">
            {CATEGORY_LABELS[m.category]}
            {m.description ? ` · ${m.description}` : ''}
          </span>
          {m.done && (
            <span className="text-xs font-semibold text-mint-600">
              ✅ {m.done_by} 완료
            </span>
          )}
        </span>
        <span className="flex items-center pr-4 text-2xl">
          {m.done ? '📸' : '⚪'}
        </span>
      </button>
    </li>
  )
}

function CompleteSheet({
  mission,
  name,
  date,
  onClose,
  onChanged,
}: {
  mission: Mission
  name: string
  date: string
  onClose: () => void
  onChanged: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    if (!file) return setPreview(null)
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  async function complete() {
    if (!file) return
    setBusy(true)
    setMsg(null)
    try {
      const photoUrl = await uploadMissionPhoto(file, date, mission.source_id)
      const res = await addCompletion({
        date,
        source_type: mission.source_type,
        source_id: mission.source_id,
        done_by: name,
        photo_url: photoUrl,
      })
      if (!res.ok) {
        setMsg(res.reason ?? '완료에 실패했어요.')
        setBusy(false)
        return
      }
      onChanged()
    } catch (e) {
      setMsg((e as Error).message ?? '완료에 실패했어요.')
      setBusy(false)
    }
  }

  async function cancel() {
    setBusy(true)
    try {
      await deleteCompletionBySource(date, mission.source_type, mission.source_id)
      onChanged()
    } catch (e) {
      setMsg((e as Error).message ?? '취소에 실패했어요.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
        <h3 className="font-display text-xl">{mission.title}</h3>
        {mission.description && (
          <p className="mt-1 text-sm text-ink-soft">{mission.description}</p>
        )}

        {(mission.guide || mission.example_photo_url) && (
          <div className="mt-3 flex flex-col gap-3">
            {mission.guide && (
              <div>
                <div className="mb-1 font-display text-sm text-mint-700">📖 업무 가이드</div>
                <p className="whitespace-pre-line rounded-2xl border-2 border-mint-100 bg-mint-50 p-3 text-sm text-ink">
                  {mission.guide}
                </p>
              </div>
            )}
            {mission.example_photo_url && (
              <div>
                <div className="mb-1 font-display text-sm text-pink-600">🖼 사진 예시</div>
                <img
                  src={mission.example_photo_url}
                  alt="사진 예시"
                  className="w-full rounded-2xl border-2 border-pink-100"
                />
              </div>
            )}
          </div>
        )}

        {mission.done ? (
          <div className="mt-4 flex flex-col gap-3">
            {mission.photo_url && (
              <img src={mission.photo_url} alt="완료 사진" className="w-full rounded-2xl" />
            )}
            <p className="text-center text-sm font-semibold text-mint-600">
              ✅ {mission.done_by} 님이 완료했어요
            </p>
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-full border-2 border-pink-200 py-3 font-bold text-pink-600 disabled:opacity-40"
            >
              완료 취소 (다시 촬영)
            </button>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {preview ? (
              <img src={preview} alt="미리보기" className="w-full rounded-2xl" />
            ) : (
              <label className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-mint-300 bg-mint-50 text-mint-700">
                <span className="text-4xl">📷</span>
                <span className="text-sm font-bold">사진 촬영</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            {msg && <p className="text-center text-sm text-pink-600">{msg}</p>}
            <button
              onClick={complete}
              disabled={!file || busy}
              className="rounded-full bg-mint-500 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-40"
            >
              {busy ? '올리는 중…' : '완료하기 ✅'}
            </button>
            {preview && (
              <button onClick={() => setFile(null)} className="text-sm text-ink-soft underline">
                사진 다시 찍기
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Celebrate() {
  return (
    <div className="animate-stamp mt-2 rounded-3xl bg-gradient-to-br from-mint-400 to-pink-400 p-6 text-center text-white shadow-lg">
      <div className="text-4xl">🎉</div>
      <p className="font-display mt-1 text-xl">오늘 미션 올클리어!</p>
      <p className="text-sm opacity-90">수고했어요 👏</p>
    </div>
  )
}

export default function MissionsPage() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-ink-soft">불러오는 중…</p>}>
      <MissionsInner />
    </Suspense>
  )
}
