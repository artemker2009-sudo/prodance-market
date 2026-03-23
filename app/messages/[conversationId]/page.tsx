'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronRight, Send } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../lib/auth-routing'
import { supabase } from '../../lib/supabase'

type Message = {
  id: string
  sender_id: string
  text: string
  is_read: boolean
  created_at: string
}

type Item = {
  id: string
  title: string | null
  price: number | null
  image_urls: string[] | null
}

type Profile = {
  id: string
  name: string | null
}

type Conversation = {
  id: string
  item_id: string
  buyer_id: string
  seller_id: string
  item: Item | null
  buyer: Profile | null
  seller: Profile | null
}

function hasConversationItem(item: Conversation['item']): item is Item {
  return Boolean(item && typeof item.id === 'string')
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

export default function ConversationPage() {
  const router = useRouter()
  const routeParams = useParams<{ conversationId: string }>()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const conversationId = routeParams?.conversationId ?? ''
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [partnerName, setPartnerName] = useState('Собеседник')
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [isConversationLoaded, setIsConversationLoaded] = useState(false)

  useEffect(() => {
    if (loading || user) {
      return
    }

    if (conversationId) {
      router.replace(buildLoginRedirectHref(`/messages/${conversationId}`))
    }
  }, [conversationId, loading, router, user])

  useEffect(() => {
    if (!conversationId || !user?.id) {
      return
    }

    let active = true

    const loadChat = async () => {
      setError('')
      setIsConversationLoaded(false)
      try {
        const conversationsTable = supabase.from('conversations') as any
        let { data: conversationData, error: conversationError } = await conversationsTable
          .select(
            '*, item:items(*), buyer:profiles!conversations_buyer_id_fkey(*), seller:profiles!conversations_seller_id_fkey(*)'
          )
          .eq('id', conversationId)
          .maybeSingle()

        if (conversationError) {
          const fallbackResult = await conversationsTable
            .select('*, items(*)')
            .eq('id', conversationId)
            .maybeSingle()

          conversationData = fallbackResult.data
          conversationError = fallbackResult.error

          if (!conversationError && conversationData) {
            const rawConversation = conversationData as {
              items?: Item | Item[] | null
            } & Conversation

            const resolvedItem = Array.isArray(rawConversation.items)
              ? rawConversation.items[0] ?? null
              : rawConversation.items ?? null

            conversationData = {
              ...rawConversation,
              item: resolvedItem,
              buyer: null,
              seller: null,
            }
          }
        }

        if (!active) {
          return
        }

        if (conversationError) {
          console.error('Ошибка загрузки чата:', conversationError)
          setError(conversationError?.message || 'Диалог не найден')
          setConversation(null)
          setMessages([])
          return
        }

        if (
          !conversationData ||
          (conversationData.buyer_id !== user.id && conversationData.seller_id !== user.id)
        ) {
          setError('Диалог не найден')
          setConversation(null)
          setMessages([])
          return
        }

        setConversation(conversationData as Conversation)
        const isBuyer = conversationData.buyer_id === user.id
        const partner = isBuyer ? conversationData.seller : conversationData.buyer

        const { data: messageRows } = await (supabase.from('messages') as any)
          .select('id, sender_id, text, is_read, created_at')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true })

        if (!active) {
          return
        }

        const resolvedName = (partner as { name?: string } | null)?.name
        if (resolvedName) {
          setPartnerName(resolvedName)
        }

        setMessages((messageRows ?? []) as Message[])

        await (supabase.from('messages') as any)
          .update({ is_read: true })
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .eq('is_read', false)
      } catch (loadError) {
        if (!active) {
          return
        }

        setConversation(null)
        setMessages([])
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить диалог')
      } finally {
        if (active) {
          setIsConversationLoaded(true)
        }
      }
    }

    void loadChat()

    const channel = supabase
      .channel(`chat_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const inserted = payload.new as Message
          setMessages((prev) => {
            if (prev.some((message) => message.id === inserted.id)) {
              return prev
            }

            return [...prev, inserted]
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(channel)
    }
  }, [conversationId, user?.id])

  const canSend = useMemo(
    () => Boolean(text.trim()) && Boolean(conversation?.id) && !sending,
    [conversation?.id, sending, text]
  )
  const item = conversation?.item
  const hasItem = hasConversationItem(item)
  const itemImageUrl = hasItem && Array.isArray(item.image_urls) ? item.image_urls[0] ?? null : null
  const itemTitle = hasItem ? item.title?.trim() || 'Без названия' : 'Объявление недоступно'
  const itemPrice =
    hasItem && typeof item.price === 'number' ? `${formatPrice(item.price)} ₽` : 'Цена не указана'
  const currentUserName =
    (conversation?.buyer_id === user?.id ? conversation?.buyer?.name : conversation?.seller?.name)?.trim() ||
    'Пользователь'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user?.id || !conversation?.id || !text.trim()) {
      return
    }

    setSending(true)
    setError('')
    const trimmedText = text.trim()

    try {
      const payload = {
        conversation_id: conversation.id,
        sender_id: user.id,
        text: trimmedText,
        is_read: false,
      }

      const { error: insertError } = await (supabase.from('messages') as any).insert(payload)

      if (insertError) {
        setError(insertError.message)
        return
      }

      setText('')

      const receiverId = conversation.buyer_id === user.id ? conversation.seller_id : conversation.buyer_id

      await Promise.all([
        (async () => {
          try {
            await fetch('/api/telegram/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiver_id: receiverId,
                sender_name: currentUserName,
                item_title: itemTitle,
                message_text: trimmedText,
              }),
            })
          } catch (notifyError) {
            console.error('Failed to send Telegram notification', notifyError)
          }
        })(),
        (async () => {
          try {
            await fetch('/api/push/notify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                receiver_id: receiverId,
                title: `Новое сообщение от ${currentUserName}`,
                body: trimmedText,
                url: `/messages/${conversationId}`,
              }),
            })
          } catch (pushNotifyError) {
            console.error('Failed to send push notification', pushNotifyError)
          }
        })(),
      ])
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  if (loading || !user || !conversationId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-10">
        <p className="text-sm text-slate-500">Загрузка чата...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#faf7f3] pb-28 text-slate-950 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#faf7f3]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md flex-col px-4 py-3">
          <div className="flex items-center gap-3 pb-3">
            <Link
              href="/messages"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <p className="text-xs tracking-[0.12em] text-slate-500 uppercase">Диалог</p>
              <h1 className="text-base font-semibold text-slate-950">{partnerName}</h1>
            </div>
          </div>

          {conversation?.item && hasItem ? (
            <Link
              href={`/items/${item.id}`}
              className="z-30 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-200">
                {itemImageUrl ? (
                  <Image
                    src={itemImageUrl}
                    alt={itemTitle}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {itemTitle}
                </p>
                <p className="text-sm font-semibold text-slate-950">{itemPrice}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          ) : isConversationLoaded ? (
            <div className="z-30 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-500">
                  Объявление недоступно или удалено
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4">
        {error ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm">
          {messages.length ? (
            messages.map((message) => {
              const isMine = message.sender_id === user.id

              return (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isMine
                      ? 'ml-auto bg-blue-600 text-white'
                      : 'mr-auto bg-slate-100 text-slate-700'
                  }`}
                >
                  {message.text}
                </div>
              )
            })
          ) : (
            <p className="my-auto text-center text-sm text-slate-500">
              Напишите первое сообщение продавцу
            </p>
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-[1.5rem] bg-white p-2 shadow-sm"
        >
          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Введите сообщение..."
            className="h-11 w-full rounded-xl bg-[#faf7f3] px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={!canSend}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white disabled:opacity-50"
            aria-label="Отправить"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </section>
    </main>
  )
}
