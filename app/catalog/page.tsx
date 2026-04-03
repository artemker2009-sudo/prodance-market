'use client'

import { ChevronRight, Search } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export default function CatalogPage() {
  const searchParams = useSearchParams()
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const categories = ['Женское', 'Мужское', 'Обувь']
  const hasSearchQuery = searchQuery.trim().length > 0

  useEffect(() => {
    if (searchParams.get('action') === 'search') {
      searchInputRef.current?.focus()
    }
  }, [searchParams])

  return (
    <main className="min-h-screen bg-white pb-24 text-slate-900 md:pb-6">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-[480px] space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight">Каталог</h1>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Поиск по каталогу"
              className="h-14 w-full rounded-2xl border border-slate-200 bg-slate-50 pr-4 pl-12 text-base font-medium text-slate-900 outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[480px] px-4 py-6">
        {hasSearchQuery ? (
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-center text-slate-500 pt-10">Ищем: {searchQuery}...</div>
          </div>
        ) : (
          <ul className="space-y-3">
            {categories.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => setSearchQuery(category)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left text-base font-medium transition hover:bg-slate-100"
                >
                  <span>{category}</span>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
