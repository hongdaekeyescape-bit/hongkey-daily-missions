import { NextResponse } from 'next/server'
import { ADMIN_COOKIE, checkPin, makeToken } from '@/lib/adminAuth'

export async function POST(req: Request) {
  let pin = ''
  try {
    const body = await req.json()
    pin = String(body?.pin ?? '')
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!process.env.ADMIN_PIN) {
    return NextResponse.json(
      { ok: false, error: '서버에 ADMIN_PIN이 설정되지 않았어요.' },
      { status: 500 }
    )
  }

  if (!checkPin(pin)) {
    return NextResponse.json({ ok: false, error: 'PIN이 올바르지 않아요.' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, makeToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12, // 12시간
  })
  return res
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
