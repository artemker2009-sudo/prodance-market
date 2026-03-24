'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'

type EditableItem = {
  id: string
  seller_id: string | null
  title: string
  price: number
  description: string | null
  image_urls: string[] | null
  category: string | null
  gender: string | null
  size: string | null
  location_address: string | null
}

const categories = ['Турнирное', 'Тренировочное', 'Одежда', 'Обувь', 'Аксессуары'] as const
const genders = ['Мужское', 'Женское', 'Унисекс', 'Детское'] as const

const deleteReasonOptions = [
  'Продал на ProDance',
  'Продал в другом месте',
  'Передумал продавать',
  'Другое',
] as const

export default function EditItemPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const { session, loading } = useAuth()
  const currentUser = session?.user ?? null
  const itemId = typeof params?.id === 'string' ? params.id : ''

  const [item, setItem] = useState<EditableItem | null>(null)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<(typeof categories)[number]>('Турнирное')
  const [gender, setGender] = useState<(typeof genders)[number]>('Женское')
  const [size, setSize] = useState('')
  const [locationAddress, setLocationAddress] = useState('')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([])
  const [newPreviewUrls, setNewPreviewUrls] = useState<string[]>([])
  const previewUrlsRef = useRef<string[]>([])
  const [isLoadingItem, setIsLoadingItem] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success')
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<(typeof deleteReasonOptions)[number]>(
    deleteReasonOptions[0]
  )

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
    previewUrlsRef.current = newPreviewUrls
  }, [newPreviewUrls])

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    }
  }, [])

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2800)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  useEffect(() => {
    if (loading) {
      return
    }

    if (!currentUser?.id || !itemId) {
      router.push('/')
      return
    }

    let active = true

    const loadItem = async () => {
      setIsLoadingItem(true)

      const { data, error: itemError } = await (supabase.from('items') as any)
        .select('id, seller_id, title, price, description, image_urls, category, gender, size, location_address')
        .eq('id', itemId)
        .maybeSingle()

      if (!active) {
        return
      }

      if (itemError || !data) {
        router.push('/')
        return
      }

      const nextItem = data as EditableItem

      if (nextItem.seller_id !== currentUser.id) {
        router.push('/')
        return
      }

      setItem(nextItem)
      setTitle(nextItem.title ?? '')
      setPrice(String(nextItem.price ?? ''))
      setDescription(nextItem.description ?? '')
      setCategory(
        (categories as readonly string[]).includes(nextItem.category ?? '')
          ? (nextItem.category as (typeof categories)[number])
          : 'Турнирное'
      )
      setGender(
        (genders as readonly string[]).includes(nextItem.gender ?? '')
          ? (nextItem.gender as (typeof genders)[number])
          : 'Женское'
      )
      setSize(nextItem.size ?? '')
      setLocationAddress(nextItem.location_address ?? '')
      setImageUrls(Array.isArray(nextItem.image_urls) ? nextItem.image_urls : [])
      setIsLoadingItem(false)
    }

    void loadItem()

    return () => {
      active = false
    }
  }, [currentUser?.id, itemId, loading, router])

  const handleNewPhotosChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) {
      return
    }

    const previewUrls = files.map((file) => URL.createObjectURL(file))
    setNewPhotoFiles((previous) => [...previous, ...files])
    setNewPreviewUrls((previous) => [...previous, ...previewUrls])
    setError('')
    event.target.value = ''
  }

  const handleRemoveCurrentPhoto = (index: number) => {
    setImageUrls((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleRemoveNewPhoto = (index: number) => {
    setNewPreviewUrls((previous) => {
      const targetUrl = previous[index]
      if (targetUrl) {
        URL.revokeObjectURL(targetUrl)
      }
      return previous.filter((_, currentIndex) => currentIndex !== index)
    })
    setNewPhotoFiles((previous) => previous.filter((_, currentIndex) => currentIndex !== index))
  }

  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!item || !currentUser?.id) {
      setError('Не удалось определить объявление')
      return
    }

    const normalizedTitle = title.trim()
    const normalizedPrice = price.trim()
    const normalizedDescription = description.trim()
    const normalizedSize = size.trim()
    const normalizedLocationAddress = locationAddress.trim()
    const numericPrice = Number(normalizedPrice)

    if (!normalizedTitle || !normalizedPrice || !normalizedSize || !normalizedLocationAddress) {
      setError('Заполните обязательные поля: название, цену, размер и адрес')
      return
    }

    if (Number.isNaN(numericPrice)) {
      setError('Цена должна быть числом')
      return
    }

    setIsSubmitting(true)

    try {
      const uploadedUrls = await Promise.all(
        newPhotoFiles.map(async (file, index) => {
          const fileName = `${Date.now()}-${index}-${file.name.replace(/\s+/g, '-')}`
          const { error: uploadError } = await supabase.storage
            .from('marketplace-images')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw uploadError
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from('marketplace-images').getPublicUrl(fileName)

          return publicUrl
        })
      )

      const nextImageUrls = [...imageUrls, ...uploadedUrls]

      const { error: updateError } = await (supabase.from('items') as any)
        .update({
          title: normalizedTitle,
          category,
          gender,
          size: normalizedSize,
          price: numericPrice,
          description: normalizedDescription || null,
          location_address: normalizedLocationAddress,
          image_urls: nextImageUrls,
        })
        .eq('id', item.id)

      if (updateError) {
        throw updateError
      }

      toast.success('Изменения сохранены')
      router.push('/profile')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Не удалось сохранить изменения')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !currentUser?.id) {
      return
    }

    setIsDeleting(true)
    setError('')

    try {
      const { error: statsError } = await (supabase.from('deleted_items_stats') as any).insert({
        seller_id: currentUser.id,
        title: item.title,
        price: item.price,
        reason: selectedReason,
      })

      if (statsError) {
        throw statsError
      }

      const { error: deleteError } = await (supabase.from('items') as any).delete().eq('id', item.id)

      if (deleteError) {
        throw deleteError
      }

      toast.success('Объявление удалено')
      router.push('/profile')
    } catch (caughtError) {
      toast.error(caughtError instanceof Error ? caughtError.message : 'Не удалось удалить объявление')
      setIsDeleting(false)
    }
  }

  if (isLoadingItem || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 pb-28">
        <p className="text-sm text-slate-500">Загрузка объявления...</p>
      </main>
    )
  }

  if (!item) {
    return null
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] pb-64 text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#faf7f3]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/profile"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Назад в профиль"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <p className="text-lg font-semibold tracking-tight">Редактирование объявления</p>
            <p className="text-sm text-slate-500">Обновите данные товара</p>
          </div>
        </div>
      </header>

      <form id="edit-item-form" onSubmit={handleSave} noValidate className="space-y-5 px-4 py-5 pb-40">
        <section className="space-y-4 rounded-[2rem] bg-white p-4 shadow-sm">
          <div>
            <p className="mb-3 block text-sm font-medium text-slate-600">Текущие фото</p>
            {imageUrls.length ? (
              <div className="grid grid-cols-3 gap-3">
                {imageUrls.map((imageUrl, index) => (
                  <div key={`${imageUrl}-${index}`} className="relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveCurrentPhoto(index)}
                      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Удалить текущее фото"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img
                      src={imageUrl}
                      alt={`Фото товара ${index + 1}`}
                      className="aspect-square w-full rounded-xl object-cover shadow-sm"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Текущих фото нет</p>
            )}
          </div>

          <label className="block">
            <span className="mb-3 block text-sm font-medium text-slate-600">Добавить новые фото</span>
            <div className="relative flex min-h-44 flex-col items-center justify-center rounded-[1.5rem] border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={handleNewPhotosChange}
              />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-950 text-white">
                <Plus className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-900">Загрузить фото</p>
            </div>
          </label>

          {newPreviewUrls.length ? (
            <div>
              <p className="mb-3 text-sm font-medium text-slate-600">Новые фото</p>
              <div className="grid grid-cols-3 gap-3">
                {newPreviewUrls.map((previewUrl, index) => (
                  <div key={`${previewUrl}-${index}`} className="relative">
                    <button
                      type="button"
                      onClick={() => handleRemoveNewPhoto(index)}
                      className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Удалить новое фото"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <img
                      src={previewUrl}
                      alt={`Новое фото ${index + 1}`}
                      className="aspect-square w-full rounded-xl object-cover shadow-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-600">
              Название товара
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Введите название"
              required
            />
          </div>

          <div>
            <label htmlFor="price" className="mb-2 block text-sm font-medium text-slate-600">
              Цена
            </label>
            <div className="relative">
              <input
                id="price"
                name="price"
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
                placeholder="15000"
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-medium text-slate-400">
                ₽
              </span>
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-2 block text-sm font-medium text-slate-600">
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Расскажите о состоянии и деталях товара"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Категория</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((itemCategory) => {
                const isActive = itemCategory === category

                return (
                  <button
                    key={itemCategory}
                    type="button"
                    onClick={() => setCategory(itemCategory)}
                    className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {itemCategory}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Пол</p>
            <div className="flex flex-wrap gap-2">
              {genders.map((itemGender) => {
                const isActive = itemGender === gender

                return (
                  <button
                    key={itemGender}
                    type="button"
                    onClick={() => setGender(itemGender)}
                    className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {itemGender}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label htmlFor="size" className="mb-2 block text-sm font-medium text-slate-600">
              Размер
            </label>
            <input
              id="size"
              name="size"
              type="text"
              value={size}
              onChange={(event) => setSize(event.target.value)}
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Например, S / 36 / 42"
              required
            />
          </div>

          <div>
            <label htmlFor="location_address" className="mb-2 block text-sm font-medium text-slate-600">
              Место встречи / Адрес
            </label>
            <input
              id="location_address"
              name="location_address"
              type="text"
              value={locationAddress}
              onChange={(event) => setLocationAddress(event.target.value)}
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              placeholder="Укажите адрес (город, улица, дом)"
              required
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </section>
      </form>

      <div className="fixed bottom-[70px] left-0 w-full bg-white border-t border-gray-100 p-4 z-40 flex flex-col gap-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <div className="mx-auto flex w-full max-w-md flex-col gap-3">
          <button
            type="submit"
            form="edit-item-form"
            disabled={isSubmitting || isDeleting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>Сохранить изменения</span>
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            disabled={isSubmitting || isDeleting}
            className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
          >
            Отменить изменения
          </button>

          <button
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isSubmitting || isDeleting}
            className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-transparent px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60"
          >
            Удалить объявление
          </button>
        </div>
      </div>

      {isDeleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-slate-900">Почему вы удаляете объявление?</h2>

            <div className="mt-4 space-y-2">
              {deleteReasonOptions.map((reason) => (
                <label
                  key={reason}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 py-3"
                >
                  <input
                    type="radio"
                    name="delete-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                  <span className="text-sm text-slate-700">{reason}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                <span>Подтвердить удаление</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed inset-x-0 bottom-28 z-50 flex justify-center px-4">
          <div
            className={`w-full max-w-md rounded-xl px-4 py-3 text-sm shadow-lg ${
              toastTone === 'success'
                ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {toastMessage}
          </div>
        </div>
      ) : null}
    </main>
  )
}
