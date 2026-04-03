"use server";

import { revalidatePath } from 'next/cache'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../../lib/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

export async function dismissReport(reportId: string) {
  const { error } = await (supabaseAdmin.from('item_reports') as any)
    .update({ status: 'dismissed' })
    .eq('id', reportId)

  if (error) {
    throw new Error(error.message || 'Не удалось отклонить жалобу')
  }

  revalidatePath('/admin/reports')
}

export async function markReportAsRead(reportId: string) {
  const { error } = await (supabaseAdmin.from('item_reports') as any)
    .update({ is_read: true })
    .eq('id', reportId)

  if (error) {
    throw new Error(error.message || 'Не удалось отметить жалобу как прочитанную')
  }

  revalidatePath('/admin')
  revalidatePath('/admin/reports')
}

export async function deleteItemAndResolveReport(reportId: string, itemId: string, itemTitle: string) {
  const { data: itemData, error: itemError } = await (supabaseAdmin.from('items') as any)
    .select('user_id, title, price')
    .eq('id', itemId)
    .maybeSingle()

  if (itemError) {
    throw new Error(itemError.message || 'Не удалось получить данные товара')
  }

  const { error: updateReportError } = await (supabaseAdmin.from('item_reports') as any)
    .update({
      status: 'resolved',
      item_title_snapshot: itemTitle,
    })
    .eq('id', reportId)

  if (updateReportError) {
    throw new Error(updateReportError.message || 'Не удалось обновить статус жалобы')
  }

  const { error: deleteItemError } = await (supabaseAdmin.from('items') as any).delete().eq('id', itemId)

  if (deleteItemError) {
    throw new Error(deleteItemError.message || 'Не удалось удалить товар')
  }

  const { error: statsError } = await (supabaseAdmin.from('deleted_items_stats') as any).insert({
    seller_id: itemData?.user_id ?? null,
    title: itemTitle || itemData?.title || null,
    price: itemData?.price ?? null,
    reason: 'Удалено модератором',
  })

  if (statsError) {
    throw new Error(statsError.message || 'Не удалось сохранить статистику удаления')
  }

  revalidatePath('/admin/reports')
  revalidatePath('/admin/deleted')
}
