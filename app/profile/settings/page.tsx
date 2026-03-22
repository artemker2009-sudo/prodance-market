'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Send, UserRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

export default function ProfileSettingsPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [password, setPassword] = useState('')
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [telegramChatId, setTelegramChatId] = useState<string | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unknown'>(
    'unknown'
  )
  const [notificationsError, setNotificationsError] = useState('')
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

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

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    setIsIOS(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    )
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator &&
          (navigator as Navigator & { standalone?: boolean }).standalone === true)
    )

    if ('Notification' in window) {
      setPermissionStatus(Notification.permission)
    } else {
      setPermissionStatus('unknown')
    }
  }, [])

  useEffect(() => {
    if (!user) {
      return
    }

    let isActive = true
    setIsLoadingNotifications(true)
    setNotificationsError('')

    const loadNotificationSettings = async () => {
      try {
        const { data, error } = await (supabase.from('profiles') as any)
          .select('telegram_chat_id')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (isActive) {
          setTelegramChatId(data?.telegram_chat_id ?? null)
        }
      } catch (notificationError) {
        if (isActive) {
          const message =
            notificationError instanceof Error
              ? notificationError.message
              : 'Не удалось загрузить настройки уведомлений'
          setNotificationsError(message)
        }
      } finally {
        if (isActive) {
          setIsLoadingNotifications(false)
        }
      }
    }

    void loadNotificationSettings()

    return () => {
      isActive = false
    }
  }, [user])

  const hasAvatar = useMemo(() => Boolean(avatarPreviewUrl), [avatarPreviewUrl])
  const telegramBotLink = useMemo(
    () => `tg://resolve?domain=prodance_market_bot&start=${user?.id ?? ''}`,
    [user?.id]
  )

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) {
      return
    }

    const uploadAvatar = async () => {
      setError('')
      setSuccess('')
      setIsUploadingAvatar(true)

      try {
        const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
        const fileName = `${user.id}/avatar-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, file, { upsert: true, cacheControl: '3600' })

        if (uploadError) {
          throw uploadError
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('avatars').getPublicUrl(fileName)

        const { error: updateError } = await supabase.auth.updateUser({
          data: {
            ...user.user_metadata,
            avatar_url: publicUrl,
          },
        })

        if (updateError) {
          throw updateError
        }

        setAvatarPreviewUrl(publicUrl)
        setSuccess('Аватар обновлен')
      } catch (uploadAvatarError) {
        const message =
          uploadAvatarError instanceof Error ? uploadAvatarError.message : 'Не удалось обновить аватар'
        setError(
          message
        )
        window.alert(message)
      } finally {
        setIsUploadingAvatar(false)
      }
    }

    void uploadAvatar()
    event.target.value = ''
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user) {
      setError('Сначала войдите в аккаунт')
      return
    }

    const nextPassword = password.trim()
    if (nextPassword && nextPassword.length < 6) {
      setError('Пароль должен быть не короче 6 символов')
      return
    }

    setError('')
    setSuccess('')
    setIsSaving(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          name: name.trim(),
          city: city.trim(),
          avatar_url: avatarPreviewUrl || null,
        },
        ...(nextPassword ? { password: nextPassword } : {}),
      })

      if (updateError) {
        throw updateError
      }

      const { error: profileUpsertError } = await (supabase.from('profiles') as any).upsert({
        id: user.id,
        name: name.trim(),
        city: city.trim(),
        avatar_url: avatarPreviewUrl || null,
      })

      if (profileUpsertError) {
        throw profileUpsertError
      }

      setPassword('')
      setSuccess(nextPassword ? 'Данные и пароль сохранены' : 'Данные профиля сохранены')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось сохранить данные')
    } finally {
      setIsSaving(false)
    }
  }

  const handlePushSubscribe = async () => {
    setNotificationsError('')

    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        throw new Error('Ваш браузер не поддерживает push-уведомления')
      }

      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker не поддерживается в этом браузере')
      }

      if (isIOS && !isStandalone) {
        return
      }

      if (Notification.permission === 'denied') {
        setPermissionStatus('denied')
        return
      }

      const permission = await Notification.requestPermission()
      setPermissionStatus(permission)

      if (permission !== 'granted') {
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        setNotificationsError('Не настроен публичный ключ push-уведомлений')
        return
      }

      const reg = await navigator.serviceWorker.register('/sw.js')
      const existingSubscription = await reg.pushManager.getSubscription()
      const sub =
        existingSubscription ??
        (await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }))

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })

      if (!response.ok) {
        throw new Error('Не удалось сохранить push-подписку')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setNotificationsError(`Не удалось включить push-уведомления: ${message}`)
      window.alert(`Ошибка подписки: ${message}`)
    }
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
            <p className="text-sm text-slate-500">Управление профилем и безопасностью</p>
          </div>
        </header>

        <form
          onSubmit={handleSave}
          className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm"
        >
          <section className="px-5 py-5">
            <h2 className="text-base font-semibold text-slate-950">Аватар</h2>
            <p className="mt-1 text-sm text-slate-500">Фото загружается сразу после выбора файла</p>
            <div className="mt-4 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
                {hasAvatar ? (
                  <img src={avatarPreviewUrl} alt="Аватар" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-8 w-8" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-[#faf7f3] px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                disabled={isUploadingAvatar}
              >
                Выбрать фото
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </section>

          <div className="h-px w-full bg-slate-200/70" />

          <section className="px-5 py-5">
            <h2 className="text-base font-semibold text-slate-950">Личные данные</h2>
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
            <label htmlFor="city" className="mb-2 mt-4 block text-sm font-medium text-slate-600">
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
          </section>

          <div className="h-px w-full bg-slate-200/70" />

          <section className="px-5 py-5">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-slate-700" />
              <h2 className="text-base font-semibold text-slate-950">Уведомления</h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Выберите удобный канал, чтобы не пропустить новые сообщения от покупателей.
            </p>

            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-[#faf7f3] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Telegram</p>
                  <p className="text-xs text-slate-500">Мгновенные уведомления через бота</p>
                </div>
                {telegramChatId ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Подключено
                  </span>
                ) : (
                  <div className="flex flex-col items-center">
                    <Link
                      href={telegramBotLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-sky-500 px-3 text-xs font-semibold text-white transition hover:bg-sky-600"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Подключить Telegram
                    </Link>
                    <p className="mt-2 max-w-[220px] text-center text-xs text-slate-400">
                      Из-за ограничений провайдеров Telegram может работать нестабильно или требовать VPN.
                      Для максимальной надежности рекомендуем использовать браузерные Push-уведомления.
                    </p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-[#faf7f3] px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Push-уведомления</p>
                  <p className="text-xs text-slate-500">В браузере на этом устройстве</p>
                </div>
                {isIOS && !isStandalone ? (
                  <div className="mt-3 rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
                    🍎 На iPhone push-уведомления работают только как приложение. Откройте этот
                    сайт в стандартном браузере <span className="font-semibold">Safari</span>,
                    нажмите иконку «Поделиться» (квадрат со стрелочкой) и выберите «На экран
                    Домой». Затем откройте ProDance с рабочего стола!
                  </div>
                ) : permissionStatus === 'denied' ? (
                  <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800">
                    Уведомления заблокированы. Чтобы включить их, перейдите в настройки вашего
                    устройства/браузера, найдите этот сайт и разрешите отправку уведомлений.
                  </div>
                ) : permissionStatus === 'granted' ? (
                  <span className="mt-3 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Уведомления успешно включены
                  </span>
                ) : permissionStatus === 'default' || permissionStatus === 'unknown' ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void handlePushSubscribe()}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Включить Push-уведомления
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      Нажмите «Разрешить» во всплывающем окне браузера
                    </p>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                    Не удалось определить статус уведомлений на этом устройстве.
                  </div>
                )}
              </div>
            </div>

            {isLoadingNotifications ? (
              <p className="mt-3 text-xs text-slate-500">Загрузка статуса уведомлений...</p>
            ) : null}
            {notificationsError ? (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {notificationsError}
              </p>
            ) : null}
          </section>

          <div className="h-px w-full bg-slate-200/70" />

          <section className="px-5 py-5">
            <h2 className="text-base font-semibold text-slate-950">Пароль</h2>
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
          </section>

          <div className="h-px w-full bg-slate-200/70" />

          <section className="px-5 py-5">
            <button
              type="submit"
              disabled={isSaving || isUploadingAvatar}
              className="h-14 w-full rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-sm disabled:opacity-60"
            >
              {isSaving ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </section>
        </form>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => router.push('/profile')}
            className="h-12 w-full rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Вернуться в профиль
          </button>
        </div>

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
