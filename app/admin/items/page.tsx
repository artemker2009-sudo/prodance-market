import { supabaseAdmin } from '../../lib/supabase-admin'
import ItemsTableClient from './ItemsTableClient'

type ItemRow = {
  id: string
  title: string
  price: number | null
  seller_id: string | null
  image_urls: string[] | null
  description?: string | null
  category?: string | null
  brand?: string | null
  condition?: string | null
  size?: string | null
  location_address?: string | null
  latitude?: number | null
  longitude?: number | null
  created_at?: string | null
  updated_at?: string | null
  [key: string]: unknown
}

export default async function AdminItemsPage() {
  const { data, error } = await (supabaseAdmin.from('items') as any)
    .select('*')
    .order('created_at', { ascending: false })

  const items = ((data ?? []) as ItemRow[]) ?? []
  const initialError = error?.message ?? ''

  return (
    <ItemsTableClient
      items={JSON.parse(JSON.stringify(items)) as ItemRow[]}
      initialError={initialError}
    />
  )
}
