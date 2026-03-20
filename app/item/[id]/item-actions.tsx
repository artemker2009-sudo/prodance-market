'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Heart, Loader2 } from 'lucide-react'

import { useAuth } from '../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../lib/auth-routing'
import { supabase } from '../../lib/supabase'

export function FavoriteToggle({ itemId }: { itemId: string }) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [isFavorite, setIsFavorite] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setIsFavorite(false)
      return
    }

    let active = true

    const loadFavorite = async () => {
      const { data } = await (supabase.from('favorites') as any)
        .select('id')
        .eq('user_id', userId)
        .eq('item_id', itemId)
        .maybeSingle()

      if (active) {
        setIsFavorite(Boolean(data))
      }
    }

    void loadFavorite()

    return () => {
      active = false
    }
  }, [itemId, userId])

  const handleToggle = async () => {
    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`))
      return
    }

    setIsLoading(true)

    if (isFavorite) {
      const { error } = await (supabase.from('favorites') as any)
        .delete()
        .eq('user_id', userId)
        .eq('item_id', itemId)

      if (!error) {
        setIsFavorite(false)
      }
      setIsLoading(false)
      return
    }

    const { error } = await (supabase.from('favorites') as any).insert({
      user_id: userId,
      item_id: itemId,
    })

    if (!error) {
      setIsFavorite(true)
    }
    setIsLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:text-rose-500 disabled:opacity-60"
      aria-label={isFavorite ? 'Убрать из избранного' : 'Добавить в избранное'}
    >
      <Heart className={`h-5 w-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
    </button>
  )
}

export function StartConversationButton({
  itemId,
  sellerId,
}: {
  itemId: string
  sellerId: string | null
}) {
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id ?? null
  const [isLoading, setIsLoading] = useState(false)

  const handleStartConversation = async () => {
    if (!userId) {
      router.push(buildLoginRedirectHref(`/item/${itemId}`))
      return
    }

    if (!sellerId || sellerId === userId) {
      return
    }

    setIsLoading(true)

    const { data: existing } = await (supabase.from('conversations') as any)
      .select('id')
      .eq('item_id', itemId)
      .eq('buyer_id', userId)
      .eq('seller_id', sellerId)
      .maybeSingle()

    if (existing?.id) {
      setIsLoading(false)
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data: created, error } = await (supabase.from('conversations') as any)
      .insert({
        item_id: itemId,
        buyer_id: userId,
        seller_id: sellerId,
      })
      .select('id')
      .single()

    setIsLoading(false)

    if (!error && created?.id) {
      router.push(`/messages/${created.id}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleStartConversation}
      disabled={isLoading || !sellerId || sellerId === userId}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 text-base font-semibold text-white disabled:opacity-60"
    >
      {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      <span>
        {sellerId === userId ? 'Это ваше объявление' : 'Написать продавцу'}
      </span>
    </button>
  )
}
