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
  let photoUrl = ''
  let at = ''
  try {
    const b = await req.json()
    name = String(b?.name ?? '').slice(0, 40)
    title = String(b?.title ?? '').slice(0, 120)
    role = String(b?.role ?? '').slice(0, 20)
    photoUrl = String(b?.photoUrl ?? '').slice(0, 500)
    at = String(b?.at ?? '').slice(0, 40)
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!name || !title) return NextResponse.json({ ok: false }, { status: 400 })

  const caption = `✅ 업무 완료\n• ${title}${role ? ` (${role})` : ''}\n• 완료자: ${name}${at ? `\n• ${at}` : ''}`

  try {
    const isHttp = /^https?:\/\//.test(photoUrl)
    const api = `https://api.telegram.org/bot${token}/${isHttp ? 'sendPhoto' : 'sendMessage'}`
    const payload = isHttp
      ? { chat_id: chatId, photo: photoUrl, caption }
      : { chat_id: chatId, text: caption }
    const r = await fetch(api, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await r.json()
    if (!data.ok) return NextResponse.json({ ok: false, error: data.description }, { status: 502 })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 })
  }
}
