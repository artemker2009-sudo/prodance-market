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

  useEffect(() => {
    setIsFavorite(initialIsFavorite)
  }, [initialIsFavorite])

  const handleToggle = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()

    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`))
      return
    }

    const nextFavoriteState = !isFavorite
    setIsFavorite(nextFavoriteState)
    setIsLoading(true)

    if (!nextFavoriteState) {
      const { error } = await (supabase.from('favorites') as any)
        .delete()
        .eq('user_id', userId)
        .eq('item_id', itemId)

      if (error) {
        setIsFavorite(true)
      }
      setIsLoading(false)
      return
    }

    const { error } = await (supabase.from('favorites') as any).insert({
      user_id: userId,
      item_id: itemId,
    })

    if (error) {
      setIsFavorite(false)
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
