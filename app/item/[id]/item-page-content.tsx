'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ChevronRight,
  Flag,
  Loader2,
  MessageCircle,
  Phone,
  Share2,
  Star,
} from 'lucide-react'

import { useAuth } from '../../components/AuthProvider'
import { buildLoginRedirectHref } from '../../lib/auth-routing'
import { supabase } from '../../lib/supabase'
import { ItemImageGallery } from './item-image-gallery'

type ItemPageContentProps = {
  item: {
    id: string
    title: string
    price: number
    imageUrls: string[]
    createdAtText: string
    description: string
    category: string
    gender: string
    size: string
    condition: string
    address: string
    latitude: number | null
    longitude: number | null
    sellerId: string | null
  }
  seller: {
    id: string | null
    name: string
    avatarUrl: string | null
    phone: string | null
  }
}

const reportReasons = ['Мошенничество', 'Спам', 'Товар продан', 'Другое'] as const

function ProductImagePlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 md:aspect-video">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_45%),linear-gradient(180deg,rgba(255,255,255,0.3),rgba(226,232,240,0.9))]" />
      <div className="absolute inset-x-8 top-8 h-20 rounded-full bg-white/60 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-28 items-end justify-center pb-8">
        <div className="h-28 w-20 rounded-t-[999px] bg-white/70" />
      </div>
    </div>
  )
}

export function ItemPageContent({ item, seller }: ItemPageContentProps) {
  const router = useRouter()
  const { session } = useAuth()
  const currentUserId = session?.user?.id ?? null
  const isOwnItem = currentUserId && item.sellerId ? currentUserId === item.sellerId : false

  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<(typeof reportReasons)[number]>('Мошенничество')
  const [isReporting, setIsReporting] = useState(false)
  const [isMessageLoading, setIsMessageLoading] = useState(false)
  const [toastMessage, setToastMessage] = useState('')
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success')

  const toast = useMemo(
    () => ({
      success: (message: string) => {
        setToastTone('success')
        setToastMessage(message)
        window.setTimeout(() => {
          setToastMessage('')
        }, 2500)
      },
      error: (message: string) => {
        setToastTone('error')
        setToastMessage(message)
        window.setTimeout(() => {
          setToastMessage('')
        }, 3000)
      },
    }),
    []
  )

  const mapImageUrl = useMemo(() => {
    if (
      typeof item.latitude !== 'number' ||
      !Number.isFinite(item.latitude) ||
      typeof item.longitude !== 'number' ||
      !Number.isFinite(item.longitude)
    ) {
      return null
    }

    return `https://static-maps.yandex.ru/1.x/?lang=ru_RU&ll=${item.longitude},${item.latitude}&z=15&size=650,260&l=map&pt=${item.longitude},${item.latitude},pm2rdm`
  }, [item.latitude, item.longitude])

  const handleShare = async () => {
    const shareUrl = window.location.href

    try {
      if (navigator.share) {
        await navigator.share({
          title: item.title,
          url: shareUrl,
        })
        return
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Ссылка скопирована')
      }
    } catch {
      // Пользователь мог закрыть системный диалог share.
    }
  }

  const handleOpenReportModal = () => {
    if (!currentUserId) {
      router.push(buildLoginRedirectHref(`/item/${item.id}`, { reason: 'report' }))
      return
    }

    setIsReportModalOpen(true)
  }

  const handleSendReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!currentUserId) {
      router.push(buildLoginRedirectHref(`/item/${item.id}`, { reason: 'report' }))
      return
    }

    setIsReporting(true)

    const { error } = await (supabase.from('item_reports') as any).insert({
      item_id: item.id,
      reporter_id: currentUserId,
      reason: selectedReason,
    })

    setIsReporting(false)

    if (error) {
      toast.error(error.message || 'Не удалось отправить жалобу')
      return
    }

    setIsReportModalOpen(false)
    toast.success('Жалоба отправлена')
  }

  const handleMessageClick = async () => {
    if (!currentUserId) {
      router.push(buildLoginRedirectHref(`/item/${item.id}`, { reason: 'message' }))
      return
    }

    if (!item.sellerId || item.sellerId === currentUserId) {
      return
    }

    setIsMessageLoading(true)

    const { data: existing } = await (supabase.from('conversations') as any)
      .select('id')
      .eq('item_id', item.id)
      .eq('buyer_id', currentUserId)
      .eq('seller_id', item.sellerId)
      .maybeSingle()

    if (existing?.id) {
      setIsMessageLoading(false)
      router.push(`/messages/${existing.id}`)
      return
    }

    const { data: created, error } = await (supabase.from('conversations') as any)
      .insert({
        item_id: item.id,
        buyer_id: currentUserId,
        seller_id: item.sellerId,
      })
      .select('id')
      .single()

    setIsMessageLoading(false)

    if (!error && created?.id) {
      router.push(`/messages/${created.id}`)
      return
    }

    toast.error(error?.message || 'Не удалось открыть чат')
  }

  return (
    <main className="min-h-screen bg-white pb-40 text-slate-900">
      <header className="fixed left-1/2 top-0 z-50 w-full max-w-[480px] -translate-x-1/2 border-b border-slate-200/70 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                router.back()
                return
              }
              router.push('/')
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
            aria-label="Назад"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void handleShare()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              aria-label="Поделиться"
            >
              <Share2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleOpenReportModal}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700"
              aria-label="Пожаловаться"
            >
              <Flag className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[480px] pt-[72px]">
        <section className="bg-white">
          {item.imageUrls.length > 0 ? (
            <ItemImageGallery imageUrls={item.imageUrls} title={item.title} />
          ) : (
            <ProductImagePlaceholder />
          )}
        </section>

        <section className="space-y-4 p-4">
          <div>
            <p className="text-3xl font-bold">{new Intl.NumberFormat('ru-RU').format(item.price)} ₽</p>
            <h1 className="mt-2 text-lg font-normal text-gray-700">{item.title}</h1>
            <p className="mt-2 text-sm text-gray-500">{item.createdAtText}</p>
          </div>

          <hr className="border-slate-200" />

          <div>
            <h2 className="mb-3 text-lg font-semibold">Характеристики</h2>
            <ul className="space-y-3">
              {[
                { label: 'Категория', value: item.category },
                { label: 'Пол', value: item.gender },
                { label: 'Размер', value: item.size },
                { label: 'Состояние', value: item.condition },
              ].map((spec) => (
                <li key={spec.label} className="grid grid-cols-2 items-start gap-4">
                  <span className="text-sm text-slate-500">{spec.label}</span>
                  <span className="text-right text-sm font-semibold text-slate-900">{spec.value}</span>
                </li>
              ))}
            </ul>
          </div>

          <hr className="border-slate-200" />

          <div>
            <h2 className="mb-3 text-lg font-semibold">Описание</h2>
            <p className="whitespace-pre-wrap text-base text-gray-800">{item.description}</p>
          </div>

          <hr className="border-slate-200" />

          <div>
            <h2 className="mb-3 text-lg font-semibold">Место встречи</h2>
            <p className="text-sm text-slate-700">{item.address}</p>
            {mapImageUrl ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
                <Image
                  src={mapImageUrl}
                  alt={`Карта: ${item.address}`}
                  width={650}
                  height={260}
                  className="h-auto w-full object-cover"
                  unoptimized
                />
              </div>
            ) : null}
          </div>

          <Link
            href={item.sellerId ? `/profile/${item.sellerId}` : '#'}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3"
          >
            <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-lg font-semibold text-slate-700">
              {seller.avatarUrl ? (
                <Image
                  src={seller.avatarUrl}
                  alt={seller.name}
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-full object-cover"
                  unoptimized
                />
              ) : (
                <span>{seller.name.charAt(0).toUpperCase() || 'П'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold text-slate-900">{seller.name}</p>
              <div className="mt-1 flex items-center gap-0.5 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 fill-current" />
                <Star className="h-4 w-4 text-amber-200" />
                <span className="ml-2 text-xs text-slate-500">Рейтинг продавца</span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-slate-700">
              <span>Visit profile</span>
              <ChevronRight className="h-4 w-4" />
            </div>
          </Link>

          <hr className="border-slate-200" />
        </section>
      </div>

      {!isOwnItem ? (
        <div className="fixed bottom-[env(safe-area-inset-bottom)] left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-6px_24px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleMessageClick()}
              disabled={isMessageLoading || !item.sellerId}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isMessageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              <span>Написать</span>
            </button>

            {seller.phone ? (
              <a
                href={`tel:${seller.phone}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white"
              >
                <Phone className="h-4 w-4" />
                <span>Позвонить</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-300 text-sm font-semibold text-slate-600"
              >
                <Phone className="h-4 w-4" />
                <span>Позвонить</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {isReportModalOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-4">
            <h3 className="text-lg font-semibold">Пожаловаться на объявление</h3>
            <form onSubmit={(event) => void handleSendReport(event)} className="mt-4 space-y-3">
              {reportReasons.map((reason) => (
                <label key={reason} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2">
                  <input
                    type="radio"
                    name="report-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm text-slate-700">{reason}</span>
                </label>
              ))}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isReporting}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isReporting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  <span>Отправить</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="pointer-events-none fixed left-1/2 bottom-24 z-[120] -translate-x-1/2">
          <div
            className={`rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg ${
              toastTone === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      ) : null}
    </main>
  )
}
