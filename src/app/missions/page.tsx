import { redirect } from 'next/navigation'

// 옛 미션 화면은 v2로 통일.
export default function MissionsRedirect() {
  redirect('/v2')
}
