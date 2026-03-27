import { notFound } from 'next/navigation'

import { createSupabaseServerClient } from '../../lib/supabase-server'
import { ItemPageContent } from './item-page-content'

type ItemPageProps = {
  params: Promise<{
    id: string
  }>
}

type Item = {
  id: string
  title: string
  price: number
  image_urls: string[] | null
  created_at: string | null
  seller_id: string | null
  size: string | null
  gender: string | null
  category: string | null
  condition: string | null
  description: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
}

type SellerProfile = {
  id: string
  name: string | null
  avatar_url: string | null
  phone: string | null
}

function formatPublishedAt(dateValue: string | null | undefined) {
  if (!dateValue) {
    return 'Недавно'
  }

  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) {
    return 'Недавно'
  }

  const now = new Date()
  const dayStartNow = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayStartDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((dayStartNow.getTime() - dayStartDate.getTime()) / (24 * 60 * 60 * 1000))

  const timePart = new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)

  if (diffDays === 0) {
    return `Сегодня в ${timePart}`
  }

  if (diffDays === 1) {
    return `Вчера в ${timePart}`
  }

  const datePart = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
  }).format(date)

  return `${datePart} в ${timePart}`
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()
  const { data: item, error: itemError } = await (supabase.from('items') as any)
    .select('*')
    .eq('id', id)
    .single()

  if (itemError) {
    if (itemError.code === 'PGRST116') {
      notFound()
    }
    throw new Error(itemError.message)
  }

  let sellerProfile: SellerProfile | null = null
  if (item?.seller_id) {
    const { data: seller, error: sellerError } = await (supabase.from('profiles') as any)
      .select('id, name, avatar_url, phone')
      .eq('id', item.seller_id)
      .single()

    if (sellerError && sellerError.code !== 'PGRST116') {
      throw new Error(sellerError.message)
    }

    sellerProfile = (seller as SellerProfile | null) ?? null
  }

  return (
    <ItemPageContent
      item={{
        id: item.id,
        title: item.title || 'Без названия',
        price: item.price ?? 0,
        imageUrls: item.image_urls ?? [],
        createdAtText: formatPublishedAt(item.created_at),
        description: item.description?.trim() || 'Продавец пока не добавил описание для этого товара.',
        category: item.category || 'Не указана',
        gender: item.gender || 'Не указан',
        size: item.size || 'Не указан',
        condition: item.condition || 'Не указано',
        address: item.address?.trim() || 'Место не указано',
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        sellerId: item.seller_id ?? null,
      }}
      seller={{
        id: sellerProfile?.id ?? null,
        name: sellerProfile?.name?.trim() || 'Продавец',
        avatarUrl: sellerProfile?.avatar_url?.trim() || null,
        phone: sellerProfile?.phone?.trim() || null,
      }}
    />
  )
}
