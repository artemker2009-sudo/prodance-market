'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

type AuthContextValue = {
  session: Session | null
  profile: Profile | null
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

type AuthProviderProps = {
  children: ReactNode
  initialSession: Session | null
}

export function AuthProvider({ children, initialSession }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(initialSession)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const syncAuth = async (nextSession: Session | null) => {
      if (!active) {
        return
      }

      setSession(nextSession)

      if (!nextSession?.user) {
        if (active) {
          setProfile(null)
          setLoading(false)
        }

        return
      }

      try {
        const nextProfile = await getProfile(nextSession.user.id)

        if (active) {
          setProfile(nextProfile)
        }
      } catch {
        if (active) {
          setProfile(null)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    const bootstrapAuth = async () => {
      setLoading(true)

      await syncAuth(initialSession)

      const { data } = await supabase.auth.getSession()

      if (!active) {
        return
      }

      if (data.session?.access_token !== initialSession?.access_token) {
        await syncAuth(data.session)
        return
      }

      if (active) {
        setLoading(false)
      }
    }

    void bootstrapAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setLoading(true)
      }

      void syncAuth(nextSession)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [initialSession])

  const value = useMemo(
    () => ({ session, profile, loading }),
    [loading, profile, session]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return context
}
