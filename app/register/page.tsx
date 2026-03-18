'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  ArrowRight,
  ChevronDown,
  LockKeyhole,
  MapPin,
  Phone,
  Search,
  UserRound,
  X,
} from 'lucide-react'

import { supabase } from '../lib/supabase'

const russianCities = [
  'Москва',
  'Санкт-Петербург',
  'Новосибирск',
  'Екатеринбург',
  'Казань',
  'Нижний Новгород',
  'Красноярск',
  'Челябинск',
  'Самара',
  'Уфа',
  'Ростов-на-Дону',
  'Краснодар',
  'Омск',
  'Воронеж',
  'Пермь',
  'Волгоград',
  'Саратов',
  'Тюмень',
  'Тольятти',
  'Ижевск',
  'Барнаул',
  'Ульяновск',
  'Иркутск',
  'Хабаровск',
  'Ярославль',
  'Владивосток',
  'Махачкала',
  'Томск',
  'Оренбург',
  'Кемерово',
  'Новокузнецк',
  'Рязань',
  'Астрахань',
  'Набережные Челны',
  'Пенза',
  'Липецк',
  'Киров',
  'Чебоксары',
  'Тула',
  'Калининград',
  'Курск',
  'Ставрополь',
  'Улан-Удэ',
  'Сочи',
  'Тверь',
  'Иваново',
  'Белгород',
  'Брянск',
  'Сургут',
  'Владимир',
]

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

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [city, setCity] = useState('')
  const [citySearch, setCitySearch] = useState('')
  const [isCitySheetOpen, setIsCitySheetOpen] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isCitySheetOpen) {
      return
    }

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isCitySheetOpen])

  const filteredCities = useMemo(() => {
    const query = citySearch.trim().toLowerCase()

    if (!query) {
      return russianCities
    }

    return russianCities.filter((item) => item.toLowerCase().includes(query))
  }, [citySearch])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const cleanPhone = normalizePhone(phone)

    if (!cleanPhone) {
      setError('Введите корректный номер телефона')
      return
    }

    if (!city) {
      setError('Выберите город')
      return
    }

    const normalizedPhone = `+${cleanPhone}`
    const pseudoEmail = `${cleanPhone}@prodance.app`

    setLoading(true)

    const { error: signUpError } = await supabase.auth.signUp({
      email: pseudoEmail,
      password,
      options: {
        data: {
          name: name.trim(),
          city,
          phone: normalizedPhone,
        },
      },
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    router.push('/market')
    router.refresh()
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 pb-28 md:pb-8">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-neutral-950 text-white">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-neutral-950">
                Регистрация
              </h1>
              <p className="text-sm leading-6 text-neutral-500">
                Создайте аккаунт по номеру телефона и выберите свой город.
              </p>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-700">Имя</span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 focus-within:border-neutral-950 focus-within:bg-white">
              <UserRound className="h-5 w-5 text-neutral-400" />
              <input
                type="text"
                autoComplete="name"
                placeholder="Как к вам обращаться"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
                required
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-700">
              Номер телефона
            </span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 focus-within:border-neutral-950 focus-within:bg-white">
              <Phone className="h-5 w-5 text-neutral-400" />
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (999) 123-45-67"
                value={phone}
                onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
                className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
                required
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-neutral-700">Пароль</span>
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 focus-within:border-neutral-950 focus-within:bg-white">
              <LockKeyhole className="h-5 w-5 text-neutral-400" />
              <input
                type="password"
                autoComplete="new-password"
                placeholder="Придумайте пароль"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
                required
              />
            </div>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-neutral-700">Город</span>
            <button
              type="button"
              onClick={() => setIsCitySheetOpen(true)}
              className="flex w-full items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-left"
            >
              <MapPin className="h-5 w-5 text-neutral-400" />
              <span
                className={`min-w-0 flex-1 text-base ${
                  city ? 'text-neutral-950' : 'text-neutral-400'
                }`}
              >
                {city || 'Выберите город'}
              </span>
              <ChevronDown className="h-5 w-5 text-neutral-400" />
            </button>
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-neutral-950 px-5 text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.75)] disabled:opacity-60"
          >
            <span>{loading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}</span>
            {!loading ? <ArrowRight className="h-5 w-5" /> : null}
          </button>

          <p className="text-center text-sm text-neutral-500">
            Уже есть аккаунт?{' '}
            <Link href="/login" className="font-semibold text-neutral-950">
              Войти
            </Link>
          </p>
        </form>
      </section>

      {isCitySheetOpen ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40 px-0 md:items-center md:justify-center md:px-4">
          <div className="flex h-[88vh] w-full flex-col rounded-t-[2rem] bg-white shadow-2xl md:h-[min(42rem,88vh)] md:max-w-md md:rounded-[2rem]">
            <div className="px-4 pb-4 pt-3 md:px-6">
              <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-neutral-200 md:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-950">
                    Выберите город
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Найдите свой город в списке крупных городов России.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCitySheetOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-neutral-500"
                  aria-label="Закрыть выбор города"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-4 focus-within:border-neutral-950 focus-within:bg-white">
                <Search className="h-5 w-5 text-neutral-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Начните вводить город"
                  value={citySearch}
                  onChange={(event) => setCitySearch(event.target.value)}
                  className="w-full bg-transparent text-base outline-none placeholder:text-neutral-400"
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:px-4">
              {filteredCities.length ? (
                <div className="space-y-1">
                  {filteredCities.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        setCity(item)
                        setCitySearch('')
                        setIsCitySheetOpen(false)
                        setError('')
                      }}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left text-base ${
                        city === item
                          ? 'bg-neutral-950 text-white'
                          : 'bg-neutral-50 text-neutral-900'
                      }`}
                    >
                      <span>{item}</span>
                      {city === item ? (
                        <span className="text-sm text-white/70">Выбран</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl bg-neutral-50 px-5 py-6 text-sm text-neutral-500">
                  По вашему запросу города не найдены.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
