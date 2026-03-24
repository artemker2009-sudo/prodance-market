'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { LifeBuoy, Mailbox, MoreVertical, Package } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../components/AuthProvider'
import { buildLoginRedirectHref } from '../lib/auth-routing'
import { supabase } from '../lib/supabase'

type Chat = {
  id: string
  buyerId: string
  itemTitle: string
  itemImageUrl: string | null
  interlocutorName: string
  preview: string
  time: string
}

type Item = {
  id: string
  title: string | null
  image_urls: string[] | null
}

type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
}

type ConversationRow = {
  id: string
  buyer_id: string
  seller_id: string
  created_at: string | null
  deleted_for_buyer?: boolean | null
  deleted_for_seller?: boolean | null
  item: Item | null
  buyer: Profile | null
  seller: Profile | null
}

type SupportTicket = {
  id: string
  topic: string | null
  status: string | null
  created_at: string | null
}

function hasConversationItem(item: ConversationRow['item']): item is Item {
  return Boolean(item && typeof item.id === 'string')
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function MessagesPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const currentUser = user
  const [chats, setChats] = useState<Chat[]>([])
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [openMenuConversationId, setOpenMenuConversationId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success')
  const toast = useMemo(
    () => ({
      success: (message: string) => {
        setToastTone('success')
        setToastMessage(message)
      },
      error: (message: string) => {
        setToastTone('error')
        setToastMessage(message)
      },
    }),
    []
  )
  const hasConversationsOrTickets = chats.length > 0 || supportTickets.length > 0

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

  useEffect(() => {
    if (!openMenuConversationId) {
      return
    }

    const handleOutsideClick = (event: globalThis.MouseEvent) => {
      const target = event.target as HTMLElement | null
      const menuRoot = target?.closest('[data-chat-actions]')
      if (!menuRoot) {
        setOpenMenuConversationId(null)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuConversationId(null)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [openMenuConversationId])

  const handleSoftDeleteConversation = async (conversationId: string) => {
    if (!currentUser?.id) {
      toast.error('Не удалось определить пользователя')
      return
    }

    const targetConversation = chats.find((chat) => chat.id === conversationId)
    if (!targetConversation) {
      toast.error('Диалог не найден')
      return
    }

    const previousChats = chats
    const isBuyer = currentUser.id === targetConversation.buyerId

    setChats((prevChats) => prevChats.filter((chat) => chat.id !== conversationId))
    setOpenMenuConversationId(null)

    try {
      const { error } = await (supabase.from('conversations') as any)
        .update({
          [isBuyer ? 'deleted_for_buyer' : 'deleted_for_seller']: true,
        })
        .eq('id', conversationId)

      if (error) {
        throw error
      }

      toast.success('Переписка скрыта только у вас')
    } catch (error) {
      setChats(previousChats)
      toast.error(error instanceof Error ? error.message : 'Не удалось скрыть переписку')
    }
  }

  const handleHardDeleteConversation = async (conversationId: string) => {
    const previousChats = chats
    setChats((prevChats) => prevChats.filter((chat) => chat.id !== conversationId))
    setOpenMenuConversationId(null)

    try {
      const { error } = await (supabase.from('conversations') as any)
        .delete()
        .eq('id', conversationId)

      if (error) {
        throw error
      }

      toast.success('Переписка удалена у всех участников')
    } catch (error) {
      setChats(previousChats)
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить переписку')
    }
  }

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace(buildLoginRedirectHref('/messages'))
  }, [loading, router, user])

  useEffect(() => {
    if (!currentUser?.id) {
      return
    }

    let active = true
    const load = async () => {
      setIsLoading(true)
      setFetchError(null)
      try {
        const conversationsTable = supabase.from('conversations') as any
        const { data: conversations, error: convError } = await conversationsTable
          .select('*, item:items(*)')
          .or(`buyer_id.eq.${currentUser.id},seller_id.eq.${currentUser.id}`)
          .order('created_at', { ascending: false })
        const { data: tickets } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })

        if (convError) {
          console.error('Ошибка загрузки чатов:', convError)
          if (active) {
            setFetchError(convError.message)
            setChats([])
            setSupportTickets([])
            setIsLoading(false)
          }
          return
        }

        const mappedTickets = ((tickets ?? []) as SupportTicket[]).map((ticket) => ({
          id: ticket.id,
          topic: ticket.topic,
          status: ticket.status ?? 'open',
          created_at: ticket.created_at,
        }))

        const rows = (conversations ?? []) as ConversationRow[]
        let mapped: Chat[] = []

        if (rows.length) {
          const userIds = [
            ...new Set(rows.flatMap((conversation) => [conversation.buyer_id, conversation.seller_id])),
          ]
          const { data: profiles, error: profilesError } = userIds.length
            ? await (supabase.from('profiles') as any).select('id, name, avatar_url').in('id', userIds)
            : { data: [], error: null }

          if (profilesError) {
            // Не блокируем список диалогов, если профили временно недоступны.
            console.warn('Ошибка загрузки профилей для диалогов:', profilesError)
          }

          const profilesById = new Map<string, Profile>()
          for (const profile of (profiles ?? []) as Profile[]) {
            profilesById.set(profile.id, profile)
          }

          const enrichedRows: ConversationRow[] = rows.map((conversation) => ({
            ...conversation,
            buyer: profilesById.get(conversation.buyer_id) ?? null,
            seller: profilesById.get(conversation.seller_id) ?? null,
          }))

          const visibleRows = enrichedRows.filter((conversation) => {
            const isBuyer = currentUser.id === conversation.buyer_id
            return isBuyer ? !conversation.deleted_for_buyer : !conversation.deleted_for_seller
          })
          const conversationIds = visibleRows.map((row) => row.id)

          const { data: recentMessages } = conversationIds.length
            ? await (supabase.from('messages') as any)
                .select('conversation_id, text, created_at')
                .in('conversation_id', conversationIds)
                .order('created_at', { ascending: false })
            : { data: [] }

          const lastMessageByConversation = new Map<
            string,
            { text: string | null; created_at: string | null }
          >()
          for (const message of (recentMessages ?? []) as Array<{
            conversation_id: string
            text: string | null
            created_at: string | null
          }>) {
            if (!lastMessageByConversation.has(message.conversation_id)) {
              lastMessageByConversation.set(message.conversation_id, {
                text: message.text,
                created_at: message.created_at,
              })
            }
          }

          mapped = visibleRows.map((conversation) => {
            const isBuyer = currentUser.id === conversation.buyer_id
            const interlocutor = isBuyer ? conversation.seller : conversation.buyer
            const item = conversation.item
            const isItemAvailable = hasConversationItem(item)
            const lastMessage = lastMessageByConversation.get(conversation.id)
            const itemImageUrl = isItemAvailable ? item.image_urls?.[0] ?? null : null

            return {
              id: conversation.id,
              buyerId: conversation.buyer_id,
              itemTitle: isItemAvailable ? item.title?.trim() || 'Без названия' : 'Без названия',
              itemImageUrl,
              interlocutorName: interlocutor?.name?.trim() || 'Пользователь ProDance',
              preview: lastMessage?.text?.trim() || 'Новый диалог',
              time: lastMessage?.created_at ? formatTime(lastMessage.created_at) : '',
            }
          })
        }

        if (active) {
          setChats(mapped)
          setSupportTickets(mappedTickets)
          setFetchError(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Ошибка загрузки диалогов:', error)
        if (active) {
          setFetchError(error instanceof Error ? error.message : 'Неизвестная ошибка')
          setChats([])
          setSupportTickets([])
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [currentUser?.id])

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 py-6 pb-28 md:pb-10">
        <p className="text-sm text-slate-500">Загрузка сообщений...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-6 pb-28 md:pb-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
            Inbox
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Сообщения</h1>
        </header>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white shadow-sm">
          {isLoading ? (
            <div className="px-6 py-12 text-center text-sm text-slate-500">Загружаем диалоги...</div>
          ) : fetchError ? (
            <div className="text-red-500 p-4">Ошибка: {fetchError}</div>
          ) : hasConversationsOrTickets ? (
            <div className="space-y-5 p-4">
              {supportTickets.length ? (
                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-blue-700 uppercase">
                    Служба поддержки
                  </p>
                  <ul className="space-y-3">
                    {supportTickets.map((ticket) => {
                      const isClosed = ticket.status === 'closed'
                      const statusLabel = isClosed ? 'Закрыт' : 'Открыт'
                      return (
                        <li key={ticket.id}>
                          <Link
                            href={`/messages/support/${ticket.id}`}
                            className="flex items-center gap-3 rounded-2xl border border-blue-200/70 bg-blue-50/50 p-4 shadow-sm transition-colors hover:bg-blue-100/60"
                          >
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                              <LifeBuoy className="h-6 w-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-semibold text-slate-900">Поддержка ProDance</p>
                              <p className="truncate text-sm text-slate-700">
                                {(ticket.topic ?? 'Без темы').trim()}
                              </p>
                              <div className="mt-1 flex items-center gap-2">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${
                                    isClosed ? 'bg-slate-400' : 'bg-emerald-500'
                                  }`}
                                  aria-hidden="true"
                                />
                                <span className="text-xs font-medium text-slate-600">{statusLabel}</span>
                              </div>
                            </div>
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ) : null}
              {chats.length ? (
                <section className="space-y-3">
                  <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Диалоги</p>
                  <ul className="space-y-3">
                    {chats.map((chat) => (
                      <li key={chat.id}>
                        <div className="relative flex w-full items-stretch gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-colors hover:bg-slate-50/70">
                    <Link href={`/messages/${chat.id}`} className="flex min-w-0 flex-1 items-stretch gap-3">
                      <div className="relative h-14 w-14 shrink-0 self-center overflow-hidden rounded-full bg-slate-100">
                        {chat.itemImageUrl ? (
                          <Image
                            src={chat.itemImageUrl}
                            alt={chat.itemTitle}
                            fill
                            sizes="56px"
                            className="h-14 w-14 rounded-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-slate-400">
                            <Package className="h-6 w-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
                        <p className="text-base font-semibold text-slate-900 truncate">
                          {chat.interlocutorName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{chat.itemTitle}</p>
                        <p className="text-sm text-slate-700 truncate">{chat.preview}</p>
                      </div>
                    </Link>

                    <div
                      className="relative z-20 ml-2 flex min-w-[50px] flex-col items-end justify-between py-0.5"
                      data-chat-actions
                    >
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          setOpenMenuConversationId((currentId) =>
                            currentId === chat.id ? null : chat.id
                          )
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:bg-slate-50"
                        aria-label="Открыть меню действий с перепиской"
                        aria-expanded={openMenuConversationId === chat.id}
                      >
                        <MoreVertical className="h-5 w-5 text-slate-500" />
                      </button>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{chat.time}</span>

                      {openMenuConversationId === chat.id ? (
                        <div className="absolute right-0 top-9 z-50 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleSoftDeleteConversation(chat.id)
                            }}
                            className="block w-full px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                          >
                            Удалить переписку только у меня
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              void handleHardDeleteConversation(chat.id)
                            }}
                            className="block w-full px-4 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                          >
                            Удалить у всех переписку
                          </button>
                        </div>
                      ) : null}
                    </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
            </div>
          ) : (
            <div className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200/70 bg-[#faf7f3] text-slate-400">
                <Mailbox className="h-9 w-9 stroke-[1.75]" />
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
                У вас пока нет активных диалогов.
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                Когда начнете обсуждать покупку или продажу, все диалоги аккуратно
                соберутся в этом разделе.
              </p>
            </div>
          )}
        </section>
      </div>
      {toastMessage ? (
        <div className="pointer-events-none fixed right-4 bottom-24 z-50 md:bottom-6">
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toastTone === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      ) : null}
    </main>
  )
}
