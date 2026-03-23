'use client'

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2, MessageCircle, Phone, Share2 } from 'lucide-react'

import { useAuth } from '../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../lib/auth-routing'
import { supabase } from '../../lib/supabase'

type FavoriteToggleProps = {
  itemId: string
  initialIsFavorite?: boolean
  className?: string
  iconClassName?: string
}

type ShareItemButtonProps = {
  itemUrl: string
}

type OwnerListingActionsProps = {
  itemId: string
  sellerId: string | null
  initialIsActive: boolean
}

const archiveReasonOptions = [
  {
    value: 'Продал(а) на ProDance',
    label: 'Продал(а) на ProDance',
    accent: true,
  },
  {
    value: 'Продал(а) на другой площадке',
    label: 'Продал(а) на другой площадке',
    accent: false,
  },
  {
    value: 'Передумал(а) продавать / Другая причина',
    label: 'Передумал(а) продавать / Другая причина',
    accent: false,
  },
] as const

export function FavoriteToggle({
  itemId,
  initialIsFavorite = false,
  className,
  iconClassName,
}: FavoriteToggleProps) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [isFavorite, setIsFavorite] = useState(initialIsFavorite)
  const [isLoading, setIsLoading] = useState(false)

  const handleToggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`))
      return
    }

    setIsLoading(true)

    if (isFavorite) {
      const { error } = await (supabase.from('favorites') as any)
        .delete()
        .eq('user_id', userId)
        .eq('item_id', itemId)

      if (!error) {
        setIsFavorite(false)
      }
      setIsLoading(false)
      return
    }

    const { error } = await (supabase.from('favorites') as any).insert({
      user_id: userId,
      item_id: itemId,
    })

    if (!error) {
      setIsFavorite(true)
    }
    setIsLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-500 disabled:opacity-60 ${className ?? ''}`}
      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
    >
      <Heart
        className={`h-5 w-5 ${iconClassName ?? ''} ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`}
      />
    </button>
  )
}

export function ShareItemButton({ itemUrl }: ShareItemButtonProps) {
  const [toastMessage, setToastMessage] = useState('')

  const toast = useMemo(
    () => ({
      success: (message: string) => setToastMessage(message),
    }),
    []
  )

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleShareClick = async () => {
    const rawUrl = itemUrl || window.location.href
    const shareUrl = rawUrl.startsWith('http')
      ? rawUrl
      : new URL(rawUrl, window.location.origin).toString()

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({
          text: 'Выложено на ProDance',
          url: shareUrl,
        })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
      }
      toast.success('Ссылка скопирована')
    } catch {
      // Игнорируем отмену нативного share и ошибки буфера.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleShareClick()}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur transition hover:bg-white"
        aria-label="Поделиться объявлением"
      >
        <Share2 className="h-[18px] w-[18px]" />
      </button>
      {toastMessage ? (
        <div className="fixed bottom-24 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </>
  )
}

export function OwnerListingActions({
  itemId,
  sellerId,
  initialIsActive,
}: OwnerListingActionsProps) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null

  const [isActive, setIsActive] = useState(initialIsActive)
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<string>(archiveReasonOptions[0].value)
  const [isArchiving, setIsArchiving] = useState(false)
  const [isRepublishing, setIsRepublishing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const toast = useMemo(
    () => ({
      success: (message: string) => setToastMessage(message),
      error: (message: string) => setErrorMessage(message),
    }),
    []
  )

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  if (!sellerId || sellerId !== userId) {
    return null
  }

  const handleArchiveItem = async (reason: string) => {
    if (!reason) {
      return
    }

    setIsArchiving(true)
    setErrorMessage('')

    const { error } = await (supabase.from('items') as any)
      .update({ is_active: false, archive_reason: reason })
      .eq('id', itemId)

    setIsArchiving(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setIsActive(false)
    setIsArchiveModalOpen(false)
    toast.success('Объявление снято с публикации')
    router.refresh()
  }

  const handleRepublish = async () => {
    setIsRepublishing(true)
    setErrorMessage('')

    const { error } = await (supabase.from('items') as any)
      .update({ is_active: true, archive_reason: null })
      .eq('id', itemId)

    setIsRepublishing(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setIsActive(true)
    toast.success('Объявление снова опубликовано')
    router.refresh()
  }

  return (
    <>
      <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Управление объявлением</h2>
        {isActive ? (
          <button
            type="button"
            onClick={() => setIsArchiveModalOpen(true)}
            className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-xl border border-rose-300 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            Снять с публикации
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              Объявление снято с публикации
            </p>
            <button
              type="button"
              onClick={() => void handleRepublish()}
              disabled={isRepublishing}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {isRepublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Опубликовать заново</span>
            </button>
          </div>
        )}

        {errorMessage ? (
          <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">
            {errorMessage}
          </p>
        ) : null}
      </section>

      {isArchiveModalOpen ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/45 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Почему вы снимаете объявление?</h3>
            <div className="mt-4 space-y-2">
              {archiveReasonOptions.map((option) => {
                const isSelected = selectedReason === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedReason(option.value)}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : option.accent
                          ? 'border-fuchsia-200 bg-fuchsia-50 text-slate-800 hover:border-fuchsia-300'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIsArchiveModalOpen(false)}
                disabled={isArchiving}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleArchiveItem(selectedReason)}
                disabled={isArchiving}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                {isArchiving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Снять объявление</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-8 left-1/2 z-[140] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </>
  )
}

export function StartConversationButton({
  itemId,
  sellerId,
}: {
  itemId: string
  sellerId: string | null
}) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [isLoading, setIsLoading] = useState(false)

  const handleStartConversation = async () => {
    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`, { reason: 'message' }))
      return
    }

    if (!sellerId || sellerId === userId) {
      return
    }

    setIsLoading(true)

    const { data: existing } = await (supabase.from('conversations') as any)
      .select('id')
      .eq('item_id', itemId)
      .eq('buyer_id', userId)
      .eq('seller_id', sellerId)
      .maybeSingle()

    if (existing?.id) {
      setIsLoading(false)
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data: created, error } = await (supabase.from('conversations') as any)
      .insert({
        item_id: itemId,
        buyer_id: userId,
        seller_id: sellerId,
      })
      .select('id')
      .single()

    setIsLoading(false)

    if (!error && created?.id) {
      router.push(`/messages/${created.id}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleStartConversation}
      disabled={isLoading || !sellerId || sellerId === userId}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-base font-semibold text-white disabled:opacity-60"
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      <span>
        {sellerId === userId ? 'Это ваше объявление' : 'Написать продавцу'}
      </span>
    </button>
  )
}

export function SellerContactButtons({
  itemId,
  sellerId,
}: {
  itemId: string
  sellerId: string | null
}) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [isLoading, setIsLoading] = useState(false)
  const [isPhoneVisible, setIsPhoneVisible] = useState(false)

  const handleMessageClick = async () => {
    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`, { reason: 'message' }))
      return
    }

    if (!sellerId || sellerId === userId) {
      return
    }

    setIsLoading(true)

    const { data: existing } = await (supabase.from('conversations') as any)
      .select('id')
      .eq('item_id', itemId)
      .eq('buyer_id', userId)
      .eq('seller_id', sellerId)
      .maybeSingle()

    if (existing?.id) {
      setIsLoading(false)
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data: created, error } = await (supabase.from('conversations') as any)
      .insert({
        item_id: itemId,
        buyer_id: userId,
        seller_id: sellerId,
      })
      .select('id')
      .single()

    setIsLoading(false)

    if (!error && created?.id) {
      router.push(`/messages/${created.id}`)
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <button
        type="button"
        onClick={() => setIsPhoneVisible((previous) => !previous)}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
      >
        <Phone className="h-4 w-4" />
        <span>{isPhoneVisible ? '+7 (999) 000-00-00' : 'Показать телефон'}</span>
      </button>
      <button
        type="button"
        onClick={() => void handleMessageClick()}
        disabled={isLoading || !sellerId || sellerId === userId}
        className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
        <span>Написать</span>
      </button>
    </div>
  )
}

const quickQuestionOptions = [
  'Ещё продаёте?',
  'Торг уместен?',
  'На какой рост подойдёт?',
  'Можно примерить?',
  'Какой точный размер (ОГ, ОТ, ОБ)?',
  'Отправите СДЭК/Почтой?',
] as const

export function QuickQuestionsSection({
  itemId,
  sellerId,
}: {
  itemId: string
  sellerId: string | null
}) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [isSending, setIsSending] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const toast = useMemo(
    () => ({
      error: (message: string) => {
        setToastMessage(message)
      },
    }),
    []
  )

  const loading = useMemo(
    () => ({
      show: () => setIsSending(true),
      hide: () => setIsSending(false),
    }),
    []
  )

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

  const handleQuickMessageClick = async (messageText: string) => {
    const trimmedMessage = messageText.trim()
    if (!trimmedMessage) {
      return
    }

    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`, { reason: 'message' }))
      return
    }

    if (!sellerId) {
      toast.error('Не удалось определить продавца')
      return
    }

    if (sellerId === userId) {
      toast.error('Это ваше объявление')
      return
    }

    try {
      loading.show()

      const { data: existingConversation, error: existingConversationError } = await (
        supabase.from('conversations') as any
      )
        .select('id')
        .eq('item_id', itemId)
        .eq('buyer_id', userId)
        .eq('seller_id', sellerId)
        .maybeSingle()

      if (existingConversationError) {
        throw existingConversationError
      }

      let conversationId: string | null = existingConversation?.id ?? null

      if (!conversationId) {
        const { data: createdConversation, error: createConversationError } = await (
          supabase.from('conversations') as any
        )
          .insert({
            item_id: itemId,
            buyer_id: userId,
            seller_id: sellerId,
          })
          .select('id')
          .single()

        if (createConversationError || !createdConversation?.id) {
          throw createConversationError ?? new Error('Не удалось создать диалог')
        }

        conversationId = createdConversation.id
      }

      const { error: sendMessageError } = await (supabase.from('messages') as any).insert({
        conversation_id: conversationId,
        sender_id: userId,
        text: trimmedMessage,
        is_read: false,
      })

      if (sendMessageError) {
        throw sendMessageError
      }

      router.push(`/messages/${conversationId}`)
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Не удалось отправить сообщение')
    } finally {
      loading.hide()
    }
  }

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Спросите у продавца</h2>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {quickQuestionOptions.map((questionText) => (
          <button
            key={questionText}
            type="button"
            onClick={() => void handleQuickMessageClick(questionText)}
            disabled={isSending}
            className="whitespace-nowrap rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            {questionText}
          </button>
        ))}
      </div>
      {toastMessage ? (
        <div className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {toastMessage}
        </div>
      ) : null}
    </section>
  )
}
