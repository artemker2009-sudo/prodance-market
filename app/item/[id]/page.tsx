import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { createSupabaseServerClient } from '../../lib/supabase-server'
import { FavoriteToggle, StartConversationButton } from './item-actions'

type ItemPageProps = {
  params: Promise<{
    id: string
  }>
}

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  seller_id: string | null
  size: string | null
  gender: string | null
  category: string | null
  description: string | null
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function ProductImagePlaceholder() {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.3),rgba(226,232,240,0.9))]" />
      <div className="absolute inset-x-8 top-8 h-20 rounded-full bg-white/60 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-28 items-end justify-center pb-8">
        <div className="h-28 w-20 rounded-t-[999px] bg-white/70" />
      </div>
    </div>
  )
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data, error } = await (supabase.from('items') as any)
    .select('id, title, price, image_urls, seller_id, size, gender, category, description')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const item = data as Item | null

  if (!item) {
    notFound()
  }
  const gallery = item.image_urls?.filter(Boolean) ?? []

  const specs = [
    { label: 'Размер', value: item.size || 'Не указан' },
    { label: 'Категория', value: item.category || 'Не указана' },
    { label: 'Пол', value: item.gender || 'Не указан' },
  ]

  return (
    <main className="min-h-screen bg-[#faf7f3] pb-40 text-slate-950 md:pb-32">
      <section className="relative">
        <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </header>

        {gallery.length ? (
          <div className="flex overflow-x-auto snap-x">
            {gallery.map((imageUrl, index) => (
              <div
                key={`${item.id}-${index}`}
                className="relative aspect-[3/4] min-w-full snap-center"
              >
                <Image
                  src={imageUrl}
                  alt={`${item.title} — фото ${index + 1}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 480px"
                  className="bg-slate-100 object-cover"
                  unoptimized
                />
              </div>
            ))}
          </div>
        ) : (
          <ProductImagePlaceholder />
        )}
      </section>

      <section className="relative z-10 -mt-6 rounded-t-3xl bg-white px-4 pb-8 pt-6 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xl font-bold text-slate-900">{formatPrice(item.price)} ₽</p>
          <FavoriteToggle itemId={item.id} />
        </div>
        <h1 className="mt-1 text-lg text-slate-700">{item.title}</h1>

        <div className="mt-5 flex flex-wrap gap-2">
          {specs.map((spec) => (
            <span
              key={spec.label}
              className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600"
            >
              {spec.label}: {spec.value}
            </span>
          ))}
        </div>

        <section className="mt-8">
          <h2 className="text-base font-semibold text-slate-900">Описание</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
            {item.description || 'Продавец пока не добавил описание для этого товара.'}
          </p>
        </section>
      </section>

      <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white px-4 py-4 pb-safe md:bottom-0">
        <StartConversationButton itemId={item.id} sellerId={item.seller_id} />
      </div>
    </main>
  )
}
