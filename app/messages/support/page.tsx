'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LifeBuoy, Send } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../lib/auth-routing'
import { supabase } from '../../lib/supabase'

type SupportTicket = {
  id: string
  user_id: string
  topic: string | null
  status: 'open' | 'closed' | null
}

type SupportMessage = {
  id: string
  ticket_id?: string
  sender_id?: string | null
  text: string
  is_admin: boolean | null
  created_at: string
}

const TOPICS = ['Вопрос по товарам', 'Техническая ошибка', 'Жалоба на пользователя', 'Другое']

const welcomeMsg: SupportMessage = {
  id: 'sys',
  text: 'Здравствуйте! Это чат поддержки ProDance. Опишите вашу проблему, и администратор ответит вам в ближайшее время.',
  is_admin: true,
  created_at: new Date().toISOString(),
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function SupportChatPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const user = session?.user ?? null

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null)

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace(buildLoginRedirectHref('/messages/support'))
  }, [loading, router, user])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true

    const loadChat = async () => {
      setError('')
      setLoaded(false)

      try {
        const { data: ticketRow, error: ticketError } = await (supabase.from('support_tickets') as any)
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'open')
          .single()

        if (!active) {
          return
        }

        // PGRST116: no rows returned for single()
        if (ticketError && ticketError.code !== 'PGRST116') {
          setActiveTicket(null)
          setSelectedTopic(null)
          setMessages([welcomeMsg])
          setError(ticketError.message)
          return
        }

        if (!ticketRow) {
          setActiveTicket(null)
          setSelectedTopic(null)
          setMessages([welcomeMsg])
          return
        }

        const nextActiveTicket = ticketRow as SupportTicket
        setActiveTicket(nextActiveTicket)
        setSelectedTopic(nextActiveTicket.topic ?? null)

        const { data: messageRows, error: messageError } = await (supabase.from('support_messages') as any)
          .select('id, ticket_id, sender_id, text, is_admin, created_at')
          .eq('ticket_id', nextActiveTicket.id)
          .order('created_at', { ascending: true })

        if (!active) {
          return
        }

        if (messageError) {
          setMessages([welcomeMsg])
          setError(messageError.message)
          return
        }

        const loadedMessages = (messageRows ?? []) as SupportMessage[]
        setMessages(loadedMessages.length ? [welcomeMsg, ...loadedMessages] : [welcomeMsg])
      } catch (loadError) {
        if (!active) {
          return
        }

        setActiveTicket(null)
        setSelectedTopic(null)
        setMessages([welcomeMsg])
        setError(loadError instanceof Error ? loadError.message : 'Не удалось загрузить чат поддержки')
      } finally {
        if (active) {
          setLoaded(true)
        }
      }
    }

    void loadChat()

    return () => {
      active = false
    }
  }, [user?.id])

  const isClosed = (activeTicket?.status ?? 'open') === 'closed'
  const statusLabel = isClosed ? 'Закрыт' : 'Открыт'
  const canSend = useMemo(
    () => Boolean(text.trim()) && !sending && !isClosed,
    [isClosed, sending, text]
  )

  const handleSendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedText = text.trim()
    if (!user?.id || isClosed || !trimmedText) {
      return
    }

    if (!activeTicket && !selectedTopic) {
      setError('Сначала выберите тему обращения')
      return
    }

    setError('')
    setSending(true)

    try {
      let currentTicket = activeTicket

      if (!currentTicket?.id) {
        const { data: newTicket, error: ticketError } = await (supabase.from('support_tickets') as any)
          .insert({
            user_id: user.id,
            topic: selectedTopic,
            status: 'open',
          })
          .select()
          .single()

        if (ticketError || !newTicket?.id) {
          throw new Error(ticketError?.message ?? 'Не удалось создать тикет поддержки')
        }

        currentTicket = newTicket as SupportTicket
        setActiveTicket(currentTicket)
      }

      const { data: insertedMessage, error: insertError } = await (supabase.from('support_messages') as any)
        .insert({
          ticket_id: currentTicket.id,
          sender_id: user.id,
          text: trimmedText,
          is_admin: false,
        })
        .select('id, ticket_id, sender_id, text, is_admin, created_at')
        .single()

      if (insertError || !insertedMessage) {
        throw new Error(insertError?.message ?? 'Не удалось отправить сообщение')
      }

      setMessages((prev) => {
        if (prev.some((message) => message.id === insertedMessage.id)) {
          return prev
        }
        return [...prev, insertedMessage as SupportMessage]
      })
      setText('')
      if (!activeTicket) {
        setSelectedTopic(currentTicket.topic ?? selectedTopic)
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось отправить сообщение')
    } finally {
      setSending(false)
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-10">
        <p className="text-sm text-slate-500">Загрузка чата поддержки...</p>
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
              {(activeTicket?.topic ?? selectedTopic ?? 'Общее обращение').trim()} - {statusLabel}
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
            <p className="my-auto text-center text-sm text-slate-500">Пока нет сообщений.</p>
          ) : (
            <p className="my-auto text-center text-sm text-slate-500">Загружаем переписку...</p>
          )}
        </div>

        {isClosed ? (
          <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-center text-sm text-slate-600 shadow-sm">
            Обращение закрыто
          </div>
        ) : !activeTicket && !selectedTopic ? (
          <div className="rounded-[1.5rem] border border-gray-100 bg-white p-4 shadow-sm">
            <p className="mb-3 text-center text-sm text-gray-500">Выберите тему обращения:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {TOPICS.map((topic) => (
                <button
                  key={topic}
                  type="button"
                  onClick={() => {
                    setSelectedTopic(topic)
                    setError('')
                  }}
                  className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-100"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        ) : !activeTicket && selectedTopic ? (
          <form
            onSubmit={handleSendMessage}
            className="rounded-[1.5rem] bg-white p-2 shadow-sm"
          >
            <div className="mb-2 flex items-center justify-between px-2">
              <p className="text-xs text-slate-500">Тема: {selectedTopic}</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedTopic(null)
                  setText('')
                }}
                className="text-xs font-medium text-slate-500 transition-colors hover:text-slate-700"
              >
                Сбросить тему
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={`Тема: ${selectedTopic}. Опишите проблему...`}
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
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleSendMessage}
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
