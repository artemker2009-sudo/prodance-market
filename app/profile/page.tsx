'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [displayName, setDisplayName] = useState('')
  const [displayPhone, setDisplayPhone] = useState('')
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    let active = true

    const loadUser = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (!active) {
        return
      }

      if (userError) {
        setError(userError.message)
        setLoading(false)
        return
      }

      if (!user) {
        router.push('/login')
        router.refresh()
        return
      }

      const metadataName =
        typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : ''
      const phoneFromEmail = user.email?.endsWith('@prodance.app')
        ? user.email.replace('@prodance.app', '')
        : ''

      setDisplayName(metadataName)
      setDisplayPhone(user.phone || phoneFromEmail)
      setLoading(false)
    }

    void loadUser()

    return () => {
      active = false
    }
  }, [router])

  const handleSignOut = async () => {
    setError('')
    setIsSigningOut(true)

    const { error: signOutError } = await supabase.auth.signOut()

    setIsSigningOut(false)

    if (signOutError) {
      setError(signOutError.message)
      return
    }

    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pb-28 md:pb-0">
        <p className="text-sm text-neutral-500">Загрузка профиля...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-10 pb-28 md:pb-10">
      <section className="w-full space-y-5 rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">Профиль</h1>
          <p className="text-sm leading-6 text-neutral-500">
            Аккаунт, с которым вы сейчас вошли в ProDance.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
            <p className="text-xs text-neutral-500">Имя</p>
            <p className="mt-1 text-base font-medium text-neutral-950">
              {displayName || 'Не указано'}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4">
            <p className="text-xs text-neutral-500">Телефон</p>
            <p className="mt-1 text-base font-medium text-neutral-950">
              {displayPhone || 'Не указан'}
            </p>
          </div>
        </div>

        {error ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full rounded-2xl bg-red-600 px-4 py-4 text-base font-semibold text-white transition hover:bg-neutral-950 disabled:opacity-60"
        >
          {isSigningOut ? 'Выходим из аккаунта...' : 'Выйти из аккаунта'}
        </button>
      </section>
    </main>
  )
}
