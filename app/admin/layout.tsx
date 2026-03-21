import type { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Headset, Home, LogOut, Package, Shield, Users } from 'lucide-react'

const ADMIN_COOKIE = 'admin_token'
const ADMIN_PASSWORD = 'Artem.ker.09'

async function loginAdmin(formData: FormData) {
  'use server'

  const password = formData.get('password')

  if (password !== ADMIN_PASSWORD) {
    return
  }

  const cookieStore = await cookies()
  cookieStore.set(ADMIN_COOKIE, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  redirect('/admin')
}

async function logoutAdmin() {
  'use server'

  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_COOKIE)
  redirect('/admin')
}

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const cookieStore = await cookies()
  const hasAccess = cookieStore.get(ADMIN_COOKIE)?.value === 'true'

  if (!hasAccess) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 py-10">
        <form
          action={loginAdmin}
          className="w-full max-w-md space-y-5 rounded-3xl border border-slate-200/60 bg-white p-8 shadow-[0_30px_80px_rgba(15,23,42,0.08)]"
        >
          <div className="space-y-2 text-center">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Admin Access</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Вход в панель</h1>
          </div>

          <input
            name="password"
            type="password"
            placeholder="Пароль"
            className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            required
          />

          <button
            type="submit"
            className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Войти
          </button>
        </form>
      </main>
    )
  }

  const navItems = [
    { href: '/admin', label: 'Дашборд', icon: Home },
    { href: '/admin/items', label: 'Объявления', icon: Package },
    { href: '/admin/users', label: 'Пользователи', icon: Users },
    { href: '/admin/support', label: 'Поддержка', icon: Headset },
  ]

  return (
    <div className="min-h-screen bg-[#faf7f3] text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] grid-cols-1 gap-6 px-4 py-6 md:grid-cols-[260px_1fr] md:px-6">
        <aside className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Marketplace</p>
              <p className="text-lg font-semibold tracking-tight">Admin Panel</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-[#faf7f3] hover:text-slate-950"
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <form action={logoutAdmin} className="mt-8">
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600 transition hover:bg-red-100"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </form>
        </aside>

        <section className="rounded-3xl border border-slate-200/60 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] md:p-8">
          {children}
        </section>
      </div>
    </div>
  )
}
