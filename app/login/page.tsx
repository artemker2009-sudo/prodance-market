'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useMemo, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole, Phone } from 'lucide-react'

import { getSafeRedirectPath } from '../lib/auth-routing'
import { supabase, waitForSupabaseSession } from '../lib/supabase'

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
  const searchParams = useSearchParams()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const redirectTo = useMemo(
    () => getSafeRedirectPath(searchParams.get('redirectTo')),
    [searchParams]
  )
  const reason = searchParams.get('reason')
  const isMessageReason = reason === 'message'
  const registerHref = useMemo(() => {
    const params = new URLSearchParams()
    const rawRedirectTo = searchParams.get('redirectTo')
    const rawReason = searchParams.get('reason')

    if (rawRedirectTo) {
      params.set('redirectTo', rawRedirectTo)
    }

    if (rawReason) {
      params.set('reason', rawReason)
    }

    const query = params.toString()
    return query ? `/register?${query}` : '/register'
  }, [searchParams])

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

      await waitForSupabaseSession('signed-in')
      window.location.assign(redirectTo)
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
    <main className="flex min-h-screen items-center justify-center bg-[#faf7f3] px-4 py-8">
      <section className="w-full max-w-md rounded-[2rem] border border-slate-200/70 bg-white p-6 shadow-sm sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
              Welcome back
            </p>
            <div className="space-y-2">
              {isMessageReason ? (
                <p className="mb-4 text-center text-lg font-medium text-slate-950">
                  Прежде чем написать, сначала зарегистрируйтесь 😊
                </p>
              ) : (
                <>
                  <h1 className="text-3xl font-bold tracking-tight text-slate-950">Вход</h1>
                  <p className="text-sm leading-6 text-slate-500">
                    Войдите по номеру телефона и паролю.
                  </p>
                </>
              )}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Номер телефона</span>
            <div className="flex items-center gap-3 rounded-[1.5rem] border border-slate-200/70 bg-[#faf7f3] px-4 py-4 focus-within:border-slate-950 focus-within:bg-white">
              <Phone className="h-5 w-5 text-slate-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                className="w-full border-0 bg-transparent text-base text-slate-950 outline-none placeholder:text-slate-400"
                required
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Пароль</span>
            <div className="relative rounded-[1.5rem] border border-slate-200/70 bg-[#faf7f3] px-4 py-4 focus-within:border-slate-950 focus-within:bg-white">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full border-0 bg-transparent pl-8 pr-10 text-base text-slate-950 outline-none placeholder:text-slate-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition hover:text-slate-500"
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
            className="flex h-14 w-full items-center justify-center rounded-[1.5rem] bg-slate-950 px-5 text-base font-semibold text-white shadow-sm disabled:opacity-60"
          >
            {loading ? 'Входим...' : 'Войти'}
          </button>

          <p className="text-center text-sm text-slate-500">
            Нет аккаунта?{' '}
            <Link href={registerHref} className="font-semibold text-slate-950">
              Зарегистрироваться
            </Link>
          </p>
        </form>
      </section>
    </main>
  )
}
