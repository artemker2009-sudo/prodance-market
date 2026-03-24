import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { supabaseAdmin } from '../../lib/supabase-admin'

type ProfileRow = {
  id: string
  name: string | null
}

type SupportTicketRow = {
  id: string
  topic: string | null
  status: 'open' | 'closed' | null
  created_at: string | null
  user_id: string | null
  profile: ProfileRow | null
}

type SupportMessageRow = {
  id: string
  text: string | null
  is_admin: boolean | null
  created_at: string | null
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

function normalizeProfile(profile: ProfileRow | ProfileRow[] | null | undefined): ProfileRow | null {
  if (!profile) {
    return null
  }

  return Array.isArray(profile) ? (profile[0] ?? null) : profile
}

function ticketLink(ticketId: string) {
  return `/admin/support?ticket=${encodeURIComponent(ticketId)}`
}

async function sendAdminMessageAction(formData: FormData) {
  'use server'

  const ticketId = formData.get('ticket_id')
  const text = formData.get('text')

  if (typeof ticketId !== 'string' || !ticketId) {
    return
  }

  if (typeof text !== 'string' || !text.trim()) {
    redirect(ticketLink(ticketId))
  }

  const { data: ticket } = await (supabaseAdmin.from('support_tickets') as any)
    .select('id, status, user_id')
    .eq('id', ticketId)
    .maybeSingle()

  if (!ticket || ticket.status === 'closed') {
    revalidatePath('/admin/support')
    redirect(ticketLink(ticketId))
  }

  const insertResult = await (supabaseAdmin.from('support_messages') as any).insert({
    ticket_id: ticketId,
    text: text.trim(),
    is_admin: true,
  })

  if (insertResult.error && ticket.user_id) {
    await (supabaseAdmin.from('support_messages') as any).insert({
      ticket_id: ticketId,
      text: text.trim(),
      is_admin: true,
      sender_id: ticket.user_id,
    })
  }

  revalidatePath('/admin/support')
  redirect(ticketLink(ticketId))
}

async function closeTicketAction(formData: FormData) {
  'use server'

  const ticketId = formData.get('ticket_id')

  if (typeof ticketId !== 'string' || !ticketId) {
    return
  }

  await (supabaseAdmin.from('support_tickets') as any).update({ status: 'closed' }).eq('id', ticketId)
  revalidatePath('/admin/support')
  redirect(ticketLink(ticketId))
}

async function loadSupportTickets() {
  const joinResult = await (supabaseAdmin.from('support_tickets') as any)
    .select('id, topic, status, created_at, user_id, profile:profiles!support_tickets_user_id_fkey(id, name)')
    .order('created_at', { ascending: false })

  if (!joinResult.error) {
    const rows = (joinResult.data ?? []) as Array<{
      id: string
      topic: string | null
      status: 'open' | 'closed' | null
      created_at: string | null
      user_id: string | null
      profile: ProfileRow | ProfileRow[] | null
    }>

    return {
      tickets: rows.map((row) => ({
        id: row.id,
        topic: row.topic,
        status: row.status ?? 'open',
        created_at: row.created_at,
        user_id: row.user_id,
        profile: normalizeProfile(row.profile),
      })),
      error: '',
    }
  }

  const fallbackResult = await (supabaseAdmin.from('support_tickets') as any)
    .select('id, topic, status, created_at, user_id')
    .order('created_at', { ascending: false })

  if (fallbackResult.error) {
    return { tickets: [] as SupportTicketRow[], error: fallbackResult.error.message }
  }

  const rawTickets = (fallbackResult.data ?? []) as Array<{
    id: string
    topic: string | null
    status: 'open' | 'closed' | null
    created_at: string | null
    user_id: string | null
  }>

  const userIds = [...new Set(rawTickets.map((ticket) => ticket.user_id).filter(Boolean))] as string[]
  let profilesById = new Map<string, ProfileRow>()

  if (userIds.length) {
    const { data: profileRows } = await (supabaseAdmin.from('profiles') as any)
      .select('id, name')
      .in('id', userIds)

    profilesById = new Map(
      ((profileRows ?? []) as ProfileRow[]).map((profile) => [profile.id, profile] as const)
    )
  }

  return {
    tickets: rawTickets.map((ticket) => ({
      id: ticket.id,
      topic: ticket.topic,
      status: ticket.status ?? 'open',
      created_at: ticket.created_at,
      user_id: ticket.user_id,
      profile: ticket.user_id ? profilesById.get(ticket.user_id) ?? null : null,
    })),
    error: '',
  }
}

type AdminSupportPageProps = {
  searchParams?: {
    ticket?: string
  }
}

export default async function AdminSupportPage({ searchParams }: AdminSupportPageProps) {
  const { tickets, error } = await loadSupportTickets()
  const selectedTicketId = searchParams?.ticket && tickets.some((t) => t.id === searchParams.ticket)
    ? searchParams.ticket
    : (tickets[0]?.id ?? '')
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId) ?? null

  let messages: SupportMessageRow[] = []
  let messagesError = ''

  if (selectedTicket?.id) {
    const messagesResult = await (supabaseAdmin.from('support_messages') as any)
      .select('id, text, is_admin, created_at')
      .eq('ticket_id', selectedTicket.id)
      .order('created_at', { ascending: true })

    if (messagesResult.error) {
      messagesError = messagesResult.error.message
    } else {
      messages = (messagesResult.data ?? []) as SupportMessageRow[]
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Поддержка</h1>
      <p className="mt-2 text-sm text-slate-500">Управление обращениями пользователей</p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[360px_1fr]">
        <aside className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
          <div className="border-b border-slate-200/70 px-4 py-3">
            <p className="text-xs font-semibold tracking-[0.12em] text-slate-500 uppercase">Все обращения</p>
          </div>
          <ul className="max-h-[70vh] divide-y divide-slate-100 overflow-y-auto">
            {!tickets.length ? (
              <li className="px-4 py-8 text-center text-sm text-slate-500">Обращений пока нет</li>
            ) : (
              tickets.map((ticket) => {
                const isSelected = ticket.id === selectedTicketId
                const isClosed = (ticket.status ?? 'open') === 'closed'
                const statusLabel = isClosed ? 'Закрыт' : 'Открыт'

                return (
                  <li key={ticket.id}>
                    <a
                      href={ticketLink(ticket.id)}
                      className={`block px-4 py-4 transition ${
                        isSelected ? 'bg-slate-950/5' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                          {(ticket.topic ?? 'Без темы').trim()}
                        </p>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isClosed
                              ? 'border border-rose-200 bg-rose-50 text-rose-700'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">
                        {ticket.profile?.name || ticket.user_id || 'Пользователь'}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{formatDateTime(ticket.created_at)}</p>
                    </a>
                  </li>
                )
              })
            )}
          </ul>
        </aside>

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white">
          {!selectedTicket ? (
            <div className="m-auto px-6 py-8 text-center text-sm text-slate-500">
              Выберите обращение слева, чтобы открыть чат.
            </div>
          ) : (
            <>
              <header className="border-b border-slate-200/70 px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      {(selectedTicket.topic ?? 'Без темы').trim()}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {selectedTicket.profile?.name || selectedTicket.user_id || 'Пользователь'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        selectedTicket.status === 'closed'
                          ? 'border border-rose-200 bg-rose-50 text-rose-700'
                          : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {selectedTicket.status === 'closed' ? 'Закрыт' : 'Открыт'}
                    </span>
                    {selectedTicket.status !== 'closed' ? (
                      <form action={closeTicketAction}>
                        <input type="hidden" name="ticket_id" value={selectedTicket.id} />
                        <button
                          type="submit"
                          className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
                        >
                          Закрыть обращение
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-[#faf7f3] p-4">
                {messagesError ? (
                  <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    {messagesError}
                  </p>
                ) : null}

                {!messages.length ? (
                  <p className="m-auto text-center text-sm text-slate-500">Сообщений в этом обращении пока нет</p>
                ) : (
                  messages.map((message) => {
                    const isAdmin = message.is_admin === true

                    return (
                      <div
                        key={message.id}
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          isAdmin
                            ? 'ml-auto bg-blue-600 text-white'
                            : 'mr-auto bg-white text-slate-700 shadow-sm'
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
                  })
                )}
              </div>

              {selectedTicket.status === 'closed' ? (
                <div className="border-t border-slate-200/70 px-5 py-4 text-sm text-slate-500">
                  Обращение закрыто. Отправка сообщений недоступна.
                </div>
              ) : (
                <form action={sendAdminMessageAction} className="border-t border-slate-200/70 p-3">
                  <input type="hidden" name="ticket_id" value={selectedTicket.id} />
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      name="text"
                      placeholder="Введите ответ пользователю..."
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
                      required
                    />
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      Отправить
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}
