import { createClient } from '@supabase/supabase-js'

type DeletedItemProfile = {
  full_name: string | null
  avatar_url: string | null
}

type DeletedItemStatRow = {
  id: string
  title: string | null
  price: number | null
  reason: string | null
  deleted_at: string | null
  seller_id: string | null
  profiles?: DeletedItemProfile | DeletedItemProfile[] | null
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatPrice(value: number | null) {
  if (typeof value !== 'number') {
    return '—'
  }

  return `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
}

function normalizeProfile(
  profile: DeletedItemProfile | DeletedItemProfile[] | null | undefined
): DeletedItemProfile | null {
  if (!profile) {
    return null
  }

  return Array.isArray(profile) ? (profile[0] ?? null) : profile
}

export default async function AdminDeletedItemsPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: stats, error } = await (supabaseAdmin.from('deleted_items_stats') as any)
    .select('*, profiles(full_name, avatar_url)')
    .order('deleted_at', { ascending: false })

  const rows = (stats ?? []) as DeletedItemStatRow[]

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Статистика удаленных объявлений</h1>
      <p className="mt-2 text-sm text-slate-500">История удалений и причины ухода товаров с площадки.</p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error.message}
        </p>
      ) : null}

      {!rows.length ? (
        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white px-6 py-14 text-center">
          <p className="text-base font-medium text-slate-900">Удаленных товаров пока нет</p>
          <p className="mt-2 text-sm text-slate-500">Когда появятся новые удаления, они отобразятся в этом разделе.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200/70 bg-white">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm">
            <thead className="bg-[#faf7f3] text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Товар</th>
                <th className="px-4 py-3">Причина</th>
                <th className="px-4 py-3">Удален</th>
                <th className="px-4 py-3">Кто удалил</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((stat) => {
                const profile = normalizeProfile(stat.profiles)
                const sellerName = profile?.full_name || stat.seller_id || 'Неизвестно'
                const sellerInitial = (profile?.full_name?.[0] ?? 'U').toUpperCase()

                return (
                  <tr key={stat.id}>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">{stat.title || 'Без названия'}</div>
                      <div className="mt-1 text-xs text-slate-500">{formatPrice(stat.price)}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {stat.reason || 'Не указана'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{formatDateTime(stat.deleted_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                          {sellerInitial}
                        </span>
                        <span className="text-slate-800">{sellerName}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
