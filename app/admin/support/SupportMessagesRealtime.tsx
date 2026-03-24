'use client'

import { useEffect, useRef, useState } from 'react'

import { supabase } from '../../lib/supabase'

type SupportMessageRow = {
  id: string
  text: string | null
  is_admin: boolean | null
  created_at: string | null
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

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages, ticketId])

  useEffect(() => {
    const channel = supabase
      .channel(`support_chat_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const insertedMessage = payload.new as SupportMessageRow
          setMessages((prev) => {
            if (prev.some((message) => message.id === insertedMessage.id)) {
              return prev
            }

            return [...prev, insertedMessage]
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [ticketId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
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
