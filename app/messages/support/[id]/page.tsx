'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, LifeBuoy, Send } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../../lib/auth-routing'
import { supabase } from '../../../lib/supabase'

type SupportTicket = {
  id: string
  user_id: string
  topic: string | null
  status: 'open' | 'closed' | null
}

type SupportMessage = {
  id: string
  ticket_id: string
  sender_id: string | null
  text: string
  is_admin: boolean | null
  created_at: string
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SupportTicketChatPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const ticketId = params?.id ?? ''

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loading || user) {
      return
    }

    if (ticketId) {
      router.replace(buildLoginRedirectHref(`/messages/support/${ticketId}`))
    }
  }, [loading, router, ticketId, user])

  useEffect(() => {
    if (!ticketId || !user?.id) {
      return
    }

    let active = true

    const loadTicket = async () => {
      setError('')
      setLoaded(false)

      try {
        const { data: ticketRow, error: ticketError } = await (supabase.from('support_tickets') as any)
          .select('id, user_id, topic, status')
          .eq('id', ticketId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (!active) {
          return
        }

        if (ticketError || !ticketRow) {
          setTicket(null)
          setMessages([])
          setError(ticketError?.message ?? 'Обращение не найдено')
          return
        }

        setTicket(ticketRow as SupportTicket)

        const { data: messageRows, error: messageError } = await (supabase.from('support_messages') as any)
          .select('id, ticket_id, sender_id, text, is_admin, created_at')
          .eq('ticket_id', ticketId)
          .order('created_at', { ascending: true })

        if (!active) {
          return
        }

        if (messageError) {
          setError(messageError.message)
          setMessages([])
          return
        }

        setMessages((messageRows ?? []) as SupportMessage[])
      } catch (loadError) {
        if (!active) {
          return
        }

        setTicket(null)
        setMessages([])
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить обращение')
      } finally {
        if (active) {
          setLoaded(true)
        }
      }
    }

    void loadTicket()

    const messagesChannel = supabase
      .channel(`support_ticket_messages_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        },
        (payload) => {
          const inserted = payload.new as SupportMessage
          setMessages((prev) => {
            if (prev.some((message) => message.id === inserted.id)) {
              return prev
            }

            return [...prev, inserted].sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            )
          })
        }
      )
      .subscribe()

    const ticketChannel = supabase
      .channel(`support_ticket_status_${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `id=eq.${ticketId}`,
        },
        (payload) => {
          const next = payload.new as SupportTicket
          setTicket((prev) => {
            if (!prev) {
              return prev
            }
            return {
              ...prev,
              status: next.status,
            }
          })
        }
      )
      .subscribe()

    return () => {
      active = false
      void supabase.removeChannel(messagesChannel)
      void supabase.removeChannel(ticketChannel)
    }
  }, [ticketId, user?.id])

  const isClosed = (ticket?.status ?? 'open') === 'closed'
  const statusLabel = isClosed ? 'Закрыт' : 'Открыт'
  const canSend = useMemo(
    () => Boolean(text.trim()) && !sending && !isClosed && Boolean(ticket?.id),
    [isClosed, sending, text, ticket?.id]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedText = text.trim()
    if (!user?.id || !ticket?.id || isClosed || !trimmedText) {
      return
    }

    setError('')
    setSending(true)

    try {
      const { error: insertError } = await (supabase.from('support_messages') as any).insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        text: trimmedText,
        is_admin: false,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setText('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  if (loading || !user || !ticketId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-10">
        <p className="text-sm text-slate-500">Загрузка обращения...</p>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#faf7f3] pb-28 text-slate-950 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-[#faf7f3]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-start gap-3 px-4 py-3">
          <Link
            href="/messages"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <h1 className="truncate text-base font-semibold text-slate-950">Служба поддержки</h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {(ticket?.topic ?? 'Без темы').trim()} - {statusLabel}
            </p>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-md flex-1 flex-col gap-3 px-4 py-4">
        {error ? (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
        ) : null}

        <div className="flex flex-1 flex-col gap-2 overflow-y-auto rounded-[2rem] bg-white p-4 shadow-sm">
          {messages.length ? (
            messages.map((message) => {
              const isAdmin = message.is_admin === true

              return (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isAdmin ? 'mr-auto bg-slate-100 text-slate-700' : 'ml-auto bg-blue-600 text-white'
                  }`}
                >
                  {isAdmin ? (
                    <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                      Поддержка
                    </p>
                  ) : null}
                  <p>{message.text}</p>
                  <p
                    className={`mt-2 text-[10px] ${
                      isAdmin ? 'text-left text-slate-500' : 'text-right text-blue-100'
                    }`}
                  >
                    {formatMessageTime(message.created_at)}
                  </p>
                </div>
              )
            })
          ) : loaded ? (
            <p className="my-auto text-center text-sm text-slate-500">
              Пока нет сообщений. Опишите проблему, и поддержка ответит в этом чате.
            </p>
          ) : (
            <p className="my-auto text-center text-sm text-slate-500">Загружаем переписку...</p>
          )}
        </div>

        {isClosed ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
            Обращение закрыто
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-[1.5rem] bg-white p-2 shadow-sm"
          >
            <input
              type="text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Введите сообщение..."
              className="h-11 w-full rounded-xl bg-[#faf7f3] px-4 text-[16px] text-slate-900 outline-none placeholder:text-slate-400"
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
        )}
      </section>
    </main>
  )
}
