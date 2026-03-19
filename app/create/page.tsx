'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Camera, Star } from 'lucide-react'
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'

import { supabase } from '../lib/supabase'

const categories = ['Турнирное', 'Тренировочное', 'Обувь', 'Аксессуары'] as const
const genders = ['Мужское', 'Женское', 'Детское'] as const

export default function CreatePage() {
  const router = useRouter()
  const [category, setCategory] = useState<(typeof categories)[number]>('Турнирное')
  const [gender, setGender] = useState<(typeof genders)[number]>('Женское')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!photoFiles.length) {
      setPhotoPreviewUrls([])
      return
    }

    const nextPreviewUrls = photoFiles.map((file) => URL.createObjectURL(file))
    setPhotoPreviewUrls(nextPreviewUrls)

    return () => {
      nextPreviewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    }
  }, [photoFiles])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      window.alert('Чтобы опубликовать объявление, войдите в аккаунт.')
      router.push('/login')
      return
    }

    if (!photoFiles.length) {
      setError('Добавьте фото товара')
      return
    }

    const formData = new FormData(event.currentTarget)
    const title = formData.get('title')?.toString().trim() ?? ''
    const size = formData.get('size')?.toString().trim() ?? ''
    const priceValue = formData.get('price')?.toString().trim() ?? ''
    const description = formData.get('description')?.toString().trim() ?? ''
    const price = Number(priceValue)

    if (!title || !size || !priceValue || Number.isNaN(price)) {
      setError('Заполните все обязательные поля')
      return
    }

    setIsSubmitting(true)

    try {
      const mainPhoto = photoFiles[mainPhotoIndex] ?? photoFiles[0]
      const fileName = `${Date.now()}-${mainPhoto.name.replace(/\s+/g, '-')}`

      const { error: uploadError } = await supabase.storage
        .from('marketplace-images')
        .upload(fileName, mainPhoto, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('marketplace-images').getPublicUrl(fileName)

      const { error: insertError } = await (supabase.from('items') as any).insert({
        title,
        category,
        gender,
        size,
        price,
        description: description || null,
        image_url: publicUrl,
        seller_id: user.id,
      })

      if (insertError) {
        throw insertError
      }

      router.push('/')
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось опубликовать объявление'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? [])

    if (!nextFiles.length) {
      return
    }

    setPhotoFiles((currentFiles) => {
      const existingFileKeys = new Set(
        currentFiles.map((file) => `${file.name}-${file.size}-${file.lastModified}`)
      )
      const uniqueNextFiles = nextFiles.filter((file) => {
        const fileKey = `${file.name}-${file.size}-${file.lastModified}`
        return !existingFileKeys.has(fileKey)
      })

      if (!currentFiles.length && uniqueNextFiles.length) {
        setMainPhotoIndex(0)
      }

      return uniqueNextFiles.length ? [...currentFiles, ...uniqueNextFiles] : currentFiles
    })

    setError('')
    event.target.value = ''
  }

  return (
    <main className="min-h-screen bg-[#faf7f3] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-[#faf7f3]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-4">
          <Link
            href="/"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Назад на главную"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <div>
            <p className="text-lg font-semibold tracking-tight">Новое объявление</p>
            <p className="text-sm text-slate-500">Заполните карточку товара</p>
          </div>
        </div>
      </header>

      <form
        id="create-listing-form"
        onSubmit={handleSubmit}
        className="space-y-5 px-4 py-5 pb-48"
      >
        <label className="block">
          <span className="mb-3 block text-sm font-medium text-slate-600">Фото</span>
          <div className="relative flex min-h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
            <input
              type="file"
              accept="image/*"
              multiple
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={handlePhotoChange}
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <Camera className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">Добавить фото</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              {photoFiles.length
                ? 'Можно выбрать еще фото. Главное фото отметьте звездой в превью ниже.'
                : 'Выберите одно или несколько фото товара. Главное фото можно отметить после загрузки.'}
            </p>
            {!photoFiles.length ? (
              <span className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
                Выбрать изображения
              </span>
            ) : null}
          </div>

          {photoFiles.length ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {photoPreviewUrls.map((previewUrl, index) => {
                const isMainPhoto = index === mainPhotoIndex

                return (
                  <div
                    key={`${photoFiles[index]?.name ?? 'photo'}-${index}`}
                    className={`relative overflow-hidden rounded-xl border bg-slate-100 ${
                      isMainPhoto ? 'border-4 border-blue-600' : 'border-slate-200'
                    }`}
                  >
                    {isMainPhoto ? (
                      <span className="absolute left-2 top-2 z-10 rounded-full bg-blue-600 px-2 py-1 text-xs font-semibold text-white">
                        Главное
                      </span>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setMainPhotoIndex(index)}
                      className={`absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition ${
                        isMainPhoto
                          ? 'border-blue-600 bg-blue-600 text-white'
                          : 'border-white/80 bg-white/90 text-slate-600'
                      }`}
                      aria-label={
                        isMainPhoto
                          ? 'Это главное фото'
                          : `Сделать главным фото ${photoFiles[index]?.name ?? ''}`
                      }
                    >
                      <Star className={`h-4 w-4 ${isMainPhoto ? 'fill-current' : ''}`} />
                    </button>

                    <div className="relative aspect-square">
                      <Image
                        src={previewUrl}
                        alt={photoFiles[index]?.name ?? `Фото ${index + 1}`}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          <input type="hidden" name="mainPhotoIndex" value={mainPhotoIndex} />
          <input type="hidden" name="mainPhotoName" value={photoFiles[mainPhotoIndex]?.name ?? ''} />
        </label>

        <section className="space-y-4 rounded-[2rem] bg-white p-4 shadow-sm">
          <div>
            <label htmlFor="title" className="mb-2 block text-sm font-medium text-slate-600">
              Название товара
            </label>
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Например, платье для стандарта"
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none ring-0 placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
              required
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Категория</p>
            <div className="flex flex-wrap gap-2">
              {categories.map((item) => {
                const isActive = item === category

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <input type="hidden" name="category" value={category} />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-600">Пол</p>
            <div className="flex flex-wrap gap-2">
              {genders.map((item) => {
                const isActive = item === gender

                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setGender(item)}
                    className={`min-h-11 rounded-full px-4 py-2.5 text-sm font-medium ${
                      isActive
                        ? 'bg-slate-950 text-white shadow-sm'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    {item}
                  </button>
                )
              })}
            </div>
            <input type="hidden" name="gender" value={gender} />
          </div>

          <div>
            <label htmlFor="size" className="mb-2 block text-sm font-medium text-slate-600">
              Размер
            </label>
            <input
              id="size"
              name="size"
              type="text"
              placeholder="Например, S / 36 / 42"
              className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
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
                placeholder="15000"
                className="h-14 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 pr-12 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
                required
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-base font-medium text-slate-400">
                ₽
              </span>
            </div>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-2 block text-sm font-medium text-slate-600"
            >
              Описание
            </label>
            <textarea
              id="description"
              name="description"
              rows={6}
              placeholder="Состояние, бренд, ткань, почему продаёте и любые важные детали."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-base outline-none placeholder:text-slate-400 focus:border-slate-950 focus:bg-white"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </section>
      </form>

      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="submit"
          form="create-listing-form"
          disabled={isSubmitting}
          className="flex h-14 w-full items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-lg shadow-slate-950/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Публикация...' : 'Опубликовать'}
        </button>
      </div>
    </main>
  )
}
