import Link from 'next/link'
import Image from 'next/image'
import { PackageOpen } from 'lucide-react'

import { createSupabaseServerClient } from '../../lib/supabase-server'
import { PremiumItemCard } from '../../profile/components/PremiumItemCard'

type UserPageProps = {
  params: Promise<{
    id: string
  }>
}

type Profile = {
  id: string
  name: string | null
  avatar_url: string | null
  city: string | null
  created_at: string
}

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  status: string | null
}

function isActiveStatus(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toLowerCase()
  return normalized !== 'sold' && normalized !== 'продано'
}

function formatProjectDate(dateValue: string | null | undefined) {
  if (!dateValue) {
    return 'Недавно'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'Недавно'
  }

  const month = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date)
  const year = new Intl.DateTimeFormat('ru-RU', { year: 'numeric' }).format(date)
  const normalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)

  return `${normalizedMonth} ${year}`
}

export default async function PublicUserPage({ params }: UserPageProps) {
  const routeParams = await params
  const { id } = routeParams
  const supabase = await createSupabaseServerClient()

  const [{ data: profile, error: profileError }, { data: rawItems, error: itemsError }] = await Promise.all([
    (supabase.from('profiles') as any).select('*').eq('id', routeParams.id).single(),
    (supabase.from('items') as any)
      .select('id, title, price, image_urls, status')
      .eq('seller_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (profileError) {
    throw new Error(profileError.message)
  }

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const items = ((rawItems ?? []) as Item[]).filter((item) => isActiveStatus(item.status))
  const profileName = profile?.name?.trim() || 'Пользователь'
  const city = profile?.city?.trim() || null
  const projectDate = formatProjectDate(profile?.created_at)
  const avatarLetter = profileName.charAt(0).toUpperCase()

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-5 pb-28 text-slate-950">
      <div className="mx-auto w-full max-w-5xl">
        <header className="rounded-[2rem] border border-slate-200/70 bg-white px-5 py-5 shadow-sm">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
            >
              Назад
            </Link>
            <div className="w-[84px]" />
          </div>

          <div className="mt-4 flex flex-col items-center text-center">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-3xl font-semibold text-slate-700">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profileName}
                  width={112}
                  height={112}
                  className="h-28 w-28 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-4xl">{avatarLetter || 'П'}</span>
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold text-slate-950">{profileName}</h1>
            {city ? <p className="mt-1 text-sm text-slate-500">{city}</p> : null}
            <p className="mt-1 text-sm text-slate-500">На ProDance с {projectDate}</p>
          </div>
        </header>

        <section className="mt-5">
          <h2 className="text-lg font-semibold text-slate-950">Объявления пользователя</h2>
          {items.length ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
              {items.map((item) => (
                <PremiumItemCard key={item.id} item={item} href={`/item/${item.id}`} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
              <PackageOpen className="mx-auto h-12 w-12 text-slate-300" />
              <p className="mt-4 text-base font-semibold text-slate-900">
                У пользователя пока нет активных объявлений
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
