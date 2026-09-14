import { NextResponse } from 'next/server'

// 사진 다운로드+업로드가 느릴 수 있어 함수 최대 실행시간을 늘림(Vercel 플랜 한도 내).
export const maxDuration = 60

// 미션 완료 시 텔레그램 알림. 토큰/챗ID 없으면 조용히 건너뜀(비활성).
// 사진은 URL을 텔레그램이 가져가게 하지 않고, 서버가 직접 내려받아 바이트로 업로드한다.
// (URL 방식은 WEBPAGE_CURL_FAILED로 앨범 전체가 실패하는 문제가 있었음)
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, disabled: true })
  }

  let name = ''
  let title = ''
  let role = ''
  let urls: string[] = []
  let at = ''
  try {
    const b = await req.json()
    name = String(b?.name ?? '').slice(0, 40)
    title = String(b?.title ?? '').slice(0, 120)
    role = String(b?.role ?? '').slice(0, 20)
    at = String(b?.at ?? '').slice(0, 40)
    const raw = Array.isArray(b?.photoUrls) ? b.photoUrls : b?.photoUrl ? [b.photoUrl] : []
    urls = raw
      .map((u: unknown) => String(u ?? ''))
      .filter((u: string) => /^https?:\/\//.test(u))
      .slice(0, 30)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!name || !title) return NextResponse.json({ ok: false }, { status: 400 })

  const caption = `✅ 업무 완료\n• ${title}${role ? ` (${role})` : ''}\n• 완료자: ${name}${at ? `\n• ${at}` : ''}`
  const api = (method: string) => `https://api.telegram.org/bot${token}/${method}`

  // 429(레이트리밋) 시 retry_after만큼 대기 후 1회 재시도
  async function tgFetch(method: string, body: BodyInit, isJson: boolean): Promise<{ ok: boolean; description?: string }> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const r = await fetch(api(method), {
        method: 'POST',
        ...(isJson ? { headers: { 'content-type': 'application/json' } } : {}),
        body,
      })
      const d = await r.json().catch(() => ({ ok: false }))
      if (d.ok) return { ok: true }
      if (r.status === 429 && d.parameters?.retry_after && attempt === 0) {
        await new Promise((res) => setTimeout(res, (d.parameters.retry_after + 1) * 1000))
        continue
      }
      return { ok: false, description: d.description }
    }
    return { ok: false, description: 'retry exhausted' }
  }

  // 각 사진을 서버가 직접 내려받아 Blob으로 (실패한 장은 건너뜀)
  const blobs: Blob[] = []
  await Promise.all(
    urls.map(async (u) => {
      try {
        const r = await fetch(u)
        if (!r.ok) return
        const b = await r.blob()
        if (b.size > 0 && b.size < 9_000_000) blobs.push(b)
      } catch {
        /* 개별 실패 무시 */
      }
    })
  )

  try {
    // 사진 없음 → 텍스트
    if (blobs.length === 0) {
      const res = await tgFetch(
        'sendMessage',
        JSON.stringify({ chat_id: chatId, text: caption }),
        true
      )
      return NextResponse.json(res.ok ? { ok: true } : { ok: false, error: res.description }, {
        status: res.ok ? 200 : 502,
      })
    }

    // 1장 → sendPhoto (multipart 업로드)
    if (blobs.length === 1) {
      const fd = new FormData()
      fd.append('chat_id', chatId)
      fd.append('caption', caption)
      fd.append('photo', blobs[0], 'photo.jpg')
      const res = await tgFetch('sendPhoto', fd, false)
      return NextResponse.json(res.ok ? { ok: true } : { ok: false, error: res.description }, {
        status: res.ok ? 200 : 502,
      })
    }

    // 여러 장 → 10장씩 앨범 분할 (multipart 업로드, 캡션은 첫 앨범 첫 장에)
    let firstChunk = true
    let allOk = true
    let lastErr: string | undefined
    for (let i = 0; i < blobs.length; i += 10) {
      const chunk = blobs.slice(i, i + 10)
      const fd = new FormData()
      fd.append('chat_id', chatId)
      const media = chunk.map((_, idx) => ({
        type: 'photo',
        media: `attach://p${idx}`,
        ...(firstChunk && idx === 0 ? { caption } : {}),
      }))
      fd.append('media', JSON.stringify(media))
      chunk.forEach((b, idx) => fd.append(`p${idx}`, b, `p${idx}.jpg`))
      const res = await tgFetch('sendMediaGroup', fd, false)
      if (!res.ok) {
        allOk = false
        lastErr = res.description
      }
      firstChunk = false
    }
    return NextResponse.json(allOk ? { ok: true } : { ok: false, error: lastErr }, {
      status: allOk ? 200 : 502,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 })
  }
}
