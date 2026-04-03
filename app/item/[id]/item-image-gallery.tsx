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
      <div className="relative">
        <div
          onScroll={handleScroll}
          className="flex w-full snap-x snap-mandatory overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {imageUrls.map((url, index) => (
            <button
              type="button"
              key={url + index}
              onClick={() => {
                setFullscreenIndex(index)
                setIsFullscreenOpen(true)
              }}
              className="relative aspect-[4/3] min-w-full snap-center bg-slate-100"
              aria-label={`Открыть фото ${index + 1} на весь экран`}
            >
              <Image
                src={url}
                alt={`${title} — фото ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 480px"
                className="object-cover"
                unoptimized
              />
            </button>
          ))}
        </div>

        <div className="pointer-events-none absolute left-3 top-3 z-20 rounded-md bg-black/50 px-2 py-1 text-xs font-medium text-white">
          {safeActiveIndex + 1} из {imageUrls.length}
        </div>

        {topRightActions ? (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-2">{topRightActions}</div>
        ) : null}

        <div className="pointer-events-none absolute bottom-12 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-1.5 backdrop-blur-sm">
          {imageUrls.map((_, index) => (
            <span
              key={`dot-${index}`}
              className={`h-2 w-2 rounded-full transition-all ${
                index === safeActiveIndex ? 'bg-white' : 'bg-white/45'
              }`}
            />
          ))}
        </div>
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
