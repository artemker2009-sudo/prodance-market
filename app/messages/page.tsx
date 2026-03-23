'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Mailbox } from 'lucide-react'
import { useEffect, useState } from 'react'

import { useAuth } from '../components/AuthProvider'
import { buildLoginRedirectHref } from '../lib/auth-routing'
import { supabase } from '../lib/supabase'

type Chat = {
  id: string
  itemTitle: string
  interlocutorName: string
  interlocutorAvatarUrl: string | null
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
  item: Item | null
  buyer: Profile | null
  seller: Profile | null
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
  const [chats, setChats] = useState<Chat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace(buildLoginRedirectHref('/messages'))
  }, [loading, router, user])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true
    const load = async () => {
      setIsLoading(true)
      setFetchError(null)
      try {
        const { data: conversations, error } = await (supabase.from('conversations') as any)
          .select('*, item:items(*)')
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Ошибка загрузки чатов:', error)
          if (active) {
            setFetchError(error.message)
            setChats([])
            setIsLoading(false)
          }
          return
        }

        const rows = (conversations ?? []) as ConversationRow[]
        const conversationIds = rows.map((row) => row.id)

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

        const mapped = rows.map((conversation) => {
          const isBuyer = user.id === conversation.buyer_id
          const interlocutor = isBuyer ? conversation.seller : conversation.buyer
          const item = conversation.item
          const isItemAvailable = hasConversationItem(item)
          const lastMessage = lastMessageByConversation.get(conversation.id)

          return {
            id: conversation.id,
            itemTitle: isItemAvailable ? item.title?.trim() || 'Без названия' : 'Без названия',
            interlocutorName: interlocutor?.name?.trim() || 'Пользователь',
            interlocutorAvatarUrl: interlocutor?.avatar_url ?? null,
            preview: lastMessage?.text?.trim() || 'Новый диалог',
            time: lastMessage?.created_at ? formatTime(lastMessage.created_at) : '',
          }
        })

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
  }, [user?.id])

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
          ) : chats.length ? (
            <ul className="divide-y divide-slate-200/70">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <Link href={`/messages/${chat.id}`} className="flex items-center gap-4 px-4 py-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-200">
                      {chat.interlocutorAvatarUrl ? (
                        <Image
                          src={chat.interlocutorAvatarUrl}
                          alt={chat.interlocutorName}
                          fill
                          sizes="56px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-slate-500">
                          {chat.interlocutorName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-base font-semibold text-slate-950">
                          {chat.interlocutorName}
                        </p>
                        <span className="shrink-0 text-xs text-slate-500">{chat.time}</span>
                      </div>
                      <p className="truncate text-sm text-slate-500">{chat.itemTitle}</p>
                      <p className="truncate text-sm text-slate-500">{chat.preview}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
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
    </main>
  )
}
