import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** 브라우저/서버 공용 (anon 키). 내부 매장용이라 anon으로 읽고 쓴다. */
export function getClient(): SupabaseClient {
  if (!url || !anonKey) {
    throw new Error('Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)가 없습니다.')
  }
  return createClient(url, anonKey, { auth: { persistSession: false } })
}

/** 서버 전용 (service role). 시드/관리 작업용. */
export function getServiceClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !serviceKey) {
    throw new Error('Supabase service role 환경변수가 없습니다.')
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}
