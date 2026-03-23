import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, BadgeCheck, MapPin, Star } from 'lucide-react'

import { createSupabaseServerClient } from '../../lib/supabase-server'
import {
  FavoriteToggle,
  OwnerListingActions,
  QuickQuestionsSection,
  SellerContactButtons,
  ShareItemButton,
} from './item-actions'
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
  address: string | null
  latitude: number | null
  longitude: number | null
  is_active: boolean | null
  archive_reason: string | null
}

type SellerProfile = {
  id: string
  name: string | null
  avatar_url: string | null
  city: string | null
  created_at: string
}

type ReviewRating = {
  rating: number | null
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function getReviewWord(count: number) {
  const mod100 = count % 100
  if (mod100 >= 11 && mod100 <= 14) {
    return 'отзывов'
  }

  const mod10 = count % 10
  if (mod10 === 1) {
    return 'отзыв'
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'отзыва'
  }

  return 'отзывов'
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
  let sellerReviews: ReviewRating[] = []
  if (item?.seller_id) {
    const { data: seller, error: sellerError } = await (supabase.from('profiles') as any)
      .select('*')
      .eq('id', item.seller_id)
      .single()

    if (sellerError && sellerError.code !== 'PGRST116') {
      throw new Error(sellerError.message)
    }

    sellerProfile = (seller as SellerProfile | null) ?? null

    const { data: reviews, error: reviewsError } = await (supabase.from('reviews') as any)
      .select('rating')
      .eq('seller_id', item.seller_id)

    if (reviewsError) {
      throw new Error(reviewsError.message)
    }

    sellerReviews = ((reviews ?? []) as ReviewRating[]).filter(
      (review) => typeof review.rating === 'number'
    )
  }

  const sellerName = sellerProfile?.name?.trim() || 'Продавец'
  const registrationYear = getRegistrationYear(sellerProfile?.created_at)
  const sellerAvatarUrl = sellerProfile?.avatar_url?.trim() || null
  const sellerAvatarLetter = sellerName.charAt(0).toUpperCase()
  const sellerProfileHref = item.seller_id ? `/user/${item.seller_id}` : '#'
  const sellerReviewsHref = item.seller_id ? `/profile/${item.seller_id}/reviews` : '#'
  const reviewsCount = sellerReviews.length
  const averageRating =
    reviewsCount > 0
      ? Number(
          (sellerReviews.reduce((total, review) => total + (review.rating ?? 0), 0) / reviewsCount).toFixed(1)
        )
      : null
  const publishedRelative = formatRelativeTime(item.created_at)
  const hasCoordinates =
    typeof item.latitude === 'number' &&
    Number.isFinite(item.latitude) &&
    typeof item.longitude === 'number' &&
    Number.isFinite(item.longitude)
  const itemAddress = item.address?.trim() || null
  const location = itemAddress || sellerProfile?.city?.trim() || 'Место не указано'
  const mapHref = hasCoordinates
    ? `https://yandex.ru/maps/?pt=${item.longitude},${item.latitude}&z=16&l=map`
    : location !== 'Место не указано'
      ? `https://yandex.ru/maps/?text=${encodeURIComponent(location)}`
      : null
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
    <main className="min-h-screen bg-[#f6f7fb] pb-16 text-slate-950">
      <section className="mx-auto w-full max-w-[720px] space-y-4 px-4 pb-10 pt-4">
        <header>
          <Link
            href="/"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-900 shadow-sm"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </header>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {item.image_urls && item.image_urls.length > 0 ? (
            <ItemImageGallery
              imageUrls={item.image_urls}
              title={item.title}
              topRightActions={
                <>
                  <ShareItemButton itemUrl={`/item/${item.id}`} />
                  <FavoriteToggle
                    itemId={item.id}
                    initialIsFavorite={initialIsFavorite}
                    className="h-10 w-10 border-0 bg-white/90 text-slate-700 shadow-sm backdrop-blur hover:text-rose-500"
                    iconClassName="h-[18px] w-[18px]"
                  />
                </>
              }
            />
          ) : (
            <ProductImagePlaceholder />
          )}
        </section>

        <section className="mt-4 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-3xl font-bold text-slate-900">{formatPrice(item.price)} ₽</p>
          <h1 className="mt-1 text-lg text-slate-800">{item.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{publishedRelative}</p>
          {item.is_active === false ? (
            <p className="mt-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Объявление снято с публикации
            </p>
          ) : null}
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Местоположение</h2>
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <p className="text-base text-slate-800">{location}</p>
              {mapHref ? (
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-sm text-blue-500 hover:underline"
                >
                  Открыть на карте
                </a>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Характеристики</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            {specs.map((spec) => (
              <li key={spec.label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-slate-500">{spec.label}</span>
                <span className="font-medium text-slate-900">{spec.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Описание</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
            {item.description || 'Продавец пока не добавил описание для этого товара.'}
          </p>
        </section>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <QuickQuestionsSection itemId={item.id} sellerId={item.seller_id} />
        </section>

        <OwnerListingActions
          itemId={item.id}
          sellerId={item.seller_id}
          initialIsActive={item.is_active !== false}
        />

        <section className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
                {sellerAvatarUrl ? (
                  <img
                    src={sellerAvatarUrl}
                    alt={sellerName}
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <span>{sellerAvatarLetter || 'П'}</span>
                )}
              </div>
              <span className="text-xs font-medium text-slate-500">Продавец</span>
            </div>

            <div className="min-w-0 flex-1">
              <Link href={sellerProfileHref} className="inline-flex items-center gap-1.5 text-slate-900">
                <span className="truncate text-lg font-semibold">{sellerName}</span>
                <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" />
              </Link>

              {item.seller_id ? (
                <Link
                  href={sellerReviewsHref}
                  className="mt-2 inline-flex items-center gap-1 text-sm hover:underline"
                >
                  {reviewsCount > 0 && averageRating !== null ? (
                    <>
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      <span className="font-medium text-slate-900">{averageRating.toFixed(1)}</span>
                      <span className="text-slate-600">
                        {reviewsCount} {getReviewWord(reviewsCount)}
                      </span>
                    </>
                  ) : (
                    <span className="text-slate-400">Нет отзывов</span>
                  )}
                </Link>
              ) : (
                <p className="mt-2 text-sm text-slate-400">Нет отзывов</p>
              )}

              <p className="mt-1 text-sm text-slate-500">На ProDance с {registrationYear ?? 'недавно'}</p>
            </div>
          </div>

          <SellerContactButtons itemId={item.id} sellerId={item.seller_id} />
        </section>
      </section>
    </main>
  )
}
