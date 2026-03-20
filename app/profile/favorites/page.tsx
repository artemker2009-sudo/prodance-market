'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Heart } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'
import { PremiumItemCard } from '../components/PremiumItemCard'

type Item = {
  id: string
  title: string
  price: number
  image_url: string | null
  size: string | null
  gender: string | null
  category: string | null
  description: string | null
}

type FavoriteRecord = {
  id: string
  item_id: string
}

export default function FavoritesPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const [items, setItems] = useState<Item[]>([])
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loadingItems, setLoadingItems] = useState(true)
  const [removingId, setRemovingId] = useState('')

  useEffect(() => {
    if (loading || user) {
      return
    }

    router.replace('/login')
  }, [loading, router, user])

  useEffect(() => {
    if (!user?.id) {
      return
    }

    let active = true

    const loadFavorites = async () => {
      setLoadingItems(true)
      setError('')

      const { data: favoritesData, error: favoritesError } = await (supabase.from(
        'favorites'
      ) as any)
        .select('id, item_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (favoritesError) {
        setError(favoritesError.message)
        setItems([])
        setFavoriteIds([])
        setLoadingItems(false)
        return
      }

      const favoriteRows = (favoritesData ?? []) as FavoriteRecord[]
      const itemIds = favoriteRows.map((row) => row.item_id)
      setFavoriteIds(itemIds)

      if (!itemIds.length) {
        setItems([])
        setLoadingItems(false)
        return
      }

      const { data: itemsData, error: itemsError } = await (supabase.from('items') as any)
        .select('id, title, price, image_url, size, gender, category, description')
        .in('id', itemIds)

      if (!active) {
        return
      }

      if (itemsError) {
        setError(itemsError.message)
        setItems([])
        setLoadingItems(false)
        return
      }

      const mapped = new Map(
        ((itemsData ?? []) as Item[]).map((item) => [item.id, item] as const)
      )

      setItems(itemIds.map((id) => mapped.get(id)).filter(Boolean) as Item[])
      setLoadingItems(false)
    }

    void loadFavorites()

    return () => {
      active = false
    }
  }, [user?.id])

  const handleRemoveFromFavorites = async (itemId: string) => {
    if (!user?.id) {
      return
    }

    setRemovingId(itemId)
    setError('')

    const { error: deleteError } = await (supabase.from('favorites') as any)
      .delete()
      .eq('user_id', user.id)
      .eq('item_id', itemId)

    setRemovingId('')

    if (deleteError) {
      setError(deleteError.message)
      return
    }

    setFavoriteIds((prev) => prev.filter((id) => id !== itemId))
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const hasItems = useMemo(() => items.length > 0, [items.length])

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-0">
        <p className="text-sm text-slate-500">Загрузка избранного...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-5 pb-28 text-slate-950">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-5 flex items-center gap-3">
          <Link
            href="/profile"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Назад в профиль"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Избранное</h1>
            <p className="text-sm text-slate-500">
              {favoriteIds.length} {favoriteIds.length === 1 ? 'товар' : 'товаров'} в подборке
            </p>
          </div>
        </header>

        {error ? (
          <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {loadingItems ? (
          <section className="rounded-[2rem] border border-slate-200/70 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
            Загружаем избранные товары...
          </section>
        ) : !hasItems ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <Heart className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-lg font-semibold text-slate-950">В избранном пока пусто</h2>
            <p className="mt-2 text-sm text-slate-500">
              Добавляйте понравившиеся товары, чтобы быстро возвращаться к ним.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {items.map((item) => (
              <PremiumItemCard
                key={item.id}
                item={item}
                href={`/item/${item.id}`}
                topRight={
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      handleRemoveFromFavorites(item.id)
                    }}
                    disabled={removingId === item.id}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-sm transition hover:bg-white disabled:opacity-60"
                    aria-label="Удалить из избранного"
                  >
                    <Heart className="h-4 w-4 fill-current" />
                  </button>
                }
              />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
