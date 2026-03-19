'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react'

import { supabase } from '../lib/supabase'

function formatPhoneInput(value: string) {
  let digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  if (digits[0] === '8') {
    digits = `7${digits.slice(1)}`
  } else if (digits[0] === '9') {
    digits = `7${digits}`
  }

  digits = digits.slice(0, 11)

  const localDigits = digits[0] === '7' ? digits.slice(1) : digits
  const part1 = localDigits.slice(0, 3)
  const part2 = localDigits.slice(3, 6)
  const part3 = localDigits.slice(6, 8)
  const part4 = localDigits.slice(8, 10)

  let formatted = '+7'

  if (part1) {
    formatted += ` (${part1}`
  }

  if (localDigits.length >= 4) {
    formatted += ')'
  }

  if (part2) {
    formatted += ` ${part2}`
  }

  if (part3) {
    formatted += `-${part3}`
  }

  if (part4) {
    formatted += `-${part4}`
  }

  return formatted
}

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const phoneValue = phone.trim()
    const cleanPhone = phoneValue.replace(/\D/g, '')

    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Введите корректный номер телефона')
      return
    }

    const pseudoEmail = `${cleanPhone}@prodance.app`

    setLoading(true)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pseudoEmail,
        password,
      })

      if (signInError) {
        throw signInError
      }

      router.push('/')
      router.refresh()
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : String(caughtError)

      if (message.includes('Invalid login credentials')) {
        setError(
          'Такой номер не зарегистрирован или указан неверный пароль. Проверьте данные или зарегистрируйтесь.'
        )
        return
      }

      if (message.includes('Load failed') || message.includes('Failed to fetch')) {
        setError(
          'Ошибка соединения с сервером. Проверьте интернет или перезагрузите страницу.'
        )
        return
      }

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-semibold text-gray-900">Вход</h1>
            <p className="text-sm text-gray-500">
              Войдите по номеру телефона и паролю
            </p>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">Номер телефона</span>
            <div className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white p-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                className="w-full border-0 bg-transparent text-base text-gray-900 outline-none"
                required
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-700">Пароль</span>
            <div className="relative rounded-xl border border-gray-300 bg-white p-3">
              <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 bg-transparent pl-8 pr-10 text-base text-gray-900 outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-500 cursor-pointer"
                aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 py-3 text-white disabled:opacity-60"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Нет аккаунта?{' '}
            <Link href="/register" className="font-medium text-blue-600">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </div>
    </main>
  )
}
