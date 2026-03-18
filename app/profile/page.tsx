'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useAuth } from '../components/AuthProvider'
import { supabase } from '../lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const { profile, loading } = useAuth()
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)

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
      <section className="w-full space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Профиль</h1>
          <p className="text-sm text-neutral-500">Данные текущего пользователя</p>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-200 px-4 py-3">
            <p className="text-xs text-neutral-500">Имя</p>
            <p className="text-base font-medium">{profile?.name ?? 'Не указано'}</p>
          </div>

          <div className="rounded-xl border border-neutral-200 px-4 py-3">
            <p className="text-xs text-neutral-500">Телефон</p>
            <p className="text-base font-medium">{profile?.phone ?? 'Не указан'}</p>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-60"
        >
          {isSigningOut ? 'Выходим...' : 'Выйти'}
        </button>
      </section>
    </main>
  )
}
