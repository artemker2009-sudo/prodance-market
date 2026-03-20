'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Heart } from 'lucide-react'

type PremiumItem = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function ProductPlaceholder() {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_48%),linear-gradient(160deg,rgba(255,255,255,0.45),rgba(229,231,235,0.75))]" />
      <div className="absolute inset-x-6 top-6 h-16 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center pb-6">
        <div className="h-24 w-16 rounded-t-[999px] bg-white/60" />
      </div>
    </div>
  )
}

export function PremiumItemCard({
  item,
  href,
  topRight,
}: {
  item: PremiumItem
  href?: string
  topRight?: ReactNode
}) {
  const previewImage = item.image_urls?.[0] ?? null
  const favoriteControl = topRight ?? (
    <button
      type="button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm"
      aria-label="Добавить в избранное"
    >
      <Heart className="h-4 w-4" />
    </button>
  )
  const content = (
    <article className="flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]">
      <div className="relative">
        {previewImage ? (
          <div className="relative aspect-[3/4] w-full bg-slate-100">
            <Image
              src={previewImage}
              alt={item.title}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : (
          <ProductPlaceholder />
        )}
        <div className="absolute right-2 top-2 z-10">{favoriteControl}</div>
      </div>

      <div className="flex min-h-[74px] flex-col px-3 pb-4 pt-3 sm:px-4">
        <p className="text-xl font-bold tracking-tight text-gray-900">{formatPrice(item.price)} ₽</p>
        <h2 className="mt-1 truncate text-sm font-semibold leading-5 text-gray-800 sm:text-base">
          {item.title}
        </h2>
      </div>
    </article>
  )

  if (!href) {
    return content
  }

  return (
    <Link
      href={href}
      className="block rounded-[1.5rem] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/15 focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  )
}
