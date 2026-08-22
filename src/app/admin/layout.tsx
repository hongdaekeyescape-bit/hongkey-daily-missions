import Link from 'next/link'
import { isAdmin } from '@/lib/adminAuth'
import AdminLogin from '@/components/AdminLogin'
import AdminLogout from '@/components/AdminLogout'

const TABS = [
  { href: '/admin/status', label: '완료현황' },
  { href: '/admin/templates', label: '고정업무' },
  { href: '/admin/assignments', label: '약속업무' },
  { href: '/admin/staff', label: '직원명단' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) {
    return <AdminLogin />
  }
  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between pt-2">
        <h1 className="text-lg font-extrabold">🛠️ 관리자</h1>
        <AdminLogout />
      </header>
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-full border-2 border-mint-200 bg-white px-3 py-1.5 text-sm font-bold text-mint-700"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}
