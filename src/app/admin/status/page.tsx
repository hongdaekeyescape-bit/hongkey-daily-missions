'use client'

import { useCallback, useEffect, useState } from 'react'
import { buildMissions } from '@/domain/missions'
import { ROLE_LABELS, type MissionBoard, type Role } from '@/domain/types'
import { todaySeoul, weekdaySeoul } from '@/lib/time'
import { CATEGORY_COLOR } from '@/lib/categoryColor'
import { listActiveTemplates } from '@/data/templates'
import { listAssignmentsByDate } from '@/data/assignments'
import { listCompletionsByDate } from '@/data/completions'

const ROLES: Role[] = ['open', 'middle', 'close']

export default function StatusPage() {
  const [date, setDate] = useState(todaySeoul())
  const [boards, setBoards] = useState<Record<Role, MissionBoard> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState<string | null>(null)

  const load = useCallback(async (d: string) => {
    setError(null)
    setBoards(null)
    try {
      const weekday = weekdaySeoul(d)
      const [templates, assignments, completions] = await Promise.all([
        listActiveTemplates(),
        listAssignmentsByDate(d),
        listCompletionsByDate(d),
      ])
      const result = {} as Record<Role, MissionBoard>
      for (const role of ROLES) {
        result[role] = buildMissions({ date: d, weekday, role, templates, assignments, completions })
      }
      setBoards(result)
    } catch (e) {
      setError((e as Error).message ?? '불러오지 못했어요.')
    }
  }, [])

  useEffect(() => {
    load(date)
  }, [date, load])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <label className="text-sm font-bold text-ink-soft">날짜</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-xl border-2 border-mint-200 bg-white px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="rounded-2xl bg-pink-50 p-4 text-sm text-pink-600">{error}</p>}
      {!boards && !error && <p className="py-8 text-center text-sm text-ink-soft">불러오는 중…</p>}

      {boards &&
        ROLES.map((role) => {
          const b = boards[role]
          return (
            <section key={role} className="rounded-2xl bg-white/70 p-4 shadow-sm">
              <div className="mb-2 flex items-baseline justify-between">
                <h2 className="font-extrabold">{ROLE_LABELS[role]}</h2>
                <span className="text-sm font-bold text-mint-600">
                  {b.doneCount} / {b.totalCount}
                </span>
              </div>
              {b.totalCount === 0 ? (
                <p className="text-sm text-ink-soft">미션 없음</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {b.items.map((m) => (
                    <li
                      key={`${m.source_type}:${m.source_id}`}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLOR[m.category] }}
                      />
                      <span className={m.done ? 'text-ink-soft line-through' : 'font-semibold'}>
                        {m.title}
                      </span>
                      {m.done ? (
                        <span className="ml-auto flex items-center gap-2 text-xs text-mint-600">
                          {m.done_by}
                          {m.photo_url && (
                            <img
                              src={m.photo_url}
                              alt="사진"
                              onClick={() => setZoom(m.photo_url!)}
                              className="h-8 w-8 cursor-pointer rounded object-cover"
                            />
                          )}
                        </span>
                      ) : (
                        <span className="ml-auto text-xs text-pink-500">미완료</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}

      {zoom && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setZoom(null)}
        >
          <img src={zoom} alt="확대" className="max-h-full max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  )
}
