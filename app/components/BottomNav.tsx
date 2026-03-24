'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  CirclePlus,
  House,
  MessageCircle,
  Search,
  UserRound,
} from 'lucide-react'

import { useAuth } from './AuthProvider'
import { buildLoginRedirectHref } from '../lib/auth-routing'

type NavItem = {
  href: string
  label: string
  icon: typeof House
  match: (pathname: string) => boolean
  isAccent?: boolean
  requiresAuth?: boolean
}

const navItems: NavItem[] = [
  {
    href: '/',
    label: 'Главная',
    icon: House,
    match: (pathname) => pathname === '/',
  },
  {
    href: '/search',
    label: 'Поиск',
    icon: Search,
    match: (pathname) => pathname.startsWith('/search'),
  },
  {
    href: '/create',
    label: 'Разместить',
    icon: CirclePlus,
    match: (pathname) => pathname.startsWith('/create'),
    isAccent: true,
    requiresAuth: true,
  },
  {
    href: '/messages',
    label: 'Сообщения',
    icon: MessageCircle,
    match: (pathname) => pathname.startsWith('/messages'),
    requiresAuth: true,
  },
  {
    href: '/profile',
    label: 'Профиль',
    icon: UserRound,
    match: (pathname) => pathname.startsWith('/profile'),
    requiresAuth: true,
  },
]

export function BottomNav() {
  const pathname = usePathname()
  const { session } = useAuth()

  return (
    <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[480px] -translate-x-1/2 justify-around border-t border-gray-200 bg-white pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-xl md:hidden">
      {navItems.map(({ href, label, icon: Icon, match, isAccent, requiresAuth }) => {
        const isActive = match(pathname)
        const resolvedHref =
          requiresAuth && !session ? buildLoginRedirectHref(href) : href

        return (
          <Link
            key={href}
            href={resolvedHref}
            aria-current={isActive ? 'page' : undefined}
            className="flex flex-1 flex-col items-center justify-center gap-1 text-center"
          >
            {isAccent ? (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </span>
            ) : (
              <Icon
                className={isActive ? 'h-5 w-5 text-gray-900' : 'h-5 w-5 text-gray-400'}
                strokeWidth={isActive ? 2.2 : 2}
              />
            )}
            <span
              className={
                isActive || isAccent
                  ? 'text-[10px] font-medium text-gray-900'
                  : 'text-[10px] font-medium text-gray-400'
              }
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
