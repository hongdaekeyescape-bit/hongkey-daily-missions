'use client'

import { useEffect, useState } from 'react'
import {
  CATEGORY_LABELS,
  type Category,
  type Frequency,
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

const FREQ_LABELS: Record<Frequency, string> = {
  always: '상시(매일 해당)',
  biweekly: '짝수주(2·4주)',
  monthly_first: '월 첫주 1회',
}
const FREQS = Object.keys(FREQ_LABELS) as Frequency[]

const EMPTY = {
  id: undefined as string | undefined,
  scope: 'open' as Scope,
  weekday: 1,
  title: '',
  description: '',
  category: 'etc' as Category,
  frequency: 'always' as Frequency,
  guide: '',
  guide_photos: [] as string[],
  guide_captions: [] as string[],
}

export default function TemplatesPage() {
  const [rows, setRows] = useState<TaskTemplate[]>([])
  const [form, setForm] = useState({ ...EMPTY })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fScope, setFScope] = useState<Scope | 'all'>('all')
  const [fWeekday, setFWeekday] = useState(0) // 0 = 전체
  const [fQuery, setFQuery] = useState('')

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
        is_periodic: form.frequency !== 'always',
        frequency: form.frequency,
        guide: form.guide.trim() || undefined,
        guide_photos: form.guide_photos,
        guide_captions: form.guide_captions,
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
      frequency: t.frequency,
      guide: t.guide ?? '',
      guide_photos:
        t.guide_photos && t.guide_photos.length
          ? t.guide_photos
          : t.example_photo_url
            ? [t.example_photo_url]
            : [],
      guide_captions: t.guide_captions ?? [],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function onExampleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files
    if (!list || list.length === 0) return
    const arr = Array.from(list) // value 초기화 전에 스냅샷
    e.target.value = ''
    setBusy(true)
    setError(null)
    try {
      const urls: string[] = []
      for (const file of arr) {
        urls.push(await uploadExamplePhoto(file, form.id ?? `new-${Date.now()}`))
      }
      setForm((f) => ({
        ...f,
        guide_photos: [...f.guide_photos, ...urls],
        guide_captions: [...f.guide_captions, ...urls.map(() => '')],
      }))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function removeGuidePhoto(i: number) {
    setForm((f) => ({
      ...f,
      guide_photos: f.guide_photos.filter((_, idx) => idx !== i),
      guide_captions: f.guide_captions.filter((_, idx) => idx !== i),
    }))
  }

  function setCaption(i: number, v: string) {
    setForm((f) => ({
      ...f,
      guide_captions: f.guide_photos.map((_, idx) => (idx === i ? v : f.guide_captions[idx] ?? '')),
    }))
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
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value as Frequency })}
              className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
            >
              {FREQS.map((f) => (
                <option key={f} value={f}>
                  {FREQ_LABELS[f]}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={form.guide}
            onChange={(e) => setForm({ ...form, guide: e.target.value })}
            placeholder="📖 업무 가이드 (어떻게 하는지, 줄바꿈으로 단계 구분)"
            rows={3}
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          />
          <div className="rounded-xl border-2 border-pink-100 p-3">
            <div className="mb-2 text-sm font-bold text-pink-600">🖼 사진 예시 (여러 장 가능)</div>
            {form.guide_photos.length > 0 && (
              <div className="mb-2 flex flex-col gap-2">
                {form.guide_photos.map((u, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="relative shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={u} alt={`예시 ${i + 1}`} className="h-14 w-14 rounded-lg object-cover" />
                      <button
                        onClick={() => removeGuidePhoto(i)}
                        className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-pink-500 text-[10px] font-bold text-white"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      value={form.guide_captions[i] ?? ''}
                      onChange={(e) => setCaption(i, e.target.value)}
                      placeholder="캡션(선택) 예: 현관은 이렇게"
                      className="flex-1 rounded-lg border-2 border-pink-100 px-2 py-1.5 text-xs"
                    />
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50 py-3 text-sm font-bold text-pink-600">
              📷 {form.guide_photos.length > 0 ? '예시 사진 추가' : '예시 사진 업로드'}
              <input type="file" accept="image/*" multiple className="hidden" onChange={onExampleFile} />
            </label>
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

      {/* 필터 */}
      <section className="rounded-2xl bg-white/70 p-3 shadow-sm">
        <div className="mb-2 grid grid-cols-2 gap-2">
          <select
            value={fScope}
            onChange={(e) => setFScope(e.target.value as Scope | 'all')}
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          >
            <option value="all">전체 근무형태</option>
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            value={fWeekday}
            onChange={(e) => setFWeekday(Number(e.target.value))}
            className="rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
          >
            <option value={0}>전체 요일</option>
            {WEEKDAYS.map((w, i) => (
              <option key={i} value={i + 1}>
                {w}요일
              </option>
            ))}
          </select>
        </div>
        <input
          value={fQuery}
          onChange={(e) => setFQuery(e.target.value)}
          placeholder="업무 이름 검색"
          className="w-full rounded-xl border-2 border-mint-200 px-3 py-2 text-sm"
        />
        {(fScope !== 'all' || fWeekday !== 0 || fQuery.trim()) && (
          <button
            onClick={() => {
              setFScope('all')
              setFWeekday(0)
              setFQuery('')
            }}
            className="mt-2 text-xs text-pink-600 underline"
          >
            필터 초기화
          </button>
        )}
      </section>

      {/* 목록 */}
      <section className="flex flex-col gap-2">
        {rows.filter(
          (r) =>
            (fScope === 'all' || r.scope === fScope) &&
            (fWeekday === 0 || r.weekday === fWeekday) &&
            (!fQuery.trim() || r.title.includes(fQuery.trim()))
        ).length === 0 && (
          <p className="rounded-2xl bg-white/70 p-4 text-center text-sm text-ink-soft shadow-sm">
            조건에 맞는 업무가 없어요.
          </p>
        )}
        {SCOPES.filter((s) => fScope === 'all' || s === fScope).map((scope) => {
          const q = fQuery.trim()
          const items = rows.filter(
            (r) =>
              r.scope === scope &&
              (fWeekday === 0 || r.weekday === fWeekday) &&
              (!q || r.title.includes(q))
          )
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
                      {t.frequency === 'monthly_first' ? '📅 ' : t.frequency === 'biweekly' ? '🔁 ' : ''}
                      {t.title}
                      {(t.guide || t.example_photo_url || (t.guide_photos && t.guide_photos.length > 0)) && ' 📖'}
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
