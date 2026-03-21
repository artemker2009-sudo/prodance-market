'use client'

import { useEffect, useState } from 'react'

import { supabase } from '../../lib/supabase'

type SupportTicketRow = {
  id: string
  message: string | null
  created_at: string | null
  user_id: string | null
  profile: {
    id: string
    name: string | null
  } | null
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

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<SupportTicketRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadTickets = async () => {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await (supabase.from('support_tickets') as any)
        .select('id, message, created_at, user_id, profile:profiles(id, name)')
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (queryError) {
        setError(queryError.message)
        setTickets([])
        setLoading(false)
        return
      }

      setTickets((data ?? []) as SupportTicketRow[])
      setLoading(false)
    }

    void loadTickets()

    return () => {
      active = false
    }
  }, [])

  const handleResolve = async (ticket: SupportTicketRow) => {
    setResolvingId(ticket.id)
    setError('')

    const { error: deleteError } = await (supabase.from('support_tickets') as any)
      .delete()
      .eq('id', ticket.id)

    if (deleteError) {
      setError(deleteError.message)
      setResolvingId(null)
      return
    }

    setTickets((prev) => prev.filter((row) => row.id !== ticket.id))
    setResolvingId(null)
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
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Загружаем обращения...
                </td>
              </tr>
            ) : !tickets.length ? (
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
                    <button
                      type="button"
                      onClick={() => handleResolve(ticket)}
                      disabled={resolvingId === ticket.id}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
                    >
                      {resolvingId === ticket.id ? 'Закрываем...' : 'Решено'}
                    </button>
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
