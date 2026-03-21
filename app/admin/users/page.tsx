'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'

import { supabase } from '../../lib/supabase'

type ProfileRow = {
  id: string
  name: string | null
  city: string | null
  created_at: string | null
  avatar_url?: string | null
}

function formatDate(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    const loadUsers = async () => {
      setLoading(true)
      setError('')

      const { data, error: queryError } = await (supabase.from('profiles') as any)
        .select('id, name, city, created_at, avatar_url')
        .order('created_at', { ascending: false })

      if (!active) {
        return
      }

      if (queryError) {
        setError(queryError.message)
        setUsers([])
        setLoading(false)
        return
      }

      setUsers((data ?? []) as ProfileRow[])
      setLoading(false)
    }

    void loadUsers()

    return () => {
      active = false
    }
  }, [])

  const handleDelete = async (user: ProfileRow) => {
    if (!confirm('Точно удалить?')) {
      return
    }

    setDeletingId(user.id)
    setError('')

    const { error: deleteError } = await (supabase.rpc('delete_user_by_admin', {
      target_uid: user.id,
    }) as any)

    if (deleteError) {
      setError(deleteError.message)
      setDeletingId(null)
      return
    }

    setUsers((prev) => prev.filter((row) => row.id !== user.id))
    setDeletingId(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Пользователи</h1>
      <p className="mt-2 text-sm text-slate-500">Управление аккаунтами marketplace</p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200/70">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm">
          <thead className="bg-[#faf7f3] text-left text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Профиль</th>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Город</th>
              <th className="px-4 py-3">Регистрация</th>
              <th className="px-4 py-3 text-right">Действие</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Загружаем пользователей...
                </td>
              </tr>
            ) : !users.length ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                  Пользователи не найдены
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-slate-500">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.name || 'Аватар'}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <span className="text-xs font-semibold">
                            {(user.name?.[0] ?? 'U').toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="font-medium text-slate-900">{user.name || 'Без имени'}</span>
                    </div>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-4 text-slate-500">{user.id}</td>
                  <td className="px-4 py-4 text-slate-700">{user.city || '—'}</td>
                  <td className="px-4 py-4 text-slate-700">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {deletingId === user.id ? 'Удаляем...' : 'Удалить'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
