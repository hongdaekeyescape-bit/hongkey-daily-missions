'use client'

import { useEffect, useState } from 'react'
import {
  CATEGORY_LABELS,
  type Category,
  type Scope,
  type TaskTemplate,
} from '@/domain/types'
import { CATEGORY_COLOR } from '@/lib/categoryColor'
import {
  deleteTemplate,
  listAllTemplates,
  upsertTemplate,
} from '@/data/templates'
import { uploadExamplePhoto } from '@/data/photos'

const SCOPE_LABELS: Record<Scope, string> = {
  open: '오픈',
  middle: '미들',
  close: '마감',
  open_middle: '오픈+미들',
  middle_close: '미들+마감',
  all: '전체 협업',
}
const SCOPES = Object.keys(SCOPE_LABELS) as Scope[]
const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일']
const CATS = Object.keys(CATEGORY_LABELS) as Category[]

const EMPTY = {
  id: undefined as string | undefined,
  scope: 'open' as Scope,
  weekday: 1,
  title: '',
  description: '',
  category: 'etc' as Category,
  is_periodic: false,
  guide: '',
  example_photo_url: '',
}

export default function TemplatesPage() {
  const [rows, setRows] = useState<TaskTemplate[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      setRows(await listAllTemplates())
    } catch (e) {
      setError((e as Error).message)
    }
  }
  useEffect(() => {
    load()
  }, [])

  async function save() {
    if (!form.title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await upsertTemplate({
        id: form.id,
        scope: form.scope,
        weekday: form.weekday,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        is_periodic: form.is_periodic,
        guide: form.guide.trim() || undefined,
        example_photo_url: form.example_photo_url || undefined,
        sort: 0,
        active: true,
      })
      setForm({ ...EMPTY })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('삭제할까요?')) return
    await deleteTemplate(id)
    await load()
  }

  function edit(t: TaskTemplate) {
    setForm({
      id: t.id,
      scope: t.scope,
      weekday: t.weekday,
      title: t.title,
      description: t.description ?? '',
      category: t.category,
      is_periodic: t.is_periodic,
      guide: t.guide ?? '',
      example_photo_url: t.example_photo_url ?? '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onExampleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadExamplePhoto(file, form.id ?? `new-${Date.now()}`)
      setForm((f) => ({ ...f, example_photo_url: url }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* 추가/수정 폼 */}
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-extrabold">{form.id ? '업무 수정' : '업무 추가'}</h2>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as Scope })}
              className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
            >
              {SCOPES.map((s) => (
                <option key={s} value={s}>
                  {SCOPE_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              value={form.weekday}
              onChange={(e) => setForm({ ...form, weekday: Number(e.target.value) })}
              className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
            >
              {WEEKDAYS.map((w, i) => (
                <option key={i} value={i + 1}>
                  {w}요일
                </option>
              ))}
            </select>
          </div>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="업무 제목"
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="세부 설명(선택)"
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
              className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 px-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_periodic}
                onChange={(e) => setForm({ ...form, is_periodic: e.target.checked })}
              />
              🔁 정기 업무
            </label>
          </div>
          <textarea
            value={form.guide}
            onChange={(e) => setForm({ ...form, guide: e.target.value })}
            placeholder="📖 업무 가이드 (어떻게 하는지, 줄바꿈으로 단계 구분)"
            rows={3}
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          <div className="rounded-xl border-2 border-pink-100 p-3">
            <div className="mb-2 text-sm font-bold text-pink-600">🖼 사진 예시</div>
            {form.example_photo_url ? (
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.example_photo_url} alt="예시" className="w-full rounded-xl" />
                <button
                  onClick={() => setForm({ ...form, example_photo_url: '' })}
                  className="self-start text-xs text-pink-600 underline"
                >
                  예시 사진 제거
                </button>
              </div>
            ) : (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 py-4 text-sm font-bold text-pink-600">
                📷 예시 사진 업로드
                <input type="file" accept="image/*" className="hidden" onChange={onExampleFile} />
              </label>
            )}
          </div>
          {error && <p className="text-sm text-pink-600">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={busy || !form.title.trim()}
              className="flex-1 rounded-full bg-mint-500 py-3 font-bold text-white disabled:opacity-40"
            >
              {form.id ? '수정 저장' : '추가'}
            </button>
            {form.id && (
              <button
                onClick={() => setForm({ ...EMPTY })}
                className="rounded-full border-2 border-gray-200 px-4 py-3 text-sm font-bold text-ink-soft"
              >
                취소
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 목록 */}
      <section className="flex flex-col gap-2">
        {SCOPES.map((scope) => {
          const items = rows.filter((r) => r.scope === scope)
          if (items.length === 0) return null
          return (
            <div key={scope} className="rounded-2xl bg-white/70 p-3 shadow-sm">
              <h3 className="mb-2 text-sm font-extrabold text-mint-700">{SCOPE_LABELS[scope]}</h3>
              <ul className="flex flex-col gap-1">
                {items.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <span className="w-6 shrink-0 text-xs text-ink-soft">
                      {WEEKDAYS[t.weekday - 1]}
                    </span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLOR[t.category] }}
                    />
                    <span className="font-semibold">
                      {t.is_periodic ? '🔁 ' : ''}
                      {t.title}
                      {(t.guide || t.example_photo_url) && ' 📖'}
                    </span>
                    <span className="ml-auto flex gap-2">
                      <button onClick={() => edit(t)} className="text-xs text-mint-700 underline">
                        수정
                      </button>
                      <button onClick={() => remove(t.id)} className="text-xs text-pink-600 underline">
                        삭제
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </section>
    </div>
  )
}
