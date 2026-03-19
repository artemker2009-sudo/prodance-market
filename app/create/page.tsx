'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Star } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'

import { supabase } from '../lib/supabase'

const categories = ['Турнирное', 'Тренировочное', 'Обувь', 'Аксессуары'] as const
const genders = ['Мужское', 'Женское', 'Детское'] as const

export default function CreatePage() {
  const router = useRouter()
  const [category, setCategory] = useState<(typeof categories)[number]>('Турнирное')
  const [gender, setGender] = useState<(typeof genders)[number]>('Женское')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [mainPhotoIndex, setMainPhotoIndex] = useState(0)
  const previewUrlsRef = useRef<string[]>([])
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    previewUrlsRef.current = previewUrls
  }, [previewUrls])

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl))
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    console.log('Submit attempt')
    event.preventDefault()
    setError('')

    const formData = new FormData(event.currentTarget)
    const title = formData.get('title')?.toString().trim() ?? ''
    const size = formData.get('size')?.toString().trim() ?? ''
    const priceValue = formData.get('price')?.toString().trim() ?? ''
    const description = formData.get('description')?.toString().trim() ?? ''
    const price = Number(priceValue)

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

    const nextPreviewUrls = nextFiles.map((file) => URL.createObjectURL(file))

    setPhotoFiles((prev) => [...prev, ...nextFiles])
    setPreviewUrls((prev) => [...prev, ...nextPreviewUrls])
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
        noValidate
        className="space-y-5 px-4 py-5 pb-40"
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
              <Plus className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">Добавить фото</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              {photoFiles.length
                ? 'Нажмите еще раз, чтобы добавить дополнительные фото к уже выбранным.'
                : 'Выберите одно или несколько фото товара.'}
            </p>
            <span className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
              Выбрать изображения
            </span>
          </div>

          {previewUrls.length > 0 ? (
            <div className="mt-4 grid grid-cols-3 gap-3">
              {previewUrls.map((previewUrl, index) => (
                <div key={`${photoFiles[index]?.name ?? 'photo'}-${index}`} className="relative">
                  <button
                    type="button"
                    onClick={() => setMainPhotoIndex(index)}
                    className="absolute top-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border-0 bg-transparent p-0"
                    aria-label={index === mainPhotoIndex ? 'Главное фото' : 'Сделать главным'}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        index === mainPhotoIndex ? 'fill-blue-600 text-blue-600' : 'text-white drop-shadow-md'
                      }`}
                    />
                  </button>
                  <img
                    src={previewUrl}
                    alt={photoFiles[index]?.name ?? `Фото ${index + 1}`}
                    className="w-full aspect-square object-cover rounded-xl shadow-sm"
                  />
                </div>
              ))}
            </div>
          ) : null}
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

        <div className="relative z-[100] mt-8">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-14 w-full cursor-pointer items-center justify-center rounded-2xl bg-slate-950 text-base font-semibold text-white shadow-lg shadow-slate-950/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Публикуем...' : 'Опубликовать'}
          </button>
        </div>
      </form>
    </main>
  )
}
