'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '../../lib/supabase'

type SupportMessageRow = {
  id: string
  text: string | null
  is_admin: boolean | null
  created_at: string | null
}

type RealtimeSupportMessage = SupportMessageRow & {
  ticket_id: string | null
}

type SupportMessagesRealtimeProps = {
  ticketId: string
  initialMessages: SupportMessageRow[]
  hasError: boolean
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function SupportMessagesRealtime({
  ticketId,
  initialMessages,
  hasError,
}: SupportMessagesRealtimeProps) {
  const [messages, setMessages] = useState<SupportMessageRow[]>(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const router = useRouter()

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, ticketId])

  useEffect(() => {
    // Глобальная подписка для админки: ловим все новые сообщения поддержки.
    const messageChannel = supabase
      .channel('admin_global_support_messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
        },
        (payload) => {
          setMessages((prev) => {
            const nextMessage = payload.new as RealtimeSupportMessage
            if (prev.some((message) => message.id === nextMessage.id)) {
              return prev
            }

            // В текущем окне чата показываем только сообщения выбранного тикета.
            if (ticketId && nextMessage.ticket_id === ticketId) {
              return [...prev, nextMessage]
            }

            return prev
          })

          // Обновляем список тикетов в админке (поднятие активного наверх/новые превью).
          if (!ticketId || (payload.new as RealtimeSupportMessage).ticket_id !== ticketId) {
            router.refresh()
          }
        }
      )
      .subscribe()

    const ticketChannel = supabase
      .channel('admin_global_support_tickets')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_tickets',
        },
        () => {
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(messageChannel)
      void supabase.removeChannel(ticketChannel)
    }
  }, [ticketId, router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (!messages.length && !hasError) {
    return <p className="m-auto text-center text-sm text-slate-500">Сообщений в этом обращении пока нет</p>
  }

  return (
    <>
      {messages.map((message) => {
        const isAdmin = message.is_admin === true

        return (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              isAdmin ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-white text-slate-700 shadow-sm'
            }`}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase opacity-80">
              {isAdmin ? 'Администратор' : 'Пользователь'}
            </p>
            <p>{message.text?.trim() || 'Без текста'}</p>
            <p className={`mt-2 text-[10px] ${isAdmin ? 'text-blue-100' : 'text-slate-500'}`}>
              {formatDateTime(message.created_at)}
            </p>
          </div>
        )
      })}
      <div ref={messagesEndRef} />
    </>
  )
}
