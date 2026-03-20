'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
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
  status: string | null
}

const tabs = [
  { key: 'active', label: 'Активные' },
  { key: 'sold', label: 'Проданные' },
] as const

function normalizeStatus(status: string | null | undefined) {
  return (status ?? '').trim().toLowerCase()
}

function isSoldStatus(status: string | null | undefined) {
  const normalized = normalizeStatus(status)
  return normalized === 'sold' || normalized === 'продано'
}

export default function MyListingsPage() {
  const router = useRouter()
  const { session, loading } = useAuth()
  const user = session?.user ?? null
  const [items, setItems] = useState<Item[]>([])
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['key']>('active')
  const [error, setError] = useState('')
  const [loadingItems, setLoadingItems] = useState(true)

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

    const loadItems = async () => {
      setLoadingItems(true)
      setError('')

      const { data, error: queryError } = await (supabase.from('items') as any)
        .select('id, title, price, image_url, size, gender, category, description, status')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (queryError) {
        setError(queryError.message)
        setItems([])
        setLoadingItems(false)
        return
      }

      setItems((data ?? []) as Item[])
      setLoadingItems(false)
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [user?.id])

  const filteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (activeTab === 'sold') {
          return isSoldStatus(item.status)
        }

        return !isSoldStatus(item.status)
      }),
    [activeTab, items]
  )

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28 md:pb-0">
        <p className="text-sm text-slate-500">Загрузка объявлений...</p>
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
            <h1 className="text-2xl font-semibold tracking-tight">Мои объявления</h1>
            <p className="text-sm text-slate-500">Управляйте своими публикациями</p>
          </div>
        </header>

        <section className="mb-5 rounded-[1.75rem] border border-slate-200/70 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`h-11 rounded-2xl text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-sm'
                      : 'bg-[#faf7f3] text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </section>

        {error ? (
          <p className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {loadingItems ? (
          <section className="rounded-[2rem] border border-slate-200/70 bg-white px-6 py-12 text-center text-sm text-slate-500 shadow-sm">
            Загружаем объявления...
          </section>
        ) : !filteredItems.length ? (
          <section className="rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Пока пусто</h2>
            <p className="mt-2 text-sm text-slate-500">
              Во вкладке "{activeTab === 'active' ? 'Активные' : 'Проданные'}" объявлений пока нет.
            </p>
          </section>
        ) : (
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <PremiumItemCard key={item.id} item={item} href={`/item/${item.id}`} />
            ))}
          </section>
        )}
      </div>
    </main>
  )
}
