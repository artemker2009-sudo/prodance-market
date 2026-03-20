'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  ChevronRight,
  Headphones,
  Heart,
  LogOut,
  MapPin,
  Settings2,
  Sparkles,
  UserRound,
} from 'lucide-react'

import { useAuth } from '../components/AuthProvider'
import { supabase, waitForSupabaseSession } from '../lib/supabase'

const menuItems = [
  {
    key: 'favorites',
    label: 'Избранное',
    icon: Heart,
    href: '/profile/favorites',
  },
  {
    key: 'my-listings',
    label: 'Мои объявления',
    icon: Sparkles,
    href: '/profile/my-listings',
  },
  {
    key: 'settings',
    label: 'Настройки аккаунта',
    icon: Settings2,
    href: '/profile/settings',
  },
  {
    key: 'notifications',
    label: 'Уведомления',
    icon: Bell,
  },
  {
    key: 'support',
    label: 'Служба поддержки',
    icon: Headphones,
  },
] as const

export default function ProfilePage() {
  const router = useRouter()
  const { session, profile, loading } = useAuth()
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [stats, setStats] = useState({
    published: 0,
    favorites: 0,
    sold: 0,
  })
  const [toastMessage, setToastMessage] = useState('')
  const user = session?.user ?? null
  const avatarUrl =
    typeof user?.user_metadata?.avatar_url === 'string'
      ? user.user_metadata.avatar_url
      : ''
  const displayPhone = useMemo(() => {
    const phoneFromEmail = user?.email?.endsWith('@prodance.app')
      ? user.email.replace('@prodance.app', '')
      : ''

    return user?.phone || phoneFromEmail
  }, [user])
  const maskedPhone = useMemo(() => {
    const digits = displayPhone.replace(/\D/g, '')

    if (digits.length < 4) {
      return '+7 *** *** ** **'
    }

    const tail = digits.slice(-4)

    return `+7 *** *** ${tail.slice(0, 2)} ${tail.slice(2)}`
  }, [displayPhone])
  const city = useMemo(() => {
    if (typeof profile?.city === 'string' && profile.city.trim()) {
      return profile.city.trim()
    }

    return typeof user?.user_metadata?.city === 'string' && user.user_metadata.city.trim()
      ? user.user_metadata.city.trim()
      : 'Город не указан'
  }, [profile?.city, user])
  const displayName = useMemo(() => {
    if (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) {
      return user.user_metadata.name.trim()
    }

    return 'Профиль'
  }, [user])

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace('/login')
    router.refresh()
  }, [loading, router, user])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true

    const loadStats = async () => {
      const [publishedResult, favoritesResult, soldResult] = await Promise.all([
        (supabase.from('items') as any)
          .select('id', { head: true, count: 'exact' })
          .eq('seller_id', user.id),
        (supabase.from('favorites') as any)
          .select('id', { head: true, count: 'exact' })
          .eq('user_id', user.id),
        (supabase.from('items') as any)
          .select('id', { head: true, count: 'exact' })
          .eq('seller_id', user.id)
          .in('status', ['sold', 'продано']),
      ])

      if (!active) {
        return
      }

      setStats({
        published: publishedResult.count ?? 0,
        favorites: favoritesResult.count ?? 0,
        sold: soldResult.count ?? 0,
      })
    }

    void loadStats()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleMenuClick = (item: (typeof menuItems)[number]) => {
    if ('href' in item) {
      router.push(item.href)
      return
    }

    if (item.key === 'support') {
      setToastMessage('Служба поддержки будет добавлена вместе с запуском админ-панели')
      return
    }

    if (item.key === 'notifications') {
      setToastMessage('Уведомления находятся в разработке')
    }
  }

  const handleSignOut = async () => {
    setError('')
    setIsSigningOut(true)

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setIsSigningOut(false)
      setError(signOutError.message)
      return
    }

    await waitForSupabaseSession('signed-out')
    window.location.assign('/login')
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-0">
        <p className="text-sm text-slate-500">Загрузка профиля...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-6 pb-28 text-slate-950 md:pb-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <section className="rounded-[2rem] border border-slate-200/70 bg-white px-6 py-8 text-center shadow-sm">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Аватар профиля" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-12 w-12" />
            )}
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{displayName}</h1>
          <p className="mt-2 text-base font-medium text-slate-950">{maskedPhone}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#faf7f3] px-4 py-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            <span>{city}</span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-200/70">
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">{stats.published}</p>
              <p className="mt-1 text-xs text-slate-500">Опубликовано</p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">{stats.favorites}</p>
              <p className="mt-1 text-xs text-slate-500">В избранном</p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">{stats.sold}</p>
              <p className="mt-1 text-xs text-slate-500">Продано</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm">
          <ul className="divide-y divide-slate-200/70">
            {menuItems.map((item) => {
              const Icon = item.icon

              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => handleMenuClick(item)}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf7f3] text-slate-700">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-950">
                      {item.label}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 rounded-[1.5rem] bg-[#faf7f3] px-4 py-3 text-sm text-slate-500">
            <Heart className="h-4 w-4" />
            <span>Коллекции, отзывы и персонализация появятся на следующих итерациях.</span>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-slate-950 px-5 text-base font-semibold text-white shadow-sm disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            <span>{isSigningOut ? 'Выходим...' : 'Выйти'}</span>
          </button>
        </section>
      </div>
      {toastMessage ? (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-900/10">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </main>
  )
}
