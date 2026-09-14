import { redirect } from 'next/navigation'

// 모든 접속을 v2로 통일(압축·텔레그램 알림 포함). 옛 화면 코드는 git 이력에 보존.
export default function Home() {
  redirect('/v2')
}
