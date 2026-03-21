import { BarChart3, FileText, LifeBuoy, Users } from 'lucide-react'

import { supabaseAdmin } from '../lib/supabase-admin'

export default async function AdminDashboardPage() {
  const [profilesResult, itemsResult, supportResult] = await Promise.all([
    (supabaseAdmin.from('profiles') as any).select('*', { count: 'exact', head: true }),
    (supabaseAdmin.from('items') as any).select('*', { count: 'exact', head: true }),
    (supabaseAdmin.from('support_tickets') as any).select('*', { count: 'exact', head: true }),
  ])

  const usersCount = profilesResult.count ?? 0
  const itemsCount = itemsResult.count ?? 0
  const ticketsCount = supportResult.count ?? 0

  const stats = [
    {
      label: 'Пользователи',
      value: usersCount,
      note: 'Всего зарегистрировано',
      icon: Users,
    },
    {
      label: 'Активные объявления',
      value: itemsCount,
      note: 'Текущие карточки товаров',
      icon: FileText,
    },
    {
      label: 'Открытые тикеты',
      value: ticketsCount,
      note: 'Ожидают ответа поддержки',
      icon: LifeBuoy,
    },
  ]

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">Overview</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Дашборд</h1>
        </div>
        <div className="hidden items-center gap-2 rounded-2xl bg-[#faf7f3] px-4 py-2 text-sm text-slate-500 md:flex">
          <BarChart3 className="h-4 w-4" />
          Обновляется в реальном времени
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        {stats.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-[0_14px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#faf7f3] text-slate-700">
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">{card.value}</p>
              <p className="mt-3 text-sm text-slate-500">{card.note}</p>
            </article>
          )
        })}
      </section>
    </div>
  )
}
