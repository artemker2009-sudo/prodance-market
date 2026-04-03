'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import { PackageOpen, Search, SlidersHorizontal, X } from 'lucide-react'

import { FavoriteToggle } from '../item/[id]/item-actions'
import { useAuth } from './AuthProvider'
import { supabase } from '../lib/supabase'

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  size: string | null
  gender: string | null
  category: string | null
  condition: string | null
}

type HomePageClientProps = {
  initialItems: Item[]
  initialFavoriteIds: string[]
  initialErrorMessage: string | null
}

type PriceFilter = 'any' | 'under30000' | 'from30000'
type ConditionFilter = 'any' | 'new' | 'used'

const stories = ['Тренды сезона', 'Новинки', 'Правила', 'Скидки', 'Коллекции', 'Бренды']
const chips = ['🔥 Все', '💃 Латина', '🤵 Стандарт', '👟 Обувь'] as const

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function ProductPlaceholder() {
  return (
    <div className="relative aspect-[3/4] overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_48%),linear-gradient(160deg,rgba(255,255,255,0.45),rgba(229,231,235,0.75))]" />
      <div className="absolute inset-x-6 top-6 h-16 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center pb-6">
        <div className="h-24 w-16 rounded-t-[999px] bg-white/60" />
      </div>
    </div>
  )
}

function getConditionBadgeText(value: string | null) {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (!normalized) {
    return 'Состояние не указано'
  }
  if (normalized.includes('нов') || normalized.includes('new')) {
    return 'Новое'
  }
  if (normalized.includes('б/у') || normalized.includes('бу') || normalized.includes('used')) {
    return 'Б/у'
  }
  return value?.trim() ?? 'Состояние не указано'
}

function ProductCard({
  item,
  initialIsFavorite,
}: {
  item: Item
  initialIsFavorite: boolean
}) {
  const previewImage = item.image_urls?.[0] ?? null

  return (
    <div className="relative">
      <Link
        href={`/item/${item.id}`}
        className="block rounded-[1.5rem] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2"
      >
        <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-100 bg-white shadow-[0_22px_44px_-32px_rgba(15,23,42,0.28)]">
          <div className="relative">
            {previewImage ? (
              <div className="relative aspect-[3/4] w-full bg-slate-100">
                <Image
                  src={previewImage}
                  alt={item.title}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <ProductPlaceholder />
            )}
          </div>
          <div className="flex min-h-[94px] flex-col px-3 pb-4 pt-3 sm:px-4">
            <p className="text-2xl font-bold text-slate-900">{formatPrice(item.price)} ₽</p>
            <span className="mt-1 inline-flex w-fit rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
              {getConditionBadgeText(item.condition)}
            </span>
            <h2 className="mt-2 line-clamp-1 text-sm font-semibold leading-5 text-gray-800 sm:text-base">
              {item.title}
            </h2>
          </div>
        </article>
      </Link>
      <div className="absolute right-2 top-2 z-10">
        <div className="inline-flex rounded-full border border-white/20 bg-white/20 p-0.5 backdrop-blur-sm">
          <FavoriteToggle
            itemId={item.id}
            initialIsFavorite={initialIsFavorite}
            className="h-10 w-10 border-transparent bg-transparent text-white hover:bg-white/20"
            iconClassName="h-4 w-4"
          />
        </div>
      </div>
    </div>
  )
}

export function HomePageClient({
  initialItems,
  initialFavoriteIds,
  initialErrorMessage,
}: HomePageClientProps) {
  const { session } = useAuth()
  const [items, setItems] = useState<Item[]>(initialItems)
  const [activeCategory, setActiveCategory] = useState<(typeof chips)[number]>('🔥 Все')
  const [searchQuery, setSearchQuery] = useState('')
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('any')
  const [conditionFilter, setConditionFilter] = useState<ConditionFilter>('any')
  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [errorMessage, setErrorMessage] = useState(initialErrorMessage)
  const [toastMessage, setToastMessage] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set(initialFavoriteIds))

  const hasFilters = useMemo(
    () => priceFilter !== 'any' || conditionFilter !== 'any',
    [conditionFilter, priceFilter]
  )

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  useEffect(() => {
    const userId = session?.user?.id
    if (!userId || !items.length) {
      if (!userId) {
        setFavoriteIds(new Set())
      }
      return
    }

    let active = true

    const loadFavorites = async () => {
      const itemIds = items.map((item) => item.id)
      const { data, error } = await (supabase.from('favorites') as any)
        .select('item_id')
        .eq('user_id', userId)
        .in('item_id', itemIds)

      if (!active || error) {
        return
      }

      setFavoriteIds(
        new Set(
          ((data ?? []) as Array<{ item_id: string | null }>)
            .map((row) => row.item_id)
            .filter(Boolean) as string[]
        )
      )
    }

    void loadFavorites()

    return () => {
      active = false
    }
  }, [items, session?.user?.id])

  const applyCategoryFilter = (query: any, categoryChip: (typeof chips)[number]) => {
    if (categoryChip === '💃 Латина') {
      return query.or('category.ilike.%латин%,title.ilike.%латин%')
    }
    if (categoryChip === '🤵 Стандарт') {
      return query.or('category.ilike.%стандарт%,title.ilike.%стандарт%')
    }
    if (categoryChip === '👟 Обувь') {
      return query.or('category.ilike.%обув%,title.ilike.%туфл%,title.ilike.%обув%')
    }
    return query
  }

  const applyAdditionalFilters = (query: any) => {
    let nextQuery = query

    if (priceFilter === 'under30000') {
      nextQuery = nextQuery.lte('price', 30000)
    } else if (priceFilter === 'from30000') {
      nextQuery = nextQuery.gte('price', 30000)
    }

    if (conditionFilter === 'new') {
      nextQuery = nextQuery.ilike('condition', '%нов%')
    } else if (conditionFilter === 'used') {
      nextQuery = nextQuery.ilike('condition', '%б/у%')
    }

    return nextQuery
  }

  const fetchItems = async (
    categoryChip: (typeof chips)[number],
    searchOverride?: string
  ) => {
    setIsLoadingItems(true)
    setErrorMessage('')
    setToastMessage('Обновляем подборку...')
    const currentSearchQuery = (searchOverride ?? searchQuery).trim()

    let query = (supabase.from('items') as any)
      .select('id, title, price, image_urls, size, gender, category, condition')
      .eq('is_active', true)
      .is('archive_reason', null)
      .order('created_at', { ascending: false })

    if (currentSearchQuery) {
      query = query.or(`title.ilike.%${currentSearchQuery}%,category.ilike.%${currentSearchQuery}%`)
    }

    query = applyCategoryFilter(query, categoryChip)
    query = applyAdditionalFilters(query)

    const { data, error } = await query

    if (error) {
      setErrorMessage(error.message)
      setToastMessage('Не удалось обновить подборку')
      setIsLoadingItems(false)
      return
    }

    setItems((data ?? []) as Item[])
    setToastMessage('Подборка обновлена')
    setIsLoadingItems(false)
  }

  const handleChipClick = (chip: (typeof chips)[number]) => {
    setActiveCategory(chip)
    void fetchItems(chip)
  }

  const handleApplyFilters = () => {
    setIsFiltersOpen(false)
    void fetchItems(activeCategory)
  }

  return (
    <main className="min-h-screen bg-white pb-24 text-slate-950 md:pb-0">
      <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col">
        <section className="px-4 pt-7">
          <h1 className="font-serif text-5xl font-bold tracking-tight text-slate-950">ProDance</h1>
          <p className="mt-2 max-w-[320px] font-serif text-base italic text-slate-600">
            Твой идеальный костюм для паркета. Покупай и продавай
          </p>
        </section>

        <section className="sticky top-0 z-40 bg-white/95 px-4 pb-2 pt-4 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 rounded-full border border-slate-200 bg-slate-50/80 px-4 shadow-[0_10px_30px_-24px_rgba(15,23,42,0.5)]">
            <form
              action="."
              onSubmit={(e) => {
                e.preventDefault()
                void fetchItems(activeCategory)
              }}
              className="flex h-full w-full items-center gap-3"
              role="search"
            >
              <Search className="h-5 w-5 text-slate-400" />
              <div className="relative flex h-full w-full items-center">
                <input
                  type="search"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Быстрый поиск по каталогу..."
                  aria-label="Поиск по каталогу"
                  className="h-full w-full bg-transparent pr-8 text-base text-slate-700 placeholder:text-slate-400 focus:outline-none"
                />
                {searchQuery.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      void fetchItems(activeCategory, '')
                    }}
                    aria-label="Очистить поиск"
                    className="absolute right-0 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </form>
            <button
              type="button"
              onClick={() => setIsFiltersOpen(true)}
              aria-label="Фильтры"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-200/80"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>
        </section>

        <section className="px-4 pt-3">
          <ul className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
            {stories.map((story) => (
              <li key={story} className="w-[74px] shrink-0 snap-start text-center">
                <div className="mx-auto flex h-[66px] w-[66px] items-center justify-center rounded-full bg-gradient-to-b from-[#f5f5f5] to-[#ececec] p-[2px]">
                  <div className="h-full w-full rounded-full bg-white p-[2px]">
                    <div className="h-full w-full rounded-full bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] font-medium leading-4 text-slate-600">{story}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="px-4 pt-2">
          <ul className="scrollbar-hide flex gap-2 overflow-x-auto pb-2">
            {chips.map((chip) => {
              const isActive = activeCategory === chip
              return (
                <li key={chip}>
                  <button
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'bg-black text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {chip}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="flex flex-1 flex-col px-4 pb-6 pt-2">
          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Не удалось загрузить каталог: {errorMessage}
            </div>
          ) : null}

          {!items.length && !isLoadingItems ? (
            <section className="flex flex-1 items-center justify-center">
              <div className="w-full text-center">
                <PackageOpen className="mx-auto mb-4 h-16 w-16 stroke-[1.5] text-slate-300" />
                <h1 className="text-xl font-bold text-slate-900">Здесь пока пусто</h1>
                <p className="mx-auto mt-2 max-w-[250px] text-sm leading-relaxed text-slate-500">
                  Станьте первым, кто выложит вещь на продажу.
                </p>
                <Link
                  href="/create"
                  className="mx-auto mt-8 inline-flex h-14 w-full max-w-[280px] items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-lg transition hover:bg-slate-800"
                >
                  Разместить объявление
                </Link>
              </div>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-3">
              {items.map((item) => (
                <ProductCard key={item.id} item={item} initialIsFavorite={favoriteIds.has(item.id)} />
              ))}
            </section>
          )}
        </section>
      </div>

      {isLoadingItems ? (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-900/10">
            Загружаем обновленную подборку...
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-8">
          <div className="w-full max-w-md rounded-2xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-700 shadow-xl shadow-slate-900/10">
            {toastMessage}
          </div>
        </div>
      ) : null}

      <div
        className={`fixed inset-0 z-[60] bg-slate-950/30 transition ${
          isFiltersOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsFiltersOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 right-0 z-[70] w-[88%] max-w-sm transform bg-white p-5 shadow-2xl transition-transform ${
          isFiltersOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isFiltersOpen}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Фильтры</h2>
          <button
            type="button"
            onClick={() => setIsFiltersOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Закрыть фильтры"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Цена</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setPriceFilter('any')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  priceFilter === 'any' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                Любая
              </button>
              <button
                type="button"
                onClick={() => setPriceFilter('under30000')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  priceFilter === 'under30000'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                До 30 000 ₽
              </button>
              <button
                type="button"
                onClick={() => setPriceFilter('from30000')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  priceFilter === 'from30000'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                От 30 000 ₽
              </button>
            </div>
          </section>

          <section>
            <h3 className="mb-3 text-sm font-semibold text-slate-900">Состояние</h3>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setConditionFilter('any')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  conditionFilter === 'any'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Любое
              </button>
              <button
                type="button"
                onClick={() => setConditionFilter('new')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  conditionFilter === 'new'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Новое
              </button>
              <button
                type="button"
                onClick={() => setConditionFilter('used')}
                className={`w-full rounded-xl px-3 py-2 text-left text-sm ${
                  conditionFilter === 'used'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                Б/у
              </button>
            </div>
          </section>
        </div>

        <div className="mt-8 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setPriceFilter('any')
              setConditionFilter('any')
            }}
            className="h-11 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
          >
            Сбросить
          </button>
          <button
            type="button"
            onClick={handleApplyFilters}
            className="h-11 rounded-xl bg-slate-900 text-sm font-semibold text-white"
          >
            Применить{hasFilters ? '' : ' (без ограничений)'}
          </button>
        </div>
      </aside>
    </main>
  )
}
