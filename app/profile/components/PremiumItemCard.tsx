'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type PremiumItem = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  size: string | null
  gender: string | null
  category: string | null
  description: string | null
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
  const meta = [item.size, item.gender, item.category].filter(Boolean).join(' • ')
  const previewImage = item.image_urls?.[0] ?? null
  const content = (
    <article className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]">
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
        {topRight ? <div className="absolute right-2 top-2 z-10">{topRight}</div> : null}
      </div>

      <div className="flex min-h-[148px] flex-col px-3 pb-4 pt-3 sm:px-4">
        {item.category ? (
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
            {item.category}
          </p>
        ) : null}
        <p className="text-lg font-bold text-gray-900">{formatPrice(item.price)} ₽</p>
        <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-gray-800 sm:text-base">
          {item.title}
        </h2>
        {item.description ? (
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
            {item.description}
          </p>
        ) : null}
        <p className="mt-auto pt-3 text-xs text-gray-400">
          {meta || 'Размер и параметры появятся позже'}
        </p>
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
