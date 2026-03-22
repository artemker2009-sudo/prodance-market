'use client'

import { Bell, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../app/components/AuthProvider'
import { supabase } from '../app/lib/supabase'

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

export function NotificationOnboardingModal() {
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const [isVisible, setIsVisible] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  const telegramBotLink = useMemo(() => {
    if (!user) {
      return 'tg://resolve?domain=prodance_market_bot'
    }

    return `tg://resolve?domain=prodance_market_bot&start=${user.id}`
  }, [user])

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
  }, [])

  useEffect(() => {
    let isActive = true

    const checkNotificationOnboarding = async () => {
      if (loading) {
        return
      }

      if (!user) {
        if (isActive) {
          setIsVisible(false)
          setIsChecking(false)
        }
        return
      }

      setIsChecking(true)

      try {
        const { data, error } = await (supabase.from('profiles') as any)
          .select('notification_setup_completed')
          .eq('id', user.id)
          .maybeSingle()

        if (error) {
          throw error
        }

        if (!isActive) {
          return
        }

        setIsVisible(data?.notification_setup_completed === false)
      } catch (checkError) {
        if (isActive) {
          console.error('Failed to check notification onboarding status', checkError)
          setIsVisible(false)
        }
      } finally {
        if (isActive) {
          setIsChecking(false)
        }
      }
    }

    void checkNotificationOnboarding()

    return () => {
      isActive = false
    }
  }, [loading, user])

  const markSetupCompleted = async () => {
    if (!user) {
      return
    }

    setIsBusy(true)

    try {
      const { error } = await (supabase.from('profiles') as any)
        .update({ notification_setup_completed: true })
        .eq('id', user.id)

      if (error) {
        throw error
      }
    } catch (updateError) {
      console.error('Failed to update notification_setup_completed', updateError)
    } finally {
      setIsBusy(false)
      setIsVisible(false)
    }
  }

  const handleTelegramConnect = () => {
    window.open(telegramBotLink, '_blank', 'noopener,noreferrer')
    void markSetupCompleted()
  }

  const handlePushSubscribe = async () => {
    if (isIOS && !isStandalone) {
      return
    }

    try {
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidPublicKey) {
        console.error('Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
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
        throw new Error(`Push subscribe failed with status ${response.status}`)
      }

      await markSetupCompleted()
    } catch (permissionError) {
      console.error('Failed to request push notification permission', permissionError)
    }
  }

  const handleSetupLater = () => {
    void markSetupCompleted()
  }

  if (loading || isChecking || !isVisible || !user) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-900">
          <Bell className="h-7 w-7" />
        </div>

        <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-950">
          Не пропустите покупателей!
        </h2>
        <p className="mt-3 text-center text-sm text-slate-600">
          Включите уведомления, чтобы мгновенно узнавать о новых сообщениях и не потерять сделку.
          Выберите удобный способ:
        </p>

        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={handleTelegramConnect}
            disabled={isBusy}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 px-4 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Подключить Telegram
          </button>
          <p className="mt-2 text-center text-xs text-slate-400">
            Из-за ограничений провайдеров Telegram может работать нестабильно или требовать VPN.
            Для максимальной надежности рекомендуем использовать браузерные Push-уведомления.
          </p>

          {isIOS && !isStandalone ? (
            <div className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">
              🍎 На iPhone push-уведомления работают только как приложение. Откройте этот сайт в
              стандартном браузере <span className="font-semibold">Safari</span>, нажмите иконку
              «Поделиться» (квадрат со стрелочкой) и выберите «На экран Домой». Затем откройте
              ProDance с рабочего стола!
            </div>
          ) : (
            <div>
              <button
                type="button"
                onClick={() => void handlePushSubscribe()}
                disabled={isBusy}
                className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                Включить Push-уведомления
              </button>
              <p className="mt-2 text-center text-xs text-slate-500">
                Нажмите «Разрешить» во всплывающем окне браузера
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSetupLater}
          disabled={isBusy}
          className="mt-4 w-full text-sm font-medium text-slate-500 transition hover:text-slate-700 disabled:opacity-60"
        >
          Настроить позже
        </button>
      </div>
    </div>
  )
}
