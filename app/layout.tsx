import type { ReactNode } from 'react'
import { Manrope } from 'next/font/google'

import { NotificationOnboardingModal } from '../components/NotificationOnboardingModal'
import { AppShell } from './components/AppShell'
import { AuthProvider } from './components/AuthProvider'
import { createSupabaseServerClient } from './lib/supabase-server'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-manrope',
})

export const metadata = {
  title: 'ProDance Market',
  description: 'Premium marketplace for dancers',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="ru">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body
        className={`${manrope.variable} min-h-screen bg-neutral-50 font-sans text-neutral-950 antialiased`}
      >
        <AuthProvider initialSession={session}>
          <AppShell>{children}</AppShell>
          <NotificationOnboardingModal />
        </AuthProvider>
      </body>
    </html>
  )
}
