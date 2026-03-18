'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { LockKeyhole, Phone } from 'lucide-react'

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

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, '')

  if (digits.length === 10) {
    digits = `7${digits}`
  } else if (digits.length === 11 && digits[0] === '8') {
    digits = `7${digits.slice(1)}`
  }

  return digits.length === 11 ? digits : ''
}

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const cleanPhone = normalizePhone(phone)

    if (!cleanPhone) {
      setError('Введите корректный номер телефона')
      return
    }

    const pseudoEmail = `${cleanPhone}@prodance.app`

    setLoading(true)

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: pseudoEmail,
      password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    router.push('/market')
    router.refresh()
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
            <div className="flex items-center gap-3 rounded-xl border border-gray-300 bg-white p-3">
              <LockKeyhole className="h-5 w-5 text-gray-400" />
              <input
                type="password"
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 bg-transparent text-base text-gray-900 outline-none"
                required
              />
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
