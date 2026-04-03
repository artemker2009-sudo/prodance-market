"use client";

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { supabase } from '../../lib/supabase'

type ItemPreview = {
  id: string
  title: string | null
}

type ReporterProfile = {
  id?: string
  name?: string | null
  full_name?: string | null
  username?: string | null
  [key: string]: unknown
}

type ReportRow = {
  id: string
  item_id: string
  reporter_id: string | null
  reason: string | null
  comment?: string | null
  created_at: string | null
  items: ItemPreview | null
  profiles: ReporterProfile | ReporterProfile[] | null
}

type ReportsTableClientProps = {
  initialReports: ReportRow[]
  initialError?: string
}

function normalizeProfile(
  profile: ReporterProfile | ReporterProfile[] | null | undefined
): ReporterProfile | null {
  if (!profile) {
    return null
  }

  return Array.isArray(profile) ? (profile[0] ?? null) : profile
}

function getReporterName(profile: ReporterProfile | ReporterProfile[] | null | undefined) {
  const normalized = normalizeProfile(profile)

  return normalized?.name || normalized?.full_name || normalized?.username || 'Неизвестный пользователь'
}

function formatDateTime(value: string | null) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function ReportsTableClient({ initialReports, initialError = '' }: ReportsTableClientProps) {
  const [reports, setReports] = useState<ReportRow[]>(initialReports)
  const [error, setError] = useState(initialError)
  const [busyReportId, setBusyReportId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'delete-item' | 'dismiss' | null>(null)
  const [toastMessage, setToastMessage] = useState('')
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success')

  const toast = useMemo(
    () => ({
      success: (message: string) => {
        setToastTone('success')
        setToastMessage(message)
      },
      error: (message: string) => {
        setToastTone('error')
        setToastMessage(message)
      },
    }),
    []
  )

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setToastMessage('')
    }, 2600)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [toastMessage])

  const handleDeleteItem = async (report: ReportRow) => {
    if (!report.item_id) {
      toast.error('Не удалось определить товар')
      return
    }

    if (!window.confirm('Точно удалить этот товар навсегда?')) {
      return
    }

    setError('')
    setBusyReportId(report.id)
    setBusyAction('delete-item')

    const { error: deleteError } = await (supabase.from('items') as any).delete().eq('id', report.item_id)

    if (deleteError) {
      setError(deleteError.message)
      toast.error(deleteError.message || 'Не удалось удалить товар')
      setBusyReportId(null)
      setBusyAction(null)
      return
    }

    setReports((prev) => prev.filter((row) => row.item_id !== report.item_id))
    toast.success('Товар удален вместе с жалобами')
    setBusyReportId(null)
    setBusyAction(null)
  }

  const handleDismissReport = async (report: ReportRow) => {
    setError('')
    setBusyReportId(report.id)
    setBusyAction('dismiss')

    const { error: dismissError } = await (supabase.from('item_reports') as any)
      .delete()
      .eq('id', report.id)

    if (dismissError) {
      setError(dismissError.message)
      toast.error(dismissError.message || 'Не удалось отклонить жалобу')
      setBusyReportId(null)
      setBusyAction(null)
      return
    }

    setReports((prev) => prev.filter((row) => row.id !== report.id))
    toast.success('Жалоба отклонена')
    setBusyReportId(null)
    setBusyAction(null)
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Жалобы</h1>
      <p className="mt-2 text-sm text-slate-500">Модерация жалоб на товары маркетплейса</p>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!reports.length ? (
        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white px-6 py-14 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <p className="text-base font-medium text-slate-900">Жалоб пока нет</p>
          <p className="mt-2 text-sm text-slate-500">Новые жалобы появятся здесь автоматически.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-slate-200/70 bg-white shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm">
            <thead className="bg-[#faf7f3] text-left text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3">Товар</th>
                <th className="px-4 py-3">Кто пожаловался</th>
                <th className="px-4 py-3">Причина и комментарий</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {reports.map((report) => {
                const deletingItem = busyReportId === report.id && busyAction === 'delete-item'
                const dismissing = busyReportId === report.id && busyAction === 'dismiss'
                const isBusy = deletingItem || dismissing

                return (
                  <tr key={report.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-4">
                      {report.items?.id ? (
                        <Link
                          href={`/item/${report.items.id}`}
                          className="font-medium text-slate-900 underline-offset-4 transition hover:text-slate-600 hover:underline"
                        >
                          {report.items.title || 'Без названия'}
                        </Link>
                      ) : (
                        <span className="text-slate-500">Товар уже удален</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-700">{getReporterName(report.profiles)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-2">
                        <span className="inline-flex w-fit rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
                          {report.reason || 'Причина не указана'}
                        </span>
                        <p className="text-sm text-slate-600">{report.comment?.trim() || 'Комментарий не оставлен'}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{formatDateTime(report.created_at)}</td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDeleteItem(report)}
                          disabled={isBusy || !report.items?.id}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                        >
                          {deletingItem ? 'Удаляем...' : 'Удалить товар'}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDismissReport(report)}
                          disabled={isBusy}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                        >
                          {dismissing ? 'Отклоняем...' : 'Отклонить жалобу'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {toastMessage ? (
        <div
          className={`fixed bottom-8 left-1/2 z-[120] -translate-x-1/2 rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg ${
            toastTone === 'success' ? 'bg-slate-900' : 'bg-rose-600'
          }`}
        >
          {toastMessage}
        </div>
      ) : null}
    </div>
  )
}
