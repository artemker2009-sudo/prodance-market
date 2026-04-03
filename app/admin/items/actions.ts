"use server";

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../../lib/supabase-admin'

export async function markItemAsRead(itemId: string) {
  const { error } = await (supabaseAdmin.from('items') as any)
    .update({ is_read: true })
    .eq('id', itemId)

  if (error) {
    throw new Error(error.message || 'Не удалось отметить объявление как прочитанное')
  }

  revalidatePath('/admin')
  revalidatePath('/admin/items')
}
