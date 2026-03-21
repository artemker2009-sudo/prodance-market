import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'

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

type SellerProfile = {
  id: string
  name: string | null
  avatar_url: string | null
  city: string | null
  created_at: string
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function getRegistrationYear(dateValue: string | null | undefined) {
  if (!dateValue) {
    return null
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.getFullYear()
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

  const { data: item, error: itemError } = await (supabase.from('items') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (itemError) {
    if (itemError.code === 'PGRST116') {
      notFound()
    }
    throw new Error(itemError.message)
  }

  let sellerProfile: SellerProfile | null = null
  if (item?.seller_id) {
    const { data: seller, error: sellerError } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('id', item.seller_id)
      .single()

    if (sellerError && sellerError.code !== 'PGRST116') {
      throw new Error(sellerError.message)
    }

    sellerProfile = (seller as SellerProfile | null) ?? null
  }

  const sellerName = sellerProfile?.name?.trim() || 'Продавец'
  const registrationYear = getRegistrationYear(sellerProfile?.created_at)
  const sellerAvatarUrl = sellerProfile?.avatar_url?.trim() || null
  const sellerAvatarLetter = sellerName.charAt(0).toUpperCase()
  const sellerProfileHref = item.seller_id ? `/user/${item.seller_id}` : '#'
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

        {item.image_urls && item.image_urls.length > 0 ? (
          <div className="relative">
            <div
              className="flex overflow-x-auto snap-x snap-mandatory w-full scrollbar-hide"
              style={{ scrollbarWidth: 'none' }}
            >
              {item.image_urls.map((url, index) => (
                <div key={index} className="relative min-w-full snap-center aspect-[3/4] bg-slate-100">
                  <Image
                    src={url}
                    alt={`${item.title} — фото ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 480px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
              ))}
            </div>
            <div className="pointer-events-none absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              <Camera className="h-3.5 w-3.5" />
              <span>{item.image_urls.length}</span>
            </div>
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

        <Link
          href={sellerProfileHref}
          className="mt-5 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_8px_24px_-18px_rgba(15,23,42,0.5)] transition hover:shadow-[0_14px_34px_-20px_rgba(15,23,42,0.45)]"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
            {sellerAvatarUrl ? (
              <Image
                src={sellerAvatarUrl}
                alt={sellerName}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
                unoptimized
              />
            ) : (
              <span>{sellerAvatarLetter || 'П'}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-slate-900">{sellerName}</p>
            <p className="mt-1 text-sm text-slate-500">
              На ProDance с {registrationYear ?? 'недавно'}
            </p>
          </div>
          <span className="text-xl leading-none text-slate-400">&gt;</span>
        </Link>
      </section>

      <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white px-4 py-4 pb-safe md:bottom-0">
        <StartConversationButton itemId={item.id} sellerId={item.seller_id} />
      </div>
    </main>
  )
}
