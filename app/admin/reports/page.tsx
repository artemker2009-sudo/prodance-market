import { supabaseAdmin } from '../../lib/supabase-admin'
import ReportsTableClient from './ReportsTableClient'

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

export default async function AdminReportsPage() {
  const { data, error } = await (supabaseAdmin.from('item_reports') as any)
    .select('*, items(id, title, price, category, description, image_urls), profiles(*)')
    .order('created_at', { ascending: false })

  const reports = ((data ?? []) as ReportRow[]) ?? []
  const initialError = error?.message ?? ''

  return (
    <ReportsTableClient
      initialReports={JSON.parse(JSON.stringify(reports)) as ReportRow[]}
      initialError={initialError}
    />
  )
}
