'use client'

import { usePathname } from 'next/navigation'
import AdminShell from '../../components/admin/AdminShell'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isAuthRoute = pathname.startsWith('/admin/login') || pathname.startsWith('/admin/auth/callback')

  if (isAuthRoute) {
    return <>{children}</>
  }

  return <AdminShell>{children}</AdminShell>
}
