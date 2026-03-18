import type { ReactNode } from 'react'
import { Manrope } from 'next/font/google'

import { AuthProvider } from './components/AuthProvider'
import { BottomNav } from './components/BottomNav'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
})

export const metadata = {
  title: 'ProDance Market',
  description: 'Premium marketplace for dancers',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="ru">
      <body
        className={`${manrope.variable} min-h-screen bg-neutral-50 font-sans text-neutral-950 antialiased`}
      >
        <AuthProvider>
          <div className="max-w-[480px] mx-auto min-h-screen bg-white shadow-xl">
            <div className="min-h-screen pb-20 md:pb-0">{children}</div>
            <BottomNav />
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
