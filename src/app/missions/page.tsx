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
import { todaySeoul, weekdaySeoul, weekOfMonth } from '@/lib/time'
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
  const wom = weekOfMonth(date)

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
      setBoard(
        buildMissions({ date, weekday, weekOfMonth: wom, role, templates, assignments, completions })
      )
    } catch (e) {
      setError((e as Error).message ?? '미션을 불러오지 못했어요.')
    }
  }, [date, weekday, wom, role])

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
            {m.frequency === 'biweekly' && <Badge text="🔁 격주" color="#f0609a" />}
            {m.frequency === 'monthly_first' && <Badge text="📅 월1회" color="#f0609a" />}
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
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
  }
  function removeFile(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function complete() {
    if (files.length === 0) return
    setBusy(true)
    setMsg(null)
    try {
      const urls: string[] = []
      for (const f of files) {
        urls.push(await uploadMissionPhoto(f, date, mission.source_id))
      }
      const res = await addCompletion({
        date,
        source_type: mission.source_type,
        source_id: mission.source_id,
        done_by: name,
        photos: urls,
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

        {(mission.guide || (mission.guide_photos && mission.guide_photos.length > 0)) && (
          <div className="mt-3 flex flex-col gap-3">
            {mission.guide && (
              <div>
                <div className="mb-1 font-display text-sm text-mint-700">📖 업무 가이드</div>
                <p className="whitespace-pre-line rounded-2xl border-2 border-mint-100 bg-mint-50 p-3 text-sm text-ink">
                  {mission.guide}
                </p>
              </div>
            )}
            {mission.guide_photos && mission.guide_photos.length > 0 && (
              <div>
                <div className="mb-1 font-display text-sm text-pink-600">🖼 사진 예시</div>
                <div className="flex flex-col gap-2">
                  {mission.guide_photos.map((u, i) => (
                    <img
                      key={i}
                      src={u}
                      alt={`사진 예시 ${i + 1}`}
                      className="w-full rounded-2xl border-2 border-pink-100"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {mission.done ? (
          <div className="mt-4 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              {(mission.photos ?? []).map((u, i) => (
                <img key={i} src={u} alt={`완료 사진 ${i + 1}`} className="w-full rounded-xl" />
              ))}
            </div>
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
            {previews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {previews.map((p, i) => (
                  <div key={i} className="relative">
                    <img src={p} alt={`사진 ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                    <button
                      onClick={() => removeFile(i)}
                      className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-mint-300 bg-mint-50 text-mint-700">
              <span className="text-3xl">📷</span>
              <span className="text-sm font-bold">
                {files.length === 0 ? '사진 촬영' : '＋ 사진 더 찍기'}
              </span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
            {msg && <p className="text-center text-sm text-pink-600">{msg}</p>}
            <button
              onClick={complete}
              disabled={files.length === 0 || busy}
              className="rounded-full bg-mint-500 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-40"
            >
              {busy ? '올리는 중…' : `완료하기 ✅${files.length > 1 ? ` (${files.length}장)` : ''}`}
            </button>
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
