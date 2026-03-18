'use client'

import { useState, type FormEvent } from 'react'

import {
  approveProduct,
  getPendingProducts,
  rejectProduct,
} from '../actions/admin'
import type { Product } from '../lib/types'

export default function AdminPage() {
  const [passwordInput, setPasswordInput] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)

  const loadProducts = async (password: string) => {
    setIsLoading(true)
    setError('')

    try {
      const nextProducts = await getPendingProducts(password)
      setProducts(nextProducts)
      setAdminPassword(password)
    } catch (loadError) {
      setAdminPassword('')
      setProducts([])
      setError(loadError instanceof Error ? loadError.message : 'Ошибка загрузки')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadProducts(passwordInput)
  }

  const handleAction = async (id: string, type: 'approve' | 'reject') => {
    setActionId(id)
    setActionType(type)
    setError('')

    try {
      if (type === 'approve') {
        await approveProduct(id, adminPassword)
      } else {
        await rejectProduct(id, adminPassword)
      }

      const nextProducts = await getPendingProducts(adminPassword)
      setProducts(nextProducts)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Ошибка действия')
    } finally {
      setActionId(null)
      setActionType(null)
    }
  }

  if (!adminPassword) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 pb-28 md:pb-0">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm"
        >
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Админ-панель</h1>
            <p className="text-sm text-neutral-500">Вход по мастер-паролю</p>
          </div>

          <input
            type="password"
            placeholder="Пароль"
            value={passwordInput}
            onChange={(event) => setPasswordInput(event.target.value)}
            className="w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none"
            required
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-black px-4 py-3 text-white disabled:opacity-60"
          >
            {isLoading ? 'Входим...' : 'Войти'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 pb-28 md:pb-10">
      <div className="mb-6 space-y-1">
        <h1 className="text-3xl font-semibold">Модерация товаров</h1>
        <p className="text-sm text-neutral-500">Неодобренные объявления</p>
      </div>

      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

      {isLoading ? (
        <p className="text-sm text-neutral-500">Загрузка...</p>
      ) : !products.length ? (
        <p className="text-sm text-neutral-500">Нет товаров на модерации</p>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isProcessing = actionId === product.id

            return (
              <article
                key={product.id}
                className="overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="h-64 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-64 items-center justify-center bg-neutral-100 text-sm text-neutral-400">
                    Нет фото
                  </div>
                )}

                <div className="space-y-3 p-4">
                  <div className="space-y-1">
                    <h2 className="text-lg font-medium">{product.title}</h2>
                    <p className="text-sm text-neutral-500">{product.price} ₽</p>
                    <p className="text-sm text-neutral-600">
                      {product.description || 'Без описания'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => handleAction(product.id, 'approve')}
                      disabled={isProcessing}
                      className="flex-1 rounded-xl bg-black px-4 py-3 text-white disabled:opacity-60"
                    >
                      {isProcessing && actionType === 'approve'
                        ? 'Одобряем...'
                        : 'Одобрить'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAction(product.id, 'reject')}
                      disabled={isProcessing}
                      className="flex-1 rounded-xl border border-red-200 px-4 py-3 text-red-600 disabled:opacity-60"
                    >
                      {isProcessing && actionType === 'reject'
                        ? 'Отклоняем...'
                        : 'Отклонить'}
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      )}
    </main>
  )
}
