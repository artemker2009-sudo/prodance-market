import { revalidatePath } from 'next/cache'

import { supabaseAdmin } from '../../lib/supabase-admin'

type SupportTicketRow = {
  id: string
  message: string | null
  created_at: string | null
  user_id: string | null
  profile: ProfileRow | null
}

type ProfileRow = {
  id: string
  name: string | null
}

function formatDate(value: string | null) {
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

async function resolveTicketAction(formData: FormData) {
  'use server'

  const ticketId = formData.get('ticket_id')

  if (typeof ticketId !== 'string' || !ticketId) {
    return
  }

  await (supabaseAdmin.from('support_tickets') as any).delete().eq('id', ticketId)
  revalidatePath('/admin/support')
}

export default async function AdminSupportPage() {
  let error = ''
  let tickets: SupportTicketRow[] = []

  const { data: ticketRows, error: ticketsError } = await (supabaseAdmin
    .from('support_tickets') as any)
    .select('*')
    .order('created_at', { ascending: false })

  if (ticketsError) {
    error = ticketsError.message
  } else {
    const rawTickets = (ticketRows ?? []) as Array<{
      id: string
      message: string | null
      created_at: string | null
      user_id: string | null
    }>

    const userIds = [...new Set(rawTickets.map((ticket) => ticket.user_id).filter(Boolean))] as string[]
    let profiles: ProfileRow[] = []

    if (userIds.length) {
      const { data: profileRows, error: profilesError } = await (supabaseAdmin
        .from('profiles') as any)
        .select('*')
        .in('id', userIds)

      if (profilesError) {
        error = profilesError.message
      } else {
        profiles = ((profileRows ?? []) as Array<{ id: string; name: string | null }>).map((profile) => ({
          id: profile.id,
          name: profile.name,
        }))
      }
    }

    const profilesMap = new Map(profiles.map((profile) => [profile.id, profile] as const))

    tickets = rawTickets.map((ticket) => ({
      id: ticket.id,
      message: ticket.message,
      created_at: ticket.created_at,
      user_id: ticket.user_id,
      profile: ticket.user_id ? profilesMap.get(ticket.user_id) ?? null : null,
    }))
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Поддержка</h1>
      <p className="mt-2 text-sm text-slate-500">Обращения пользователей</p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200/70">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm">
          <thead className="bg-[#faf7f3] text-left text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Кто написал</th>
              <th className="px-4 py-3">Текст проблемы</th>
              <th className="px-4 py-3">Дата</th>
              <th className="px-4 py-3 text-right">Статус</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {!tickets.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Открытых тикетов нет
                </td>
              </tr>
            ) : (
              tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="px-4 py-4 font-medium text-slate-900">
                    {ticket.profile?.name || ticket.user_id || 'Пользователь'}
                  </td>
                  <td className="max-w-[420px] px-4 py-4 text-slate-700">
                    <p className="line-clamp-3">{ticket.message || 'Без текста'}</p>
                  </td>
                  <td className="px-4 py-4 text-slate-700">{formatDate(ticket.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    <form action={resolveTicketAction}>
                      <input type="hidden" name="ticket_id" value={ticket.id} />
                      <button
                        type="submit"
                        className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-700 transition hover:bg-emerald-100"
                      >
                        Решено
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
