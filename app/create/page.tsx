'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'
import { useState, type ChangeEvent, type FormEvent } from 'react'

import { supabase } from '../lib/supabase'

const categories = ['Турнирное', 'Тренировочное', 'Обувь', 'Аксессуары'] as const
const genders = ['Мужское', 'Женское', 'Детское'] as const

export default function CreatePage() {
  const router = useRouter()
  const [category, setCategory] = useState<(typeof categories)[number]>('Турнирное')
  const [gender, setGender] = useState<(typeof genders)[number]>('Женское')
  const [photoName, setPhotoName] = useState('')
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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

    if (!photoFile) {
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
      const fileName = `${Date.now()}-${photoFile.name.replace(/\s+/g, '-')}`

      const { error: uploadError } = await supabase.storage
        .from('marketplace-images')
        .upload(fileName, photoFile, {
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
    const file = event.target.files?.[0] ?? null

    setPhotoFile(file)
    setPhotoName(file?.name ?? '')
    setError('')
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
        className="space-y-5 px-4 py-5 pb-32"
      >
        <label className="block">
          <span className="mb-3 block text-sm font-medium text-slate-600">Фото</span>
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-950 text-white shadow-lg shadow-slate-950/15">
              <Camera className="h-7 w-7" />
            </div>
            <p className="mt-4 text-lg font-semibold text-slate-950">Добавить фото</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              Загрузите главное фото товара, чтобы объявление выглядело аккуратно.
            </p>
            <span className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600">
              {photoName || 'Выбрать изображение'}
            </span>
          </div>
          <input type="file" accept="image/*" className="sr-only" onChange={handlePhotoChange} />
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
