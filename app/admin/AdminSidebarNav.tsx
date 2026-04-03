"use client";

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FileWarning, FileText, Headset, Home, Trash2, Users } from 'lucide-react'

type NavItem = {
  href: string
  label: string
}

type Props = {
  navItems: NavItem[]
}

function getNavIcon(href: string) {
  if (href === '/admin/items') {
    return FileText
  }

  if (href === '/admin/users') {
    return Users
  }

  if (href === '/admin/support') {
    return Headset
  }

  if (href === '/admin/reports') {
    return FileWarning
  }

  if (href === '/admin/deleted') {
    return Trash2
  }

  return Home
}

export default function AdminSidebarNav({ navItems }: Props) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin'
    }

    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav className="space-y-2">
      {navItems.map((item) => {
        const Icon = getNavIcon(item.href)
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
              active
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
