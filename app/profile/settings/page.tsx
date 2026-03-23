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
  const [isDisconnectingTelegram, setIsDisconnectingTelegram] = useState(false)
  const [isPushSubscribed, setIsPushSubscribed] = useState(false)
  const [isUnsubscribingPush, setIsUnsubscribingPush] = useState(false)
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
          .select('telegram_chat_id, push_subscriptions')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (isActive) {
          setTelegramChatId(data?.telegram_chat_id ?? null)
          setIsPushSubscribed(Array.isArray(data?.push_subscriptions) && data.push_subscriptions.length > 0)
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
  const pushBlockedInstruction = (
    <details className="mt-2">
      <summary className="cursor-pointer mt-3 text-sm text-blue-500 hover:underline">
        Кнопка не работает? (Инструкция)
      </summary>
      <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-600 mt-2 flex flex-col gap-1">
        <p>
          Если вы ранее нажали «Не разрешить», браузер заблокировал эту кнопку. Чтобы включить
          уведомления вручную:
        </p>
        <p>1. Зайдите в Настройки вашего телефона.</p>
        <p>2. Найдите браузер (Safari/Chrome) или приложение ProDance.</p>
        <p>3. Перейдите в раздел «Уведомления» и разрешите их.</p>
        <p>4. Обновите эту страницу.</p>
      </div>
    </details>
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

      setIsPushSubscribed(true)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setNotificationsError(`Не удалось включить push-уведомления: ${message}`)
      window.alert(`Ошибка подписки: ${message}`)
    }
  }

  const handleTelegramDisconnect = async () => {
    if (!user || !telegramChatId) {
      return
    }

    setNotificationsError('')
    setIsDisconnectingTelegram(true)

    try {
      const { error: disconnectError } = await (supabase.from('profiles') as any)
        .update({
          telegram_chat_id: null,
          notification_setup_completed: false,
        })
        .eq('id', user.id)

      if (disconnectError) {
        throw disconnectError
      }

      setTelegramChatId(null)
    } catch (disconnectTelegramError) {
      const message =
        disconnectTelegramError instanceof Error
          ? disconnectTelegramError.message
          : 'Не удалось отключить Telegram'
      setNotificationsError(message)
    } finally {
      setIsDisconnectingTelegram(false)
    }
  }

  const handlePushUnsubscribe = async () => {
    if (!user) {
      return
    }

    setNotificationsError('')
    setIsUnsubscribingPush(true)

    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = await reg?.pushManager.getSubscription()

      if (sub) {
        await sub.unsubscribe()
      }

      const { error: updateError } = await (supabase.from('profiles') as any)
        .update({
          push_subscriptions: [],
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setIsPushSubscribed(false)
    } catch (unsubscribeError) {
      const message =
        unsubscribeError instanceof Error
          ? unsubscribeError.message
          : 'Не удалось отключить push-уведомления'
      setNotificationsError(message)
    } finally {
      setIsUnsubscribingPush(false)
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
              <div className="rounded-2xl border border-slate-200/80 bg-[#faf7f3] px-4 py-3">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Telegram</p>
                    <p className="text-xs text-slate-500">Мгновенные уведомления через бота</p>
                    {telegramChatId ? (
                      <span className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Подключено
                      </span>
                    ) : null}
                  </div>

                  {telegramChatId ? (
                    <button
                      type="button"
                      onClick={() => void handleTelegramDisconnect()}
                      disabled={isDisconnectingTelegram}
                      className="inline-flex h-9 w-fit items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isDisconnectingTelegram ? 'Отключение...' : 'Отключить'}
                    </button>
                  ) : (
                    <Link
                      href={telegramBotLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 w-fit items-center justify-center gap-1 rounded-full bg-sky-500 px-3 text-xs font-semibold text-white transition hover:bg-sky-600"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Подключить Telegram
                    </Link>
                  )}

                  <p className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg leading-tight">
                    ⚠️ Telegram в России может работать нестабильно (иногда требуется VPN). Если
                    уведомления не приходят, рекомендуем использовать Push.
                  </p>
                </div>
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
                ) : isPushSubscribed ? (
                  <div className="mt-3">
                    <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Уведомления успешно включены
                    </span>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => void handlePushUnsubscribe()}
                        disabled={isUnsubscribingPush}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUnsubscribingPush ? 'Отключение...' : 'Отключить'}
                      </button>
                    </div>
                    {pushBlockedInstruction}
                  </div>
                ) : permissionStatus === 'default' ||
                  permissionStatus === 'unknown' ||
                  permissionStatus === 'granted' ? (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => void handlePushSubscribe()}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Включить Push-уведомления
                    </button>
                    <p className="mt-2 text-xs text-slate-500">
                      {permissionStatus === 'granted'
                        ? 'Push-уведомления отключены. Нажмите, чтобы включить снова.'
                        : 'Нажмите «Разрешить» во всплывающем окне браузера'}
                    </p>
                    {pushBlockedInstruction}
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
