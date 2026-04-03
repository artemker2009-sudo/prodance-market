import { createSupabaseServerClient } from './lib/supabase-server'
import { HomePageClient } from './components/HomePageClient'

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  size: string | null
  gender: string | null
  category: string | null
  condition: string | null
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const [{ data: authData }, { data, error }] = await Promise.all([
    supabase.auth.getUser(),
    (supabase.from('items') as any)
      .select('*')
      .eq('is_active', true)
      .is('archive_reason', null)
      .order('created_at', { ascending: false }),
  ])
  const userId = authData.user?.id ?? null
  const favoriteIds = new Set<string>()

  if (userId) {
    const { data: favoritesRows } = await (supabase.from('favorites') as any)
      .select('item_id')
      .eq('user_id', userId)
    for (const row of (favoritesRows ?? []) as Array<{ item_id: string | null }>) {
      if (row.item_id) {
        favoriteIds.add(row.item_id)
      }
    }
  }

  const items = (data ?? []) as Item[]

  return (
    <HomePageClient
      initialItems={items}
      initialFavoriteIds={[...favoriteIds]}
      initialErrorMessage={error?.message ?? null}
    />
  )
}
