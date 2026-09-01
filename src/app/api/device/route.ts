import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  let code = ''
  try {
    const body = await req.json()
    code = String(body?.code ?? '')
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const real = process.env.DEVICE_CODE || ''
  if (!real) {
    // 코드 미설정 시 게이트 비활성(제한 없음)
    return NextResponse.json({ ok: true, disabled: true })
  }
  if (code !== real) {
    return NextResponse.json({ ok: false, error: '코드가 올바르지 않아요.' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}

// 게이트 활성 여부만 확인(코드 노출 없음)
export async function GET() {
  return NextResponse.json({ enabled: !!(process.env.DEVICE_CODE || '') })
}
