import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import { createSupabaseServerClient } from '../../lib/supabase-server'
import { FavoriteToggle, QuickQuestionsSection, StartConversationButton } from './item-actions'
import { ItemImageGallery } from './item-image-gallery'

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
  created_at: string | null
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

function formatRelativeTime(dateValue: string | null | undefined) {
  if (!dateValue) {
    return 'недавно'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'недавно'
  }

  const now = new Date()
  const diffMs = date.getTime() - now.getTime()
  const diffSeconds = Math.round(diffMs / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const rtf = new Intl.RelativeTimeFormat('ru', { numeric: 'auto' })

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second')
  }

  const diffMinutes = Math.round(diffSeconds / 60)
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day')
  }

  const diffMonths = Math.round(diffDays / 30)
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month')
  }

  const diffYears = Math.round(diffMonths / 12)
  return rtf.format(diffYears, 'year')
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

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
  const publishedRelative = formatRelativeTime(item.created_at)
  let initialIsFavorite = false

  if (user?.id) {
    const { data: favoriteRow } = await (supabase.from('favorites') as any)
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', item.id)
      .maybeSingle()
    initialIsFavorite = Boolean(favoriteRow)
  }

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
          <ItemImageGallery imageUrls={item.image_urls} title={item.title} />
        ) : (
          <ProductImagePlaceholder />
        )}
      </section>

      <section className="relative z-10 -mt-6 rounded-t-3xl bg-white px-4 pb-8 pt-6 shadow-[0_-10px_30px_-20px_rgba(15,23,42,0.18)]">
        <div className="flex items-center justify-between gap-3">
          <p className="text-3xl font-bold text-slate-900">{formatPrice(item.price)} ₽</p>
          <FavoriteToggle itemId={item.id} initialIsFavorite={initialIsFavorite} />
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
        <p className="mt-2 text-sm text-slate-400">Опубликовано {publishedRelative}</p>

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
              <img
                src={sellerAvatarUrl}
                alt={sellerName}
                className="h-14 w-14 rounded-full object-cover"
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

        <QuickQuestionsSection itemId={item.id} sellerId={item.seller_id} />
      </section>

      <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white px-4 py-4 pb-safe md:bottom-0">
        <StartConversationButton itemId={item.id} sellerId={item.seller_id} />
      </div>
    </main>
  )
}
