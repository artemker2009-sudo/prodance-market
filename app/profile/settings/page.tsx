'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace('/login')
  }, [loading, router, user])

  useEffect(() => {
    if (!user) {
      return
    }

    setName(typeof user.user_metadata?.name === 'string' ? user.user_metadata.name : '')
    setCity(typeof user.user_metadata?.city === 'string' ? user.user_metadata.city : '')
    setAvatarPreviewUrl(
      typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : ''
    )
  }, [user])

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreviewUrl)
      }
    }
  }, [avatarPreviewUrl])

  const hasAvatar = useMemo(() => Boolean(avatarPreviewUrl), [avatarPreviewUrl])

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    setAvatarFile(file)
    setSuccess('')
    setError('')

    if (avatarPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreviewUrl)
    }

    setAvatarPreviewUrl(URL.createObjectURL(file))
  }

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setError('Сначала войдите в аккаунт')
      return
    }

    setError('')
    setSuccess('')
    setIsSavingProfile(true)

    try {
      let nextAvatarUrl =
        typeof user.user_metadata?.avatar_url === 'string' ? user.user_metadata.avatar_url : ''

      if (avatarFile) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const fileName = `${user.id}-${Date.now()}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true, cacheControl: '3600' })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(fileName)
        nextAvatarUrl = publicUrl
      }

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          name: name.trim(),
          city: city.trim(),
          avatar_url: nextAvatarUrl || null,
        },
      })

      if (updateError) {
        throw updateError
      }

      setAvatarFile(null)
      setSuccess('Данные профиля сохранены')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось сохранить данные')
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const nextPassword = password.trim()

    if (!nextPassword) {
      setError('Введите новый пароль')
      return
    }

    if (nextPassword.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }

    setError('')
    setSuccess('')
    setIsSavingPassword(true)

    const { error: passwordError } = await supabase.auth.updateUser({
      password: nextPassword,
    })

    setIsSavingPassword(false)

    if (passwordError) {
      setError(passwordError.message)
      return
    }

    setPassword('')
    setSuccess('Пароль обновлен')
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-0">
        <p className="text-sm text-slate-500">Загрузка настроек...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-5 pb-28 text-slate-950">
      <div className="mx-auto w-full max-w-md">
        <header className="mb-5 flex items-center gap-3">
          <Link
            href="/profile"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Назад в профиль"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Настройки аккаунта</h1>
            <p className="text-sm text-slate-500">Минималистичный контроль профиля</p>
          </div>
        </header>

        <form
          onSubmit={handleProfileSubmit}
          className="space-y-4 rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-sm"
        >
          <div>
            <p className="text-sm font-medium text-slate-600">Аватарка</p>
            <div className="mt-3 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
                {hasAvatar ? (
                  <img src={avatarPreviewUrl} alt="Аватар" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-8 w-8" />
                )}
              </div>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-[#faf7f3] px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Выбрать фото
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div>
            <label htmlFor="name" className="mb-2 block text-sm font-medium text-slate-600">
              Имя
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Ваше имя"
            />
          </div>

          <div>
            <label htmlFor="city" className="mb-2 block text-sm font-medium text-slate-600">
              Город
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Ваш город"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingProfile}
            className="h-12 w-full rounded-xl bg-slate-950 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {isSavingProfile ? 'Сохраняем...' : 'Сохранить профиль'}
          </button>
        </form>

        <form
          onSubmit={handlePasswordSubmit}
          className="mt-4 space-y-4 rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-sm"
        >
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium text-slate-600">
              Новый пароль
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Минимум 6 символов"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingPassword}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            {isSavingPassword ? 'Обновляем...' : 'Обновить пароль'}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
      </div>
    </main>
  )
}
