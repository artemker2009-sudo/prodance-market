'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Loader2, Star } from 'lucide-react'
import { FormEvent, useEffect, useMemo, useState } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../lib/auth-routing'
import { supabase } from '../../lib/supabase'

export default function NewReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { session, loading } = useAuth()
  const user = session?.user ?? null

  const sellerId = searchParams.get('seller_id')?.trim() ?? ''
  const itemId = searchParams.get('item_id')?.trim() ?? ''

  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  const toast = useMemo(
    () => ({
      success: (message: string) => setToastMessage(message),
    }),
    []
  )

  useEffect(() => {
    if (loading || user) {
      return
    }

    const redirectTarget = `/reviews/new?seller_id=${encodeURIComponent(sellerId)}&item_id=${encodeURIComponent(itemId)}`
    router.replace(buildLoginRedirectHref(redirectTarget))
  }, [itemId, loading, router, sellerId, user])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2400)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!user?.id) {
      setError('Нужно войти в аккаунт')
      return
    }

    if (!sellerId || !itemId) {
      setError('Не удалось определить продавца или объявление')
      return
    }

    if (sellerId === user.id) {
      setError('Нельзя оставить отзыв самому себе')
      return
    }

    if (rating < 1 || rating > 5) {
      setError('Выберите рейтинг от 1 до 5')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        reviewer_id: user.id,
        seller_id: sellerId,
        item_id: itemId,
        rating,
        comment: comment.trim(),
      }

      const { error: insertError } = await (supabase.from('reviews') as any).insert(payload)
      if (insertError) {
        throw insertError
      }

      toast.success('Отзыв опубликован')
      window.setTimeout(() => {
        router.back()
      }, 700)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось опубликовать отзыв')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4">
        <p className="text-sm text-slate-500">Загрузка...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 pb-20 pt-4 text-slate-950">
      <section className="mx-auto w-full max-w-md">
        <header className="mb-4 flex items-center gap-3">
          <Link
            href="/messages"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Оставить отзыв</h1>
        </header>

        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-800">Оценка</p>
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1
                  const isActive = (hoveredRating || rating) >= value
                  return (
                    <button
                      key={`rating-star-${value}`}
                      type="button"
                      onMouseEnter={() => setHoveredRating(value)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(value)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md transition hover:bg-amber-50"
                      aria-label={`Оценка ${value}`}
                    >
                      <Star
                        className={`h-6 w-6 ${isActive ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
                      />
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label htmlFor="review-comment" className="text-sm font-medium text-slate-800">
                Комментарий
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                rows={5}
                placeholder="Расскажите о продавце и сделке"
                className="mt-2 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </div>

            {error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-medium text-white transition disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>Опубликовать</span>
            </button>
          </form>
        </section>
      </section>

      {toastMessage ? (
        <div className="fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white shadow-lg">
          {toastMessage}
        </div>
      ) : null}
    </main>
  )
}
