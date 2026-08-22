import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'dm_admin'

function secret(): string {
  return process.env.ADMIN_SECRET || 'dev-insecure-secret'
}

/** PIN 검증에 성공했을 때 발급할 토큰(비밀에 대한 HMAC). PIN 자체는 담지 않는다. */
export function makeToken(): string {
  return createHmac('sha256', secret()).update('admin-ok').digest('hex')
}

export function verifyToken(token: string | undefined): boolean {
  if (!token) return false
  const expected = makeToken()
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** PIN이 서버 환경변수와 일치하는지 (타이밍 안전 비교). */
export function checkPin(pin: string): boolean {
  const real = process.env.ADMIN_PIN || ''
  if (!real) return false
  const a = Buffer.from(pin)
  const b = Buffer.from(real)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** 서버 컴포넌트에서 현재 요청이 관리자로 인증됐는지. */
export async function isAdmin(): Promise<boolean> {
  const store = await cookies()
  return verifyToken(store.get(ADMIN_COOKIE)?.value)
}
