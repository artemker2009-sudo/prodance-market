'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  Headphones,
  LogOut,
  MapPin,
  Settings2,
  Sparkles,
} from 'lucide-react'

import { useAuth } from '../components/AuthProvider'
import { supabase, waitForSupabaseSession } from '../lib/supabase'
import { PremiumItemCard } from './components/PremiumItemCard'

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  size: string | null
  gender: string | null
  category: string | null
  description: string | null
}

type Review = {
  id: string
  rating: number | null
  comment: string | null
  created_at: string | null
}

const tabs = [
  { key: 'my', label: 'Мои объявления' },
  { key: 'favorites', label: 'Избранное' },
] as const

const menuItems = [
  { key: 'settings', label: 'Настройки аккаунта', icon: Settings2 },
  { key: 'support', label: 'Служба поддержки', icon: Headphones },
  { key: 'notifications', label: 'Уведомления', icon: Bell },
] as const

export default function ProfilePage() {
  const router = useRouter()
  const { session, profile, loading } = useAuth()
  const [error, setError] = useState('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('my')
  const [myItems, setMyItems] = useState<Item[]>([])
  const [favoriteItems, setFavoriteItems] = useState<Item[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [stats, setStats] = useState({
    published: 0,
    favorites: 0,
    sold: 0,
  })
  const [toastMessage, setToastMessage] = useState('')
  const [isSupportOpen, setIsSupportOpen] = useState(false)
  const [supportMessage, setSupportMessage] = useState('')
  const [isSendingSupport, setIsSendingSupport] = useState(false)
  const user = session?.user ?? null
  const avatarUrl =
    typeof (profile as { avatar_url?: string | null } | null)?.avatar_url === 'string'
      ? ((profile as { avatar_url?: string | null }).avatar_url ?? '')
      : typeof user?.user_metadata?.avatar_url === 'string'
        ? user.user_metadata.avatar_url
        : ''
  const displayPhone = useMemo(() => {
    const phoneFromEmail = user?.email?.endsWith('@prodance.app')
      ? user.email.replace('@prodance.app', '')
      : ''

    return user?.phone || phoneFromEmail
  }, [user])
  const maskedPhone = useMemo(() => {
    const digits = displayPhone.replace(/\D/g, '')

    if (digits.length < 4) {
      return '+7 *** *** ** **'
    }

    const tail = digits.slice(-4)

    return `+7 *** *** ${tail.slice(0, 2)} ${tail.slice(2)}`
  }, [displayPhone])
  const city = useMemo(() => {
    if (typeof profile?.city === 'string' && profile.city.trim()) {
      return profile.city.trim()
    }

    return typeof user?.user_metadata?.city === 'string' && user.user_metadata.city.trim()
      ? user.user_metadata.city.trim()
      : 'Город не указан'
  }, [profile?.city, user])
  const displayName = useMemo(() => {
    if (typeof user?.user_metadata?.name === 'string' && user.user_metadata.name.trim()) {
      return user.user_metadata.name.trim()
    }

    return 'Профиль'
  }, [user])
  const initial = displayName[0]?.toUpperCase() ?? 'P'
  const ratedReviews = useMemo(
    () => reviews.filter((review) => typeof review.rating === 'number'),
    [reviews]
  )
  const averageRating = useMemo(() => {
    if (!ratedReviews.length) {
      return null
    }

    const total = ratedReviews.reduce((sum, review) => sum + (review.rating ?? 0), 0)
    return Number((total / ratedReviews.length).toFixed(1))
  }, [ratedReviews])

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace('/login')
    router.refresh()
  }, [loading, router, user])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true

    const loadStats = async () => {
      const [publishedResult, favoritesResult, soldResult] = await Promise.all([
        (supabase.from('items') as any)
          .select('id', { head: true, count: 'exact' })
          .eq('seller_id', user.id),
        (supabase.from('favorites') as any)
          .select('id', { head: true, count: 'exact' })
          .eq('user_id', user.id),
        (supabase.from('items') as any)
          .select('id', { head: true, count: 'exact' })
          .eq('seller_id', user.id)
          .in('status', ['sold', 'продано']),
      ])

      if (!active) {
        return
      }

      setStats({
        published: publishedResult.count ?? 0,
        favorites: favoritesResult.count ?? 0,
        sold: soldResult.count ?? 0,
      })
    }

    void loadStats()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true

    const loadReviews = async () => {
      setLoadingReviews(true)

      const { data, error: reviewsError } = await (supabase.from('reviews') as any)
        .select('id, rating, comment, created_at')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (reviewsError) {
        setError(reviewsError.message)
        setReviews([])
        setLoadingReviews(false)
        return
      }

      setReviews((data ?? []) as Review[])
      setLoadingReviews(false)
    }

    void loadReviews()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true

    const loadItems = async () => {
      setLoadingItems(true)

      const [{ data: myRows, error: myError }, { data: favoriteRows, error: favoriteError }] =
        await Promise.all([
          (supabase.from('items') as any)
            .select('id, title, price, image_urls, size, gender, category, description')
            .eq('seller_id', user.id)
            .order('created_at', { ascending: false }),
          (supabase.from('favorites') as any)
            .select('item_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
        ])

      if (!active) {
        return
      }

      if (myError || favoriteError) {
        setError(myError?.message ?? favoriteError?.message ?? 'Не удалось загрузить карточки')
        setMyItems([])
        setFavoriteItems([])
        setLoadingItems(false)
        return
      }

      setMyItems((myRows ?? []) as Item[])
      const itemIds = ((favoriteRows ?? []) as Array<{ item_id: string }>).map((row) => row.item_id)

      if (!itemIds.length) {
        setFavoriteItems([])
        setLoadingItems(false)
        return
      }

      const { data: favoriteItemsRows, error: favoriteItemsError } = await (supabase.from(
        'items'
      ) as any)
        .select('id, title, price, image_urls, size, gender, category, description')
        .in('id', itemIds)

      if (!active) {
        return
      }

      if (favoriteItemsError) {
        setError(favoriteItemsError.message)
        setFavoriteItems([])
        setLoadingItems(false)
        return
      }

      const byId = new Map(((favoriteItemsRows ?? []) as Item[]).map((item) => [item.id, item] as const))
      setFavoriteItems(itemIds.map((id) => byId.get(id)).filter(Boolean) as Item[])
      setLoadingItems(false)
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 3200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleMenuClick = (item: (typeof menuItems)[number]) => {
    if (item.key === 'support') {
      setIsSupportOpen(true)
      return
    }
    if (item.key === 'notifications') {
      setToastMessage('Уведомления в разработке')
      return
    }
  }

  const handleSupportSubmit = async () => {
    const message = supportMessage.trim()

    if (!message) {
      return
    }

    setIsSendingSupport(true)
    setError('')

    const { error: insertError } = await (supabase.from('support_tickets') as any).insert({
      user_id: user.id,
      message,
    })

    setIsSendingSupport(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    setSupportMessage('')
    setIsSupportOpen(false)
    alert('Сообщение отправлено, спасибо!')
  }

  const handleSignOut = async () => {
    setError('')
    setIsSigningOut(true)

    const { error: signOutError } = await supabase.auth.signOut()

    if (signOutError) {
      setIsSigningOut(false)
      setError(signOutError.message)
      return
    }

    await waitForSupabaseSession('signed-out')
    router.replace('/login')
    router.refresh()
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-0">
        <p className="text-sm text-slate-500">Загрузка профиля...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-6 pb-28 text-slate-950 md:pb-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5">
        <section className="rounded-[2rem] border border-slate-200/70 bg-white px-6 py-8 text-center shadow-sm">
          <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Аватар профиля"
                width={112}
                height={112}
                className="h-full w-full object-cover"
                sizes="112px"
                unoptimized
              />
            ) : (
              <span className="text-4xl font-semibold text-slate-500">{initial}</span>
            )}
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight text-slate-950">{displayName}</h1>
          <p className="mt-2 text-base font-medium text-slate-950">{maskedPhone}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#faf7f3] px-4 py-2 text-sm text-slate-500">
            <MapPin className="h-4 w-4" />
            <span>{city}</span>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-3 divide-x divide-slate-200/70">
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">{stats.published}</p>
              <p className="mt-1 text-xs text-slate-500">Опубликовано</p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">{stats.favorites}</p>
              <p className="mt-1 text-xs text-slate-500">В избранном</p>
            </div>
            <div className="px-3 py-2 text-center">
              <p className="text-2xl font-bold tracking-tight text-slate-950">{stats.sold}</p>
              <p className="mt-1 text-xs text-slate-500">Продано</p>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`h-11 rounded-2xl text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? 'bg-slate-950 text-white'
                    : 'bg-[#faf7f3] text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </section>

        {loadingItems ? (
          <section className="rounded-[2rem] border border-slate-200/70 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
            Загружаем подборку...
          </section>
        ) : (
          <section className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm">
            {activeTab === 'my' ? (
              myItems.length ? (
                <div className="grid grid-cols-2 gap-3">
                  {myItems.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <PremiumItemCard item={item} href={`/item/${item.id}`} />
                      <Link
                        href={`/item/${item.id}`}
                        className="inline-flex h-9 w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        Управлять
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-slate-500">У вас пока нет объявлений</p>
              )
            ) : favoriteItems.length ? (
              <div className="grid grid-cols-2 gap-3">
                {favoriteItems.map((item) => (
                  <PremiumItemCard
                    key={item.id}
                    item={item}
                    href={`/item/${item.id}`}
                    initialIsFavorite
                  />
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">Избранное пока пусто</p>
            )}
          </section>
        )}

        <section className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white shadow-sm">
          <ul className="divide-y divide-slate-200/70">
            {menuItems.map((item) => {
              const Icon = item.icon
              const content = (
                <>
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#faf7f3] text-slate-700">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="min-w-0 flex-1 text-[15px] font-medium text-slate-950">
                    {item.label}
                  </span>
                  <Sparkles className="h-4 w-4 text-slate-300" />
                </>
              )
              return (
                <li key={item.key}>
                  {item.key === 'settings' ? (
                    <Link
                      href="/profile/settings"
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleMenuClick(item)}
                      className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                    >
                      {content}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-950">Отзывы о вас</h2>
          {loadingReviews ? (
            <p className="mt-3 rounded-[1.5rem] bg-[#faf7f3] px-4 py-3 text-sm text-slate-500">Загружаем отзывы...</p>
          ) : reviews.length ? (
            <div className="mt-3 space-y-3">
              {averageRating !== null ? (
                <p className="rounded-[1.5rem] bg-[#faf7f3] px-4 py-3 text-sm text-slate-700">
                  Средняя оценка: {averageRating.toFixed(1)} ({ratedReviews.length})
                </p>
              ) : null}
              {reviews.map((review) => (
                <article key={review.id} className="rounded-[1.5rem] border border-slate-200/70 bg-[#faf7f3] px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">
                    Оценка:{' '}
                    {typeof review.rating === 'number' ? review.rating.toFixed(1) : 'Без оценки'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {review.comment?.trim() ? review.comment : 'Пользователь не оставил комментарий.'}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-[1.5rem] bg-[#faf7f3] px-4 py-3 text-sm text-slate-500">
              У этого пользователя пока нет отзывов.
            </p>
          )}

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[1.5rem] bg-slate-950 px-5 text-base font-semibold text-white shadow-sm disabled:opacity-60"
          >
            <LogOut className="h-5 w-5" />
            <span>{isSigningOut ? 'Выходим...' : 'Выйти'}</span>
          </button>
        </section>
      </div>
      {toastMessage ? (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-900/10">
            {toastMessage}
          </div>
        </div>
      ) : null}
      {isSupportOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/25 px-4 pb-20 pt-8 md:items-center md:pb-8">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-200/70 bg-white p-5 shadow-2xl shadow-slate-900/20">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-slate-950">Служба поддержки</h2>
                <p className="mt-1 text-sm text-slate-500">Опишите проблему, и мы ответим вам как можно скорее.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsSupportOpen(false)}
                className="rounded-full bg-[#faf7f3] px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
              >
                Закрыть
              </button>
            </div>

            <textarea
              value={supportMessage}
              onChange={(event) => setSupportMessage(event.target.value)}
              placeholder="Например: не открывается чат с продавцом..."
              className="h-36 w-full resize-none rounded-2xl border border-slate-200 bg-[#faf7f3] px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-400"
            />

            <button
              type="button"
              onClick={handleSupportSubmit}
              disabled={isSendingSupport || !supportMessage.trim()}
              className="mt-4 h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isSendingSupport ? 'Отправляем...' : 'Отправить'}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}
