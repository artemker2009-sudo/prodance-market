'use client'

import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'

type BackButtonProps = {
  className?: string
  children: ReactNode
}

export function BackButton({ className, children }: BackButtonProps) {
  const router = useRouter()

  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {children}
    </button>
  )
}
