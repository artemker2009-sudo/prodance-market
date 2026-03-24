'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { MoreVertical, Package } from 'lucide-react'
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
  user_id: string
  topic: string | null
  status: 'open' | 'closed' | null
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
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([])
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

        if (convError) {
          console.error('Ошибка загрузки чатов:', convError)
          if (active) {
            setFetchError(convError.message)
            setChats([])
            setIsLoading(false)
          }
          return
        }

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
          setFetchError(null)
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Ошибка загрузки диалогов:', error)
        if (active) {
          setFetchError(error instanceof Error ? error.message : 'Неизвестная ошибка')
          setChats([])
          setIsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser?.id) {
      setSupportTickets([])
      return
    }

    let active = true

    const loadSupportTickets = async () => {
      const { data, error } = await (supabase.from('support_tickets') as any)
        .select('id, user_id, topic, status')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (error) {
        setSupportTickets([])
        return
      }

      setSupportTickets((data ?? []) as SupportTicket[])
    }

    void loadSupportTickets()

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
    <main className="min-h-screen bg-[#faf7f3] pb-28 md:pb-10">
      <div className="flex w-full flex-col gap-6 py-6">
        <header className="space-y-2 px-4">
          <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
            Inbox
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Сообщения</h1>
        </header>

        <section className="w-full">
          {isLoading ? (
            <div className="bg-white px-4 py-12 text-center text-sm text-slate-500">
              Загружаем диалоги...
            </div>
          ) : fetchError ? (
            <div className="bg-white p-4 text-red-500">Ошибка: {fetchError}</div>
          ) : (
            <div className="w-full bg-white">
              <Link
                href="/messages/support"
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-blue-50/30 hover:bg-blue-50/60 transition-colors"
              >
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white shrink-0">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">Служба поддержки</h3>
                  <p className="text-sm text-gray-500 truncate">
                    {supportTickets && supportTickets.length > 0 
                      ? (supportTickets[0].status === 'open' 
                          ? `Открыто: ${supportTickets[0].topic}` 
                          : `Закрыто: ${supportTickets[0].topic}`)
                      : "Здравствуйте! Чем мы можем вам помочь?"}
                  </p>
                </div>
              </Link>
              {chats.length ? (
                <ul className="w-full">
                  {chats.map((chat) => (
                    <li key={chat.id}>
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-white cursor-pointer hover:bg-gray-50">
                        <Link href={`/messages/${chat.id}`} className="flex min-w-0 flex-1 items-center gap-3">
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

                        <div className="relative z-20 ml-2 flex min-w-[50px] flex-col items-end justify-between py-0.5" data-chat-actions>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              setOpenMenuConversationId((currentId) =>
                                currentId === chat.id ? null : chat.id
                              )
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white transition hover:bg-slate-50"
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
              ) : null}
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
