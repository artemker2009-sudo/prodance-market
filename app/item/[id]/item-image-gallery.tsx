'use client'

import { useMemo, useState, type ReactNode } from 'react'
import Image from 'next/image'
import { X } from 'lucide-react'

type ItemImageGalleryProps = {
  imageUrls: string[]
  title: string
  topRightActions?: ReactNode
}

export function ItemImageGallery({ imageUrls, title, topRightActions }: ItemImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fullscreenIndex, setFullscreenIndex] = useState(0)
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false)

  const hasImages = imageUrls.length > 0
  const safeActiveIndex = useMemo(() => {
    if (!hasImages) {
      return 0
    }

    return Math.min(activeIndex, imageUrls.length - 1)
  }, [activeIndex, hasImages, imageUrls.length])

  const handleScroll: React.UIEventHandler<HTMLDivElement> = (event) => {
    const container = event.currentTarget
    const slideWidth = container.clientWidth
    if (slideWidth <= 0) {
      return
    }

    const nextIndex = Math.round(container.scrollLeft / slideWidth)
    if (nextIndex !== activeIndex && nextIndex >= 0 && nextIndex < imageUrls.length) {
      setActiveIndex(nextIndex)
    }
  }

  if (!hasImages) {
    return null
  }

  return (
    <>
      <div className="relative w-full min-h-[65vh] overflow-hidden rounded-t-[32px]">
        <div
          onScroll={handleScroll}
          className="flex h-[70vh] min-h-[65vh] w-full snap-x snap-mandatory overflow-x-auto scroll-smooth scrollbar-hide"
          style={{ scrollbarWidth: 'none', scrollBehavior: 'smooth' }}
        >
          {imageUrls.map((url, index) => (
            <button
              type="button"
              key={url + index}
              onClick={() => {
                setFullscreenIndex(index)
                setIsFullscreenOpen(true)
              }}
              className="relative min-h-[65vh] min-w-full snap-center overflow-hidden bg-slate-950"
              aria-label={`Открыть фото ${index + 1} на весь экран`}
            >
              <Image
                src={url}
                alt={`${title} — фото ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl transition-all duration-[1600ms] ease-out"
                unoptimized
                aria-hidden
              />
              <Image
                src={url}
                alt={`${title} — фото ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className="relative z-10 h-full w-full object-contain transition-all duration-[1600ms] ease-out"
                unoptimized
              />
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-1">
          {imageUrls.map((_, index) => {
            const isActive = index === safeActiveIndex
            return (
              <span
                key={`dot-${index}`}
                className={`h-2 w-2 rounded-full transition-colors ${isActive ? 'bg-white' : 'bg-gray-300/60'}`}
                aria-hidden
              />
            )
          })}
        </div>

        {topRightActions ? (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">{topRightActions}</div>
        ) : null}

      </div>

      {isFullscreenOpen ? (
        <div className="fixed inset-0 z-[100] bg-black/95">
          <button
            type="button"
            onClick={() => setIsFullscreenOpen(false)}
            className="absolute right-4 top-4 z-20 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Закрыть полноэкранный просмотр"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="relative h-full w-full">
            <Image
              src={imageUrls[fullscreenIndex]}
              alt={`${title} — полноэкранное фото ${fullscreenIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
              unoptimized
              priority
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
