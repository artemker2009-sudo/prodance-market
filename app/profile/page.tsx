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
    label: 'Мои объявления',
    icon: Sparkles,
  },
  {
    label: 'Настройки аккаунта',
    icon: Settings2,
  },
  {
    label: 'Уведомления',
    icon: Bell,
  },
  {
    label: 'Служба поддержки',
    icon: Headphones,
  },
] as const

export default function ProfilePage() {
  const router = useRouter()
  const { session, profile, loading } = useAuth()
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const user = session?.user ?? null
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

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace('/login')
    router.refresh()
  }, [loading, router, user])

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
          <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-slate-500">
            <UserRound className="h-12 w-12" />
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">Профиль</h1>
          <p className="mt-2 text-base font-medium text-slate-950">{maskedPhone}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#faf7f3] px-4 py-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            <span>{city}</span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-200/70">
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">0</p>
              <p className="mt-1 text-xs text-slate-500">Опубликовано</p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">0</p>
              <p className="mt-1 text-xs text-slate-500">В избранном</p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">0</p>
              <p className="mt-1 text-xs text-slate-500">Продано</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm">
          <ul className="divide-y divide-slate-200/70">
            {menuItems.map(({ label, icon: Icon }) => (
              <li key={label}>
                <button
                  type="button"
                  className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf7f3] text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-950">
                    {label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </button>
              </li>
            ))}
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
    </main>
  )
}
