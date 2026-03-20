import Link from 'next/link'
import Image from 'next/image'
import { Heart, PackageOpen } from 'lucide-react'

import { createSupabaseServerClient } from './lib/supabase-server'

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
    <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_48%),linear-gradient(160deg,rgba(255,255,255,0.45),rgba(229,231,235,0.75))]" />
      <div className="absolute inset-x-6 top-6 h-16 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center pb-6">
        <div className="h-24 w-16 rounded-t-[999px] bg-white/60" />
      </div>
    </div>
  )
}

function ProductCard({ item }: { item: Item }) {
  const previewImage = item.image_urls?.[0] ?? null

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]">
      <div className="relative">
        {previewImage ? (
          <div className="relative aspect-[3/4] w-full bg-slate-100">
            <Image
              src={previewImage}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <ProductPlaceholder />
        )}
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm"
            aria-label="Добавить в избранное"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex min-h-[74px] flex-col px-3 pb-4 pt-3 sm:px-4">
        <p className="text-lg font-bold text-gray-900">{formatPrice(item.price)} ₽</p>
        <h2 className="mt-1 truncate text-sm font-semibold leading-5 text-gray-800 sm:text-base">
          {item.title}
        </h2>
      </div>
    </article>
  )
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data, error } = await (supabase.from('items') as any)
    .select('*')
    .order('created_at', { ascending: false })
  const items = (data ?? []) as Item[]

  return (
    <main className="min-h-screen bg-[#f6f3ee] pb-24 text-slate-950 md:pb-0">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f3ee]/95 backdrop-blur">
          <div className="px-4 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xl font-semibold tracking-tight text-slate-950">
                  ProDance
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-fuchsia-200 hover:text-fuchsia-700"
                >
                  Профиль
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="flex flex-1 flex-col px-4 py-4 sm:px-6 sm:py-6">
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
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <Link
                  key={item.id}
                  href={`/item/${item.id}`}
                  className="block rounded-[1.5rem] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2"
                >
                  <ProductCard item={item} />
                </Link>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
