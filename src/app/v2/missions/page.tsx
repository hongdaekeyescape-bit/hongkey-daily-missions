'use client'

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildMissions } from '@/domain/missions'
import {
  CATEGORY_LABELS,
  ROLE_LABELS,
  type Mission,
  type MissionBoard,
  type Role,
} from '@/domain/types'
import { todaySeoul, weekdaySeoul, weekOfMonth, hhmmSeoul, isoWeek, addDays } from '@/lib/time'
import { CATEGORY_COLOR } from '@/lib/categoryColor'
import { compressImage } from '@/lib/image'
import { canAttend } from '@/lib/attendanceConfig'
import {
  getTodayAttendance,
  recordAttendance,
  deleteAttendance,
  listAllAttendanceIns,
  checkAndAckWarning,
  type AttendanceType,
} from '@/data/attendance'
import { listAllCompletions } from '@/data/completions'
import { listAllAssignments } from '@/data/assignments'
import { getBoolSetting } from '@/data/settings'
import { computeRanking, computeMisses, type RankEntry } from '@/domain/scoring'
import { listActiveTemplates } from '@/data/templates'
import { listAssignmentsByDate } from '@/data/assignments'
import {
  addCompletion,
  listCompletionsByDate,
  setCompletionPhotos,
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
  const [showDone, setShowDone] = useState(false)
  const [zoom, setZoom] = useState<string | null>(null)
  const [ranking, setRanking] = useState<RankEntry[] | null>(null)
  const [totalMisses, setTotalMisses] = useState(0)
  const [warning, setWarning] = useState<number | null>(null)
  const [stamp, setStamp] = useState<string | null>(null)

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
      router.replace('/v2')
      return
    }
    load()
  }, [name, load, router])

  // 순위 + 미이행/경고 집계 (전체 데이터)
  useEffect(() => {
    if (!name) return
    let cancelled = false
    ;(async () => {
      try {
        const [templates, allComp, allAssign, allIns] = await Promise.all([
          listActiveTemplates(),
          listAllCompletions(),
          listAllAssignments(),
          listAllAttendanceIns(),
        ])
        if (cancelled) return
        setRanking(computeRanking(allComp, templates, allAssign))

        // 경고 기능이 꺼져 있으면 미이행/경고 표시 안 함
        const warningsOn = await getBoolSetting('warnings_enabled', true)
        if (cancelled || !warningsOn) return

        const misses = computeMisses({
          attendanceIns: allIns,
          templates,
          assignments: allAssign,
          completions: allComp,
        })
        const mine = misses.get(name) ?? new Set<string>()
        setTotalMisses(mine.size)

        // 지난주 미이행이 있으면 이번 주 첫 접속에 1회 경고
        const lastWeek = isoWeek(addDays(date, -7))
        const lastWeekCount = [...mine].filter((d) => isoWeek(d) === lastWeek).length
        if (lastWeekCount > 0) {
          const r = await checkAndAckWarning(name, lastWeek)
          if (!cancelled && r === 'need') setWarning(lastWeekCount)
        }
      } catch {
        /* 순위/경고 실패는 무시(미션 사용에 지장 없게) */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [name, date])

  const { todo, done } = useMemo(() => {
    const items = board?.items ?? []
    return { todo: items.filter((i) => !i.done), done: items.filter((i) => i.done) }
  }, [board])

  if (!name) return null

  return (
    <main className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <button onClick={() => router.push('/v2')} className="text-sm text-ink-soft">
          ← 처음
        </button>
        <div className="text-center">
          <div className="text-xs text-ink-soft">{date}</div>
          <div className="text-sm font-bold">
            {name} · {ROLE_LABELS[role]}
          </div>
        </div>
        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">v2</span>
      </header>

      {canAttend(name) && (
        <AttendanceCard name={name} date={date} role={role} misses={totalMisses} />
      )}

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
            <>
              <ul className="flex flex-col gap-3">
                {todo.map((m) => (
                  <MissionCardItem key={`${m.source_type}:${m.source_id}`} m={m} onTap={() => setActive(m)} />
                ))}
              </ul>

              {done.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowDone((v) => !v)}
                    className="mb-2 flex w-full items-center justify-between rounded-2xl bg-white/60 px-4 py-2.5 text-sm font-bold text-mint-700"
                  >
                    <span>✅ 완료 {done.length}개</span>
                    <span>{showDone ? '▲ 접기' : '▼ 펼치기'}</span>
                  </button>
                  {showDone && (
                    <ul className="flex flex-col gap-3">
                      {done.map((m) => (
                        <MissionCardItem
                          key={`${m.source_type}:${m.source_id}`}
                          m={m}
                          onTap={() => setActive(m)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
          {board.totalCount > 0 && board.doneCount === board.totalCount && <Celebrate />}
        </>
      )}

      <RankingList entries={ranking} me={name} />

      {warning !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="text-5xl">⚠️</div>
            <h3 className="font-display mt-2 text-lg">지난주 미이행 알림</h3>
            <p className="mt-2 text-sm text-ink-soft">
              지난주 근무 중 <b className="text-pink-600">{warning}일</b>, 근무조 미션이
              마무리되지 않았어요. 이번 주는 끝까지 완료해 주세요! 🙏
            </p>
            <button
              onClick={() => setWarning(null)}
              className="mt-4 w-full rounded-full bg-mint-500 py-3 font-bold text-white"
            >
              확인했어요
            </button>
          </div>
        </div>
      )}

      {active && (
        <CompleteSheet
          mission={active}
          name={name}
          date={date}
          onZoom={setZoom}
          onClose={() => setActive(null)}
          onChanged={async () => {
            await load()
          }}
          onDone={() => setActive(null)}
          onCompleted={(title) => {
            setStamp(title)
            setTimeout(() => setStamp(null), 1400)
          }}
        />
      )}

      {stamp && (
        <div className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center">
          <div className="animate-stamp flex flex-col items-center gap-2 rounded-3xl bg-mint-500/95 px-10 py-8 text-center text-white shadow-2xl">
            <div className="text-6xl">✅</div>
            <div className="font-display text-2xl">완료!</div>
            <div className="max-w-[220px] truncate text-sm opacity-90">{stamp}</div>
          </div>
        </div>
      )}

      {zoom && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="확대" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </main>
  )
}

function AttendanceCard({
  name,
  date,
  role,
  misses,
}: {
  name: string
  date: string
  role: Role
  misses: number
}) {
  const [att, setAtt] = useState<{ in?: string; out?: string }>({})
  const [busy, setBusy] = useState<AttendanceType | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  const load = useCallback(async () => {
    try {
      setAtt(await getTodayAttendance(name, date))
    } catch (e) {
      setMsg((e as Error).message)
    } finally {
      setLoaded(true)
    }
  }, [name, date])

  useEffect(() => {
    load()
  }, [load])

  async function tap(type: AttendanceType) {
    setBusy(type)
    setMsg(null)
    try {
      const r = await recordAttendance(name, date, type, role)
      setAtt((prev) => ({ ...prev, [type]: r.at }))
      if (r.already) setMsg(type === 'in' ? '이미 출근 인증됨' : '이미 퇴근 인증됨')
    } catch (e) {
      setMsg((e as Error).message ?? '인증에 실패했어요.')
    } finally {
      setBusy(null)
    }
  }

  async function cancel(type: AttendanceType) {
    if (!confirm(`${type === 'in' ? '출근' : '퇴근'} 인증을 취소할까요?`)) return
    setBusy(type)
    try {
      await deleteAttendance(name, date, type)
      setAtt((prev) => {
        const next = { ...prev }
        delete next[type]
        return next
      })
    } catch (e) {
      setMsg((e as Error).message ?? '취소에 실패했어요.')
    } finally {
      setBusy(null)
    }
  }

  function btn(type: AttendanceType, label: string, emoji: string) {
    const at = att[type]
    const done = !!at
    if (done) {
      return (
        <button
          onClick={() => cancel(type)}
          disabled={busy !== null}
          className="flex flex-col items-center gap-0.5 rounded-2xl border-2 border-mint-200 bg-mint-50 py-3 font-bold text-mint-700"
        >
          <span className="text-xl">✅</span>
          <span className="text-sm">
            {label} {hhmmSeoul(at!)}
          </span>
          <span className="text-[10px] text-pink-600 underline">잘못 눌렀으면 취소</span>
        </button>
      )
    }
    return (
      <button
        onClick={() => tap(type)}
        disabled={busy !== null}
        className="flex flex-col items-center gap-0.5 rounded-2xl bg-mint-500 py-3 font-bold text-white shadow-md transition active:scale-[0.98] disabled:opacity-60"
      >
        <span className="text-xl">{emoji}</span>
        <span className="text-sm">{busy === type ? '기록 중…' : `${label} 인증하기`}</span>
      </button>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <span className="font-display text-sm text-ink">🖐 출퇴근 인증</span>
        <span className="rounded-full bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-600">
          지문 대체 · 테스트
        </span>
        {misses > 0 && (
          <span className="ml-auto rounded-full bg-pink-500 px-2 py-0.5 text-[10px] font-bold text-white">
            누적 미이행 {misses}회
          </span>
        )}
      </div>
      {!loaded ? (
        <p className="py-2 text-center text-sm text-ink-soft">불러오는 중…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {btn('in', '출근', '🌅')}
          {btn('out', '퇴근', '🌙')}
        </div>
      )}
      {msg && <p className="mt-2 text-center text-xs text-pink-600">{msg}</p>}
    </section>
  )
}

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100)
  return (
    <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-bold">오늘의 미션</span>
        <span className="font-display text-sm text-mint-600">{done} / {total} 완료</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-mint-50">
        <div className="h-full rounded-full bg-mint-500 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Badge({ text, color }: { text: string; color: string }) {
  return (
    <span className="rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ backgroundColor: color }}>
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
            <span
              className={
                'text-base font-bold ' + (m.done ? 'text-ink-soft line-through decoration-mint-500 decoration-2' : '')
              }
            >
              {m.title}
            </span>
            {m.frequency === 'biweekly' && <Badge text="🔁 격주" color="#f0609a" />}
            {m.frequency === 'monthly_first' && <Badge text="📅 월1회" color="#f0609a" />}
            {m.is_collab && <Badge text="협업" color="#a78bfa" />}
            {m.is_assignment && <Badge text="약속" color="#ff7a66" />}
            {m.has_guide && <Badge text="📖 가이드" color="#1fb89d" />}
          </span>
          <span className={'text-xs text-ink-soft ' + (m.done ? 'line-through' : '')}>
            {CATEGORY_LABELS[m.category]}
            {m.description ? ` · ${m.description}` : ''}
          </span>
          {m.done && (
            <span className="text-xs font-semibold text-mint-600">
              ✅ {m.done_by} 완료 {m.photos && m.photos.length > 1 ? `· 📸 ${m.photos.length}장` : ''}
            </span>
          )}
        </span>
        <span className="flex items-center pr-4">
          {m.done ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-mint-500 text-lg font-bold text-white shadow-sm">
              ✓
            </span>
          ) : (
            <span className="h-8 w-8 rounded-full border-2 border-dashed border-mint-300" />
          )}
        </span>
      </button>
    </li>
  )
}

function GuideChecklist({ guide }: { guide: string }) {
  const steps = useMemo(
    () => guide.split('\n').map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(Boolean),
    [guide]
  )
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [open, setOpen] = useState(true)

  function toggle(i: number) {
    setChecked((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-1 flex w-full items-center justify-between font-display text-sm text-mint-700"
      >
        <span>📖 업무 가이드 ({checked.size}/{steps.length})</span>
        <span className="text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="flex flex-col gap-1.5 rounded-2xl border-2 border-mint-100 bg-mint-50 p-3">
          {steps.map((s, i) => {
            const on = checked.has(i)
            return (
              <li key={i}>
                <button onClick={() => toggle(i)} className="flex w-full items-start gap-2 text-left text-sm">
                  <span
                    className={
                      'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold ' +
                      (on ? 'border-mint-500 bg-mint-500 text-white' : 'border-mint-300 text-mint-500')
                    }
                  >
                    {on ? '✓' : i + 1}
                  </span>
                  <span className={on ? 'text-ink-soft line-through' : 'text-ink'}>{s}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ExamplePhotos({
  photos,
  captions,
  onZoom,
}: {
  photos: string[]
  captions: string[]
  onZoom: (u: string) => void
}) {
  return (
    <div>
      <div className="mb-1 font-display text-sm text-pink-600">🖼 사진 예시 (탭하면 크게)</div>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {photos.map((u, i) => (
          <button key={i} onClick={() => onZoom(u)} className="shrink-0">
            <img
              src={u}
              alt={`예시 ${i + 1}`}
              className="h-32 w-32 rounded-xl border-2 border-pink-100 object-cover"
            />
            {captions[i] && (
              <span className="mt-1 block w-32 text-center text-[11px] text-ink-soft">{captions[i]}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function CompleteSheet({
  mission,
  name,
  date,
  onZoom,
  onClose,
  onChanged,
  onDone,
  onCompleted,
}: {
  mission: Mission
  name: string
  date: string
  onZoom: (u: string) => void
  onClose: () => void
  onChanged: () => Promise<void>
  onDone: () => void
  onCompleted: (title: string) => void
}) {
  const existing = mission.photos ?? []
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<{ n: number; total: number } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const guidePhotos = mission.guide_photos ?? []
  const guideCaptions = mission.guide_captions ?? []

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function addFiles(list: FileList | null) {
    if (!list) return
    setFiles((prev) => [...prev, ...Array.from(list)])
  }

  async function save() {
    if (files.length === 0) return
    setBusy(true)
    setMsg(null)
    try {
      const newUrls: string[] = []
      for (let i = 0; i < files.length; i++) {
        setProgress({ n: i + 1, total: files.length })
        const compressed = await compressImage(files[i])
        newUrls.push(await uploadMissionPhoto(compressed, date, mission.source_id))
      }
      const all = [...existing, ...newUrls]
      if (mission.done) {
        await setCompletionPhotos(date, mission.source_type, mission.source_id, all)
      } else {
        const res = await addCompletion({
          date,
          source_type: mission.source_type,
          source_id: mission.source_id,
          done_by: name,
          photos: all,
        })
        if (!res.ok) {
          setMsg(res.reason ?? '완료에 실패했어요.')
          setBusy(false)
          setProgress(null)
          return
        }
      }
      const wasDone = mission.done
      await onChanged()
      onDone()
      if (!wasDone) onCompleted(mission.title)
    } catch (e) {
      setMsg((e as Error).message ?? '업로드 중 문제가 생겼어요. 다시 시도해 주세요.')
      setBusy(false)
      setProgress(null)
    }
  }

  async function removeExisting(i: number) {
    setBusy(true)
    try {
      await setCompletionPhotos(
        date,
        mission.source_type,
        mission.source_id,
        existing.filter((_, idx) => idx !== i)
      )
      await onChanged()
      onDone()
    } catch (e) {
      setMsg((e as Error).message ?? '삭제에 실패했어요.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-5 pb-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-200" />
        <h3 className="font-display text-xl">{mission.title}</h3>
        {mission.description && <p className="mt-1 text-sm text-ink-soft">{mission.description}</p>}

        <div className="mt-3 flex flex-col gap-3">
          {mission.guide && <GuideChecklist guide={mission.guide} />}
          {guidePhotos.length > 0 && (
            <ExamplePhotos photos={guidePhotos} captions={guideCaptions} onZoom={onZoom} />
          )}
        </div>

        {/* 이미 올린 완료 사진 */}
        {existing.length > 0 && (
          <div className="mt-4">
            <div className="mb-1 text-sm font-bold text-mint-600">
              ✅ {mission.done_by} 완료 · 내 사진 {existing.length}장
            </div>
            <div className="grid grid-cols-3 gap-2">
              {existing.map((u, i) => (
                <div key={i} className="relative">
                  <img
                    src={u}
                    alt={`완료 ${i + 1}`}
                    onClick={() => onZoom(u)}
                    className="aspect-square w-full rounded-xl object-cover"
                  />
                  <button
                    onClick={() => removeExisting(i)}
                    disabled={busy}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white shadow disabled:opacity-40"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 새로 추가할 사진 */}
        <div className="mt-4 flex flex-col gap-3">
          {/* 예시 참고 스트립 */}
          {guidePhotos.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-pink-50 p-2">
              <span className="shrink-0 text-[11px] font-bold text-pink-600">예시 참고</span>
              <div className="flex gap-1.5 overflow-x-auto">
                {guidePhotos.map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt="참고"
                    onClick={() => onZoom(u)}
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ))}
              </div>
            </div>
          )}

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {previews.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt={`새 사진 ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
                  <button
                    onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-pink-500 text-xs font-bold text-white shadow"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-mint-300 bg-mint-50 py-4 text-mint-700">
              <span className="text-2xl">📷</span>
              <span className="text-xs font-bold">촬영</span>
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
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-pink-300 bg-pink-50 py-4 text-pink-600">
              <span className="text-2xl">🖼</span>
              <span className="text-xs font-bold">앨범에서</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          {msg && <p className="text-center text-sm text-pink-600">{msg}</p>}

          {files.length > 0 && (
            <button
              onClick={save}
              disabled={busy}
              className="rounded-full bg-mint-500 py-4 text-lg font-extrabold text-white shadow-lg disabled:opacity-40"
            >
              {busy
                ? progress
                  ? `업로드 중 ${progress.n}/${progress.total}…`
                  : '저장 중…'
                : mission.done
                  ? `사진 ${files.length}장 추가`
                  : `완료하기 ✅${files.length > 1 ? ` (${files.length}장)` : ''}`}
            </button>
          )}

          {mission.done && files.length === 0 && (
            <p className="text-center text-xs text-ink-soft">
              사진을 더 찍거나(＋), 위 사진의 ✕로 개별 삭제할 수 있어요
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function RankingList({ entries, me }: { entries: RankEntry[] | null; me: string }) {
  const medal = (rank: number) =>
    rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}위`

  return (
    <section className="mt-4 rounded-2xl bg-white/80 p-4 shadow-sm">
      <div className="mb-1 text-center">
        <div className="font-display text-lg">🏆 홍키 클린 스페셜리스트</div>
        <div className="text-xs text-ink-soft">완수율 순위 · 전체 누적</div>
      </div>
      {!entries ? (
        <p className="py-4 text-center text-sm text-ink-soft">집계 중…</p>
      ) : entries.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">아직 기록이 없어요. 첫 완료의 주인공이 되어보세요!</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {entries.map((e) => {
            const mine = e.name === me
            return (
              <li
                key={e.name}
                className={
                  'flex items-center gap-2 rounded-xl px-3 py-2 text-sm ' +
                  (mine ? 'bg-mint-50 font-bold' : '')
                }
              >
                <span className="w-8 shrink-0 text-center font-display">{medal(e.rank)}</span>
                <span className="flex-1 truncate">
                  {e.name}
                  {mine && ' (나)'}
                </span>
                <span className="text-xs text-ink-soft">{e.tasks}건</span>
                <span className="w-12 text-right font-display text-mint-600">{e.points.toFixed(2)}</span>
              </li>
            )
          })}
        </ul>
      )}
      <p className="mt-2 text-center text-[11px] text-ink-soft">
        하루 1점을 그날 업무 수로 나눠, 사진 올려 완료한 만큼 점수가 쌓여요.
      </p>
    </section>
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

export default function MissionsPageV2() {
  return (
    <Suspense fallback={<p className="py-10 text-center text-sm text-ink-soft">불러오는 중…</p>}>
      <MissionsInner />
    </Suspense>
  )
}
