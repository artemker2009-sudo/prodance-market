"use client";

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { deleteItemAndResolveReport, dismissReport, markReportAsRead } from './actions'

type ItemPreview = {
  id: string
  title: string | null
  price?: number | null
  category?: string | null
  description?: string | null
  image_urls?: string[] | null
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
  item_id: string | null
  reporter_id: string | null
  reason: string | null
  comment?: string | null
  created_at: string | null
  status?: 'pending' | 'dismissed' | 'resolved'
  is_read?: boolean
  item_title_snapshot?: string | null
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

function getReportStatusLabel(status: ReportRow['status']) {
  if (status === 'dismissed') {
    return 'Отклонена'
  }

  if (status === 'resolved') {
    return 'Товар удален модератором'
  }

  return 'Новая'
}

function getReportStatusClassName(status: ReportRow['status']) {
  if (status === 'dismissed') {
    return 'border-slate-200 bg-slate-100 text-slate-700'
  }

  if (status === 'resolved') {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function getItemTitle(report: ReportRow) {
  return report.items?.title?.trim() || report.item_title_snapshot?.trim() || 'Без названия'
}

export default function ReportsTableClient({ initialReports, initialError = '' }: ReportsTableClientProps) {
  const router = useRouter()
  const [reports, setReports] = useState<ReportRow[]>(initialReports)
  const [error, setError] = useState(initialError)
  const [busyReportId, setBusyReportId] = useState<string | null>(null)
  const [busyAction, setBusyAction] = useState<'delete-item' | 'dismiss' | null>(null)
  const [selectedReport, setSelectedReport] = useState<ReportRow | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending')
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

  useEffect(() => {
    setReports(initialReports)
  }, [initialReports])

  useEffect(() => {
    if (!selectedReport) {
      return
    }

    const nextSelected = reports.find((row) => row.id === selectedReport.id) ?? null
    setSelectedReport(nextSelected)
  }, [reports, selectedReport])

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

    try {
      const itemTitle = getItemTitle(report)
      await deleteItemAndResolveReport(report.id, report.item_id, itemTitle)
      setReports((prev) =>
        prev.map((row) =>
          row.id === report.id
            ? {
                ...row,
                status: 'resolved',
                item_title_snapshot: itemTitle,
                item_id: null,
                items: null,
              }
            : row
        )
      )
      setSelectedReport(null)
      toast.success('Товар удален, жалоба закрыта')
      router.refresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Не удалось удалить товар'
      setError(message)
      toast.error(message)
    } finally {
      setBusyReportId(null)
      setBusyAction(null)
    }
  }

  const handleDismissReport = async (report: ReportRow) => {
    setError('')
    setBusyReportId(report.id)
    setBusyAction('dismiss')

    try {
      await dismissReport(report.id)
      setReports((prev) =>
        prev.map((row) => (row.id === report.id ? { ...row, status: 'dismissed' } : row))
      )
      setSelectedReport(null)
      toast.success('Жалоба отклонена')
      router.refresh()
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Не удалось отклонить жалобу'
      setError(message)
      toast.error(message)
    } finally {
      setBusyReportId(null)
      setBusyAction(null)
    }
  }

  const handleOpenReport = (report: ReportRow) => {
    setSelectedReport(report)

    if (report.is_read) {
      return
    }

    setReports((prev) => prev.map((row) => (row.id === report.id ? { ...row, is_read: true } : row)))
    void markReportAsRead(report.id)
      .then(() => {
        router.refresh()
      })
      .catch((error) => {
        console.error('Не удалось отметить жалобу как прочитанную:', error)
      })
  }

  const pendingReports = useMemo(
    () => reports.filter((report) => (report.status ?? 'pending') === 'pending'),
    [reports]
  )
  const historyReports = useMemo(
    () => reports.filter((report) => (report.status ?? 'pending') !== 'pending'),
    [reports]
  )
  const activeReports = activeTab === 'pending' ? pendingReports : historyReports
  const isHistoryReportOpen = selectedReport ? (selectedReport.status ?? 'pending') !== 'pending' : false

  const emptyStateTitle = activeTab === 'pending' ? 'Новых жалоб пока нет' : 'История действий пока пуста'
  const emptyStateDescription =
    activeTab === 'pending'
      ? 'Новые жалобы появятся здесь автоматически.'
      : 'Отклоненные и решенные жалобы отобразятся в этом разделе.'

  const renderStatusBadge = (status: ReportRow['status']) => (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${getReportStatusClassName(status)}`}
    >
      {getReportStatusLabel(status)}
    </span>
  )

  const renderTableActions = (report: ReportRow, isBusy: boolean, deletingItem: boolean, dismissing: boolean) => {
    const status = report.status ?? 'pending'
    if (status !== 'pending') {
      return renderStatusBadge(status)
    }

    return (
      <>
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
      </>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Жалобы</h1>
      <p className="mt-2 text-sm text-slate-500">Модерация жалоб на товары маркетплейса</p>

      <div className="mt-5 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          Новые жалобы
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === 'history' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
        >
          История
        </button>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {!activeReports.length ? (
        <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white px-6 py-14 text-center shadow-[0_14px_40px_rgba(15,23,42,0.08)]">
          <p className="text-base font-medium text-slate-900">{emptyStateTitle}</p>
          <p className="mt-2 text-sm text-slate-500">{emptyStateDescription}</p>
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
                <th className="px-4 py-3">Просмотр</th>
                <th className="px-4 py-3 text-right">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeReports.map((report) => {
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
                          {getItemTitle(report)}
                        </Link>
                      ) : (
                        <span className="text-slate-500">{getItemTitle(report)}</span>
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
                      <button
                        type="button"
                        onClick={() => handleOpenReport(report)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        Посмотреть
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        {renderTableActions(report, isBusy, deletingItem, dismissing)}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div
        className={`fixed inset-0 z-[110] transition ${
          selectedReport ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
      >
        <div
          className={`absolute inset-0 bg-slate-900/30 transition-opacity duration-300 ${
            selectedReport ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setSelectedReport(null)}
        />

        <aside
          className={`absolute top-0 right-0 h-full w-full max-w-2xl transform bg-white shadow-[-24px_0_56px_rgba(15,23,42,0.2)] transition-transform duration-300 ${
            selectedReport ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!selectedReport}
        >
          {selectedReport ? (
            <div className="flex h-full flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-slate-950">Быстрый просмотр жалобы</h2>
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  Закрыть
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">
                <section className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-500">Товар</h3>

                  {selectedReport.items?.id ? (
                    <div className="mt-4 space-y-4">
                      {selectedReport.items.image_urls?.[0] ? (
                        <img
                          src={selectedReport.items.image_urls[0]}
                          alt={selectedReport.items.title || 'Фото товара'}
                          className="h-64 w-full rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-64 w-full items-center justify-center rounded-2xl bg-slate-200 text-sm text-slate-500">
                          Фото отсутствует
                        </div>
                      )}

                      <div>
                        <p className="text-xl font-semibold text-slate-950">
                          {selectedReport.items.title || 'Без названия'}
                        </p>
                        <p className="mt-1 text-base font-medium text-slate-700">
                          {new Intl.NumberFormat('ru-RU').format(selectedReport.items.price ?? 0)} сом
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Категория: {selectedReport.items.category?.trim() || 'Не указана'}
                        </p>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4">
                        <p className="text-sm font-semibold text-slate-900">Полное описание</p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                          {selectedReport.items.description?.trim() || 'Описание отсутствует'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Этот товар больше недоступен. {selectedReport.item_title_snapshot || 'Название не сохранено.'}
                    </p>
                  )}
                </section>

                <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-base font-semibold text-slate-950">Детали жалобы</h3>
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Причина</p>
                      <span className="mt-1 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-medium text-red-700">
                        {selectedReport.reason || 'Причина не указана'}
                      </span>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Комментарий</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                        {selectedReport.comment?.trim() || 'Комментарий не оставлен'}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Кто пожаловался</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">{getReporterName(selectedReport.profiles)}</p>
                    </div>
                  </div>
                </section>
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4">
                {isHistoryReportOpen ? (
                  <div className="flex justify-end">{renderStatusBadge(selectedReport.status)}</div>
                ) : (
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDeleteItem(selectedReport)}
                      disabled={
                        (busyReportId === selectedReport.id && busyAction === 'dismiss') || !selectedReport.items?.id
                      }
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                    >
                      {busyReportId === selectedReport.id && busyAction === 'delete-item'
                        ? 'Удаляем...'
                        : 'Удалить товар'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDismissReport(selectedReport)}
                      disabled={busyReportId === selectedReport.id && busyAction === 'delete-item'}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                    >
                      {busyReportId === selectedReport.id && busyAction === 'dismiss'
                        ? 'Отклоняем...'
                        : 'Отклонить жалобу'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </aside>
      </div>

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
