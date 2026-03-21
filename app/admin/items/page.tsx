'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

import { supabase } from '../../lib/supabase'

type ItemRow = {
  id: string
  title: string
  price: number | null
  seller_id: string | null
  image_urls: string[] | null
}

function getCover(imageUrls: string[] | null) {
  if (!Array.isArray(imageUrls) || !imageUrls.length) {
    return null
  }

  return imageUrls[0] ?? null
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadItems = async () => {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await (supabase.from('items') as any)
        .select('id, title, price, seller_id, image_urls')
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (queryError) {
        setError(queryError.message)
        setItems([])
        setLoading(false)
        return
      }

      setItems((data ?? []) as ItemRow[])
      setLoading(false)
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [])

  const handleDelete = async (item: ItemRow) => {
    if (!confirm('Точно удалить?')) {
      return
    }

    setDeletingId(item.id)
    setError('')

    const { error: deleteError } = await (supabase.from('items') as any).delete().eq('id', item.id)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setItems((prev) => prev.filter((row) => row.id !== item.id))
    setDeletingId(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Объявления</h1>
      <p className="mt-2 text-sm text-slate-500">Каталог активных товаров</p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200/70">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm">
          <thead className="bg-[#faf7f3] text-left text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Фото и название</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">ID продавца</th>
              <th className="px-4 py-3 text-right">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Загружаем объявления...
                </td>
              </tr>
            ) : !items.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Объявлений пока нет
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const cover = getCover(item.image_urls)
                return (
                  <tr key={item.id}>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-xs text-slate-500">
                          {cover ? (
                            <Image
                              src={cover}
                              alt={item.title}
                              width={48}
                              height={48}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            'Нет фото'
                          )}
                        </div>
                        <span className="font-medium text-slate-900">{item.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {typeof item.price === 'number' ? `${item.price} ₽` : '—'}
                    </td>
                    <td className="max-w-[240px] truncate px-4 py-4 text-slate-500">{item.seller_id || '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        {deletingId === item.id ? 'Удаляем...' : 'Удалить'}
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
