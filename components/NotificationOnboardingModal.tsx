'use client'

import { Bell, Send } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../app/components/AuthProvider'
import { supabase } from '../app/lib/supabase'

export function NotificationOnboardingModal() {
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const [isVisible, setIsVisible] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  const telegramBotLink = useMemo(() => {
    if (!user) {
      return 'https://t.me/ProDanceMarket_Bot'
    }

    return `https://t.me/ProDanceMarket_Bot?start=${user.id}`
  }, [user])

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

  const handlePushEnable = async () => {
    try {
      if ('Notification' in window) {
        await Notification.requestPermission()
      }
    } catch (permissionError) {
      console.error('Failed to request push notification permission', permissionError)
    } finally {
      await markSetupCompleted()
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

          <button
            type="button"
            onClick={() => void handlePushEnable()}
            disabled={isBusy}
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
          >
            Включить Push-уведомления
          </button>
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
