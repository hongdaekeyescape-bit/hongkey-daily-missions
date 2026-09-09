import { NextResponse } from 'next/server'

// 미션 완료 시 텔레그램 알림. 토큰/챗ID 없으면 조용히 건너뜀(비활성).
// 클라이언트는 구조화된 필드만 보내고, 문구는 서버가 구성(임의 메시지 방지).
export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN || ''
  const chatId = process.env.TELEGRAM_CHAT_ID || ''
  if (!token || !chatId) {
    return NextResponse.json({ ok: false, disabled: true })
  }

  let name = ''
  let title = ''
  let role = ''
  let photos: string[] = []
  let at = ''
  try {
    const b = await req.json()
    name = String(b?.name ?? '').slice(0, 40)
    title = String(b?.title ?? '').slice(0, 120)
    role = String(b?.role ?? '').slice(0, 20)
    at = String(b?.at ?? '').slice(0, 40)
    const raw = Array.isArray(b?.photoUrls) ? b.photoUrls : b?.photoUrl ? [b.photoUrl] : []
    photos = raw
      .map((u: unknown) => String(u ?? ''))
      .filter((u: string) => /^https?:\/\//.test(u))
      .slice(0, 10) // 텔레그램 앨범 최대 10장
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!name || !title) return NextResponse.json({ ok: false }, { status: 400 })

  const caption = `✅ 업무 완료\n• ${title}${role ? ` (${role})` : ''}\n• 완료자: ${name}${at ? `\n• ${at}` : ''}`

  const url = (method: string) => `https://api.telegram.org/bot${token}/${method}`
  const send = async (method: string, payload: object) => {
    const r = await fetch(url(method), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return r.json()
  }

  try {
    let data
    if (photos.length >= 2) {
      // 여러 장 → 앨범(캡션은 첫 장에)
      const media = photos.map((p, i) => ({
        type: 'photo',
        media: p,
        ...(i === 0 ? { caption } : {}),
      }))
      data = await send('sendMediaGroup', { chat_id: chatId, media })
    } else if (photos.length === 1) {
      data = await send('sendPhoto', { chat_id: chatId, photo: photos[0], caption })
    } else {
      data = await send('sendMessage', { chat_id: chatId, text: caption })
    }
    if (!data.ok) return NextResponse.json({ ok: false, error: data.description }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
