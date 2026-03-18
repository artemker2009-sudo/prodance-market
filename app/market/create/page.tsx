'use client'

import imageCompression from 'browser-image-compression'
import { useRouter } from 'next/navigation'
import { useState, type ChangeEvent, type FormEvent } from 'react'

import { useAuth } from '../../components/AuthProvider'
import { supabase } from '../../lib/supabase'
import type {
  DanceProgram,
  ProductCategory,
  ProductCondition,
  ProductGender,
} from '../../lib/types'

const categories: ProductCategory[] = ['турнирная', 'тренировочная']
const conditions: ProductCondition[] = ['новое', 'бу']
const programs: DanceProgram[] = ['стандарт', 'латина']
const genders: ProductGender[] = ['М', 'Ж', 'Дети']

export default function CreateProductPage() {
  const router = useRouter()
  const { session, loading: authLoading } = useAuth()
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<ProductCategory>('турнирная')
  const [condition, setCondition] = useState<ProductCondition>('новое')
  const [program, setProgram] = useState<DanceProgram>('стандарт')
  const [gender, setGender] = useState<ProductGender>('Ж')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImageFile(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!session?.user) {
      setError('Нужно войти в аккаунт')
      return
    }

    if (!imageFile) {
      setError('Добавьте фото товара')
      return
    }

    setError('')
    setSuccess('')
    setIsSubmitting(true)

    try {
      const compressedFile = await imageCompression(imageFile, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1080,
        useWebWorker: true,
      })

      const fileExt = compressedFile.type.split('/')[1] ?? 'jpg'
      const fileName = `${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('marketplace-images')
        .upload(fileName, compressedFile)

      if (uploadError) {
        throw uploadError
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('marketplace-images').getPublicUrl(fileName)

      const { error: insertError } = await (supabase.from('products') as any).insert(
        {
          user_id: session.user.id,
          title,
          price: Number(price),
          description: description || null,
          category,
          condition,
          program,
          gender,
          image_url: publicUrl,
          is_approved: false,
        }
      )

      if (insertError) {
        throw insertError
      }

      setSuccess('Товар отправлен на модерацию')

      window.setTimeout(() => {
        router.push('/market')
        router.refresh()
      }, 1200)
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Не удалось добавить товар'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (authLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pb-28 md:pb-0">
        <p className="text-sm text-neutral-500">Загрузка...</p>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 pb-28 md:pb-10">
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Добавить товар</h1>
          <p className="text-sm text-neutral-500">Новый товар попадет на модерацию</p>
        </div>

        <input
          type="text"
          placeholder="Название"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
          required
        />

        <input
          type="number"
          placeholder="Цена"
          min="0"
          step="1"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
          required
        />

        <textarea
          placeholder="Описание"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="min-h-32 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
        />

        <select
          value={category}
          onChange={(event) => setCategory(event.target.value as ProductCategory)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={condition}
          onChange={(event) => setCondition(event.target.value as ProductCondition)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
        >
          {conditions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={program}
          onChange={(event) => setProgram(event.target.value as DanceProgram)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
        >
          {programs.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select
          value={gender}
          onChange={(event) => setGender(event.target.value as ProductGender)}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
        >
          {genders.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-black file:px-3 file:py-2 file:text-white"
          required
        />

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {success ? <p className="text-sm text-green-600">{success}</p> : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Отправляем...' : 'Отправить товар'}
        </button>
      </form>
    </main>
  )
}
