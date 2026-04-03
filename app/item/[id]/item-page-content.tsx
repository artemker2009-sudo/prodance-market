'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Flag,
  Heart,
  List,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  SendHorizontal,
  Share2,
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
const quickQuestions = ['Ещё продаёте?', 'Торг уместен?', 'Когда можно посмотреть?', 'Пришлёте видео?'] as const

function ProductImagePlaceholder() {
  return (
    <div className="relative h-[70vh] min-h-[65vh] w-full overflow-hidden rounded-t-[32px] bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200">
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
  const [askMessage, setAskMessage] = useState('')
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

  const mapUrl = useMemo(() => {
    if (
      typeof item.latitude === 'number' &&
      Number.isFinite(item.latitude) &&
      typeof item.longitude === 'number' &&
      Number.isFinite(item.longitude)
    ) {
      return `https://yandex.ru/maps/?ll=${item.longitude},${item.latitude}&z=16&pt=${item.longitude},${item.latitude},pm2rdm`
    }

    if (item.address.trim()) {
      return `https://yandex.ru/maps/?text=${encodeURIComponent(item.address)}`
    }

    return null
  }, [item.address, item.latitude, item.longitude])

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

  const handleAskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void handleMessageClick()
    setAskMessage('')
  }

  const handleQuickQuestionClick = () => {
    void handleMessageClick()
  }

  return (
    <main className="min-h-screen bg-white pb-44 text-slate-900">
      <div className="mx-auto w-full max-w-[480px]">
        <section className="relative">
          {item.imageUrls.length > 0 ? (
            <ItemImageGallery imageUrls={item.imageUrls} title={item.title} />
          ) : (
            <ProductImagePlaceholder />
          )}

          <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-3 pt-[calc(env(safe-area-inset-top)+8px)]">
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
                className="pointer-events-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                aria-label="Назад"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="pointer-events-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Поделиться"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.success('Списки появятся в следующем обновлении')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Добавить в список"
                >
                  <List className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => toast.success('Избранное появится в следующем обновлении')}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="В избранное"
                >
                  <Heart className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenReportModal}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur"
                  aria-label="Пожаловаться"
                >
                  <Flag className="h-5 w-5" />
                </button>
              </div>
            </div>
          </header>
        </section>

        <section className="space-y-6 p-4">
          <div>
            <p className="text-3xl font-extrabold">{new Intl.NumberFormat('ru-RU').format(item.price)} ₽</p>
            <h1 className="mt-2 text-lg text-slate-900">{item.title}</h1>
          </div>

          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              {seller.avatarUrl ? (
                <img
                  src={seller.avatarUrl}
                  alt={`Аватар продавца ${seller.name || 'Собственник'}`}
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : null}
              <p className="text-2xl font-bold text-slate-900">{seller.name || 'Собственник'}</p>
            </div>
          </div>

          {!isOwnItem ? (
            <div className="grid grid-cols-2 gap-3">
              {seller.phone ? (
                <a
                  href={`tel:${seller.phone}`}
                  className="inline-flex items-center justify-center rounded-xl bg-[#00AA5B] py-3 font-semibold text-white"
                >
                  Позвонить
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-xl bg-slate-300 py-3 font-semibold text-slate-600"
                >
                  Позвонить
                </button>
              )}
              <button
                type="button"
                onClick={() => void handleMessageClick()}
                disabled={isMessageLoading || !item.sellerId}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00AAFF] py-3 font-semibold text-white disabled:opacity-60"
              >
                {isMessageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Написать</span>
              </button>
            </div>
          ) : null}

          <div className="space-y-2 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="h-4 w-4 text-red-500" />
              <p className="text-sm">
                {item.address}
              </p>
            </div>
            {mapUrl ? (
              <a
                href={mapUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-[#00AAFF]"
              >
                Показать на карте
              </a>
            ) : null}
          </div>

          <div className="space-y-3 border-b border-slate-100 pb-5">
            <h2 className="text-2xl font-bold">Описание</h2>
            <p className="whitespace-pre-wrap text-base text-slate-800">{item.description}</p>
          </div>

          {!isOwnItem ? (
            <div className="pb-6">
              <h2 className="mb-4 text-2xl font-bold">Спросите у продавца</h2>
              <form onSubmit={handleAskSubmit}>
                <div className="flex items-center rounded-xl bg-slate-100 px-4 py-3">
                  <input
                    value={askMessage}
                    onChange={(event) => setAskMessage(event.target.value)}
                    placeholder="Здравствуйте!"
                    className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isMessageLoading || !item.sellerId}
                    className="inline-flex h-8 w-8 items-center justify-center text-slate-500 disabled:opacity-60"
                    aria-label="Отправить сообщение продавцу"
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </form>

              <div className="mt-3 flex flex-wrap gap-2">
                {quickQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={handleQuickQuestionClick}
                    disabled={isMessageLoading || !item.sellerId}
                    className="rounded-full bg-[#1A1A1A] px-4 py-2 text-sm text-white disabled:opacity-60"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {!isOwnItem ? (
        <div className="fixed bottom-0 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[0_-6px_24px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-2 gap-3">
            {seller.phone ? (
              <a
                href={`tel:${seller.phone}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#00AA5B] text-sm font-semibold text-white"
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
            <button
              type="button"
              onClick={() => void handleMessageClick()}
              disabled={isMessageLoading || !item.sellerId}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#00AAFF] text-sm font-semibold text-white disabled:opacity-60"
            >
              {isMessageLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              <span>Написать</span>
            </button>
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
