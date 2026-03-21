'use client'

import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'

import { BottomNav } from './BottomNav'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const isAdminRoute = pathname.startsWith('/admin')

  if (isAdminRoute) {
    return <>{children}</>
  }

  return (
    <div className="mx-auto min-h-screen max-w-[480px] bg-white shadow-xl">
      <div className="min-h-screen pb-20 md:pb-0">{children}</div>
      <BottomNav />
    </div>
  )
}
