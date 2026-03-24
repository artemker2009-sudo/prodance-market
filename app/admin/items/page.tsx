'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'

import { supabase } from '../../lib/supabase'
import { deleteItemAsAdmin } from '../../actions/admin'

type ItemRow = {
  id: string
  title: string
  price: number | null
  seller_id: string | null
  image_urls: string[] | null
  description?: string | null
  category?: string | null
  brand?: string | null
  condition?: string | null
  size?: string | null
  location_address?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

function getCover(imageUrls: string[] | null) {
  if (!Array.isArray(imageUrls) || !imageUrls.length) {
    return null
  }

  return imageUrls[0] ?? null
}

export default function AdminItemsPage() {
  const [items, setItems] = useState<ItemRow[]>([])
  const [selectedItem, setSelectedItem] = useState<ItemRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success')

  const toast = useMemo(
    () => ({
      success: (message: string) => {
        setToastTone('success')
        setToastMessage(message)
      },
      error: (message: string) => {
        setToastTone('error')
        setToastMessage(message)
      },
    }),
    []
  )

  useEffect(() => {
    let active = true

    const loadItems = async () => {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await (supabase.from('items') as any)
        .select('*')
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

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleDelete = async (item: ItemRow) => {
    if (!confirm('Точно удалить?')) {
      return
    }

    setDeletingId(item.id)
    setError('')

    try {
      await deleteItemAsAdmin(item.id)
      setItems((prev) => prev.filter((row) => row.id !== item.id))
      toast.success('Объявление удалено')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось удалить объявление'
      console.error('Ошибка удаления:', error)
      setError(message)
      toast.error(`Ошибка удаления: ${message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const formatValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') {
      return '—'
    }

    if (Array.isArray(value)) {
      if (!value.length) {
        return '—'
      }
      return value.join(', ')
    }

    return String(value)
  }

  const formatPrice = (price: number | null | undefined) =>
    typeof price === 'number' ? `${price} ₽` : '—'

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
              <th className="px-4 py-3 text-right">Действия</th>
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
                  <tr key={item.id} className="transition hover:bg-slate-50">
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
                    <td className="px-4 py-4 text-slate-700">{formatPrice(item.price)}</td>
                    <td className="max-w-[240px] truncate px-4 py-4 text-slate-500">{item.seller_id || '—'}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
                        >
                          Посмотреть
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          disabled={deletingId === item.id}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingId === item.id ? 'Удаляем...' : 'Удалить'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {selectedItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Карточка объявления</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">{selectedItem.title || 'Без названия'}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-6">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Галерея</h3>
                {Array.isArray(selectedItem.image_urls) && selectedItem.image_urls.length ? (
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
                    {selectedItem.image_urls.map((url, index) => (
                      <div key={`${selectedItem.id}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200">
                        <Image
                          src={url}
                          alt={`${selectedItem.title} ${index + 1}`}
                          width={420}
                          height={320}
                          className="h-40 w-full object-cover"
                          unoptimized
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Фотографии отсутствуют</p>
                )}
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Основные данные</h3>
                <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 p-4 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500">Цена</p>
                    <p className="font-medium text-slate-900">{formatPrice(selectedItem.price)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Категория</p>
                    <p className="font-medium text-slate-900">{formatValue(selectedItem.category)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Бренд</p>
                    <p className="font-medium text-slate-900">{formatValue(selectedItem.brand)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Состояние</p>
                    <p className="font-medium text-slate-900">{formatValue(selectedItem.condition)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Размер</p>
                    <p className="font-medium text-slate-900">{formatValue(selectedItem.size)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Создано</p>
                    <p className="font-medium text-slate-900">{formatValue(selectedItem.created_at)}</p>
                  </div>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Описание</h3>
                <p className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700 whitespace-pre-wrap">
                  {formatValue(selectedItem.description)}
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Локация</h3>
                <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <p>
                    <span className="text-slate-500">Адрес: </span>
                    {formatValue(selectedItem.location_address)}
                  </p>
                  <p className="mt-2">
                    <span className="text-slate-500">Координаты: </span>
                    {typeof selectedItem.latitude === 'number' && typeof selectedItem.longitude === 'number'
                      ? `${selectedItem.latitude}, ${selectedItem.longitude}`
                      : 'Точка на карте указана'}
                  </p>
                </div>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Данные продавца</h3>
                <p className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  <span className="text-slate-500">ID продавца: </span>
                  <span className="font-medium text-slate-900">{formatValue(selectedItem.seller_id)}</span>
                </p>
              </section>

              <section className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Дополнительно</h3>
                <div className="mt-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                  {Object.entries(selectedItem).filter(
                    ([key]) =>
                      ![
                        'id',
                        'title',
                        'price',
                        'seller_id',
                        'image_urls',
                        'description',
                        'category',
                        'brand',
                        'condition',
                        'size',
                        'location_address',
                        'latitude',
                        'longitude',
                        'created_at',
                        'updated_at',
                      ].includes(key)
                  ).length ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(selectedItem)
                        .filter(
                          ([key]) =>
                            ![
                              'id',
                              'title',
                              'price',
                              'seller_id',
                              'image_urls',
                              'description',
                              'category',
                              'brand',
                              'condition',
                              'size',
                              'location_address',
                              'latitude',
                              'longitude',
                              'created_at',
                              'updated_at',
                            ].includes(key)
                        )
                        .map(([key, value]) => (
                          <div key={key}>
                            <p className="text-slate-500">{key}</p>
                            <p className="font-medium text-slate-900">{formatValue(value)}</p>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-slate-500">Дополнительных полей нет</p>
                  )}
                </div>
              </section>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleDelete(selectedItem)
                  setSelectedItem(null)
                }}
                disabled={deletingId === selectedItem.id}
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
              >
                {deletingId === selectedItem.id ? 'Удаляем...' : 'Удалить объявление'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div
          className={`fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg ${
            toastTone === 'success' ? 'bg-slate-900' : 'bg-rose-600'
          }`}
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  )
}
