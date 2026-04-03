import Link from 'next/link'
import Image from 'next/image'
import { PackageOpen, Search, SlidersHorizontal } from 'lucide-react'

import { createSupabaseServerClient } from './lib/supabase-server'
import { FavoriteToggle } from './item/[id]/item-actions'

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  size: string | null
  gender: string | null
  category: string | null
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function ProductPlaceholder() {
  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_48%),linear-gradient(160deg,rgba(255,255,255,0.45),rgba(229,231,235,0.75))]" />
      <div className="absolute inset-x-6 top-6 h-16 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center pb-6">
        <div className="h-24 w-16 rounded-t-[999px] bg-white/60" />
      </div>
    </div>
  )
}

function ProductCard({
  item,
  initialIsFavorite,
}: {
  item: Item
  initialIsFavorite: boolean
}) {
  const previewImage = item.image_urls?.[0] ?? null

  return (
    <div className="relative">
      <Link
        href={`/item/${item.id}`}
        className="block rounded-[1.5rem] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2"
      >
        <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.28)]">
          <div className="relative">
            {previewImage ? (
              <div className="relative aspect-[3/4] w-full bg-slate-100">
                <Image
                  src={previewImage}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <ProductPlaceholder />
            )}
          </div>
          <div className="flex min-h-[74px] flex-col px-3 pb-4 pt-3 sm:px-4">
            <p className="text-lg font-bold text-gray-900">{formatPrice(item.price)} ₽</p>
            <h2 className="mt-1 truncate text-sm font-semibold leading-5 text-gray-800 sm:text-base">
              {item.title}
            </h2>
          </div>
        </article>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <div className="inline-flex rounded-full border border-white/20 bg-white/30 p-0.5 backdrop-blur-md">
          <FavoriteToggle
            itemId={item.id}
            initialIsFavorite={initialIsFavorite}
            className="h-10 w-10 border-transparent bg-transparent text-white hover:bg-white/20"
            iconClassName="h-4 w-4"
          />
        </div>
      </div>
    </div>
  )
}

export default async function HomePage() {
  const stories = [
    'Тренды сезона',
    'Новинки',
    'Правила',
    'Скидки',
    'Коллекции',
    'Бренды',
  ]
  const chips = ['🔥 Все', '💃 Латина', '🤵 Стандарт', '👟 Обувь']

  const supabase = await createSupabaseServerClient()
  const [{ data: authData }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    (supabase.from('items') as any)
      .select('*')
      .eq('is_active', true)
      .is('archive_reason', null)
      .order('created_at', { ascending: false }),
  ])
  const userId = authData.user?.id ?? null
  const favoriteIds = new Set<string>()

  if (userId) {
    const { data: favoritesRows } = await (supabase.from('favorites') as any)
      .select('item_id')
      .eq('user_id', userId)
    for (const row of (favoritesRows ?? []) as Array<{ item_id: string | null }>) {
      if (row.item_id) {
        favoriteIds.add(row.item_id)
      }
    }
  }

  const items = (data ?? []) as Item[]

  return (
    <main className="min-h-screen bg-white pb-24 text-slate-950 md:pb-0">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col">
        <section className="px-4 pt-7">
          <h1 className="font-serif text-5xl font-bold tracking-tight text-slate-950">
            ProDance
          </h1>
          <p className="mt-2 max-w-[320px] font-serif text-base italic text-slate-600">
            Твой идеальный костюм для паркета. Покупай и продавай
          </p>
        </section>

        <section className="sticky top-0 z-40 bg-white/95 px-4 pt-4 pb-2 backdrop-blur-sm">
          <label className="flex h-14 items-center gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="search"
              placeholder="Искать платья, туфли, бренды..."
              className="h-full w-full bg-transparent text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
            />
            <button
              type="button"
              aria-label="Фильтры"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </label>
        </section>

        <section className="px-4 pt-3">
          <ul className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {stories.map((story) => (
              <li key={story} className="w-[74px] shrink-0 snap-start text-center">
                <div className="mx-auto flex h-[66px] w-[66px] items-center justify-center rounded-full bg-gradient-to-b from-[#f5f5f5] to-[#ececec] p-[2px]">
                  <div className="h-full w-full rounded-full bg-white p-[2px]">
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] font-medium leading-4 text-slate-600">{story}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-4 pt-2">
          <ul className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
            {chips.map((chip) => (
              <li key={chip}>
                <button
                  type="button"
                  className="whitespace-nowrap rounded-full bg-black px-4 py-2 text-sm font-medium text-white"
                >
                  {chip}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-1 flex-col px-4 pb-6 pt-2">
          {error ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Не удалось загрузить каталог: {error.message}
            </div>
          ) : null}

          {!items.length ? (
            <section className="flex flex-1 items-center justify-center">
              <div className="w-full text-center">
                <PackageOpen className="mx-auto mb-4 h-16 w-16 stroke-[1.5] text-slate-300" />
                <h1 className="text-xl font-bold text-slate-900">Здесь пока пусто</h1>
                <p className="mx-auto mt-2 max-w-[250px] text-sm leading-relaxed text-slate-500">
                  Станьте первым, кто выложит вещь на продажу.
                </p>
                <Link
                  href="/create"
                  className="mx-auto mt-8 inline-flex h-14 w-full max-w-[280px] items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-lg transition hover:bg-slate-800"
                >
                  Разместить объявление
                </Link>
              </div>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <ProductCard
                  key={item.id}
                  item={item}
                  initialIsFavorite={favoriteIds.has(item.id)}
                />
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
