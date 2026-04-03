"use server";

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '../../lib/supabase-admin'

export async function markAllDeletedAsRead() {
  const { error } = await (supabaseAdmin.from('deleted_items_stats') as any)
    .update({ is_read: true })
    .eq('is_read', false)

  if (error) {
    throw new Error(error.message || 'Не удалось отметить удаленные записи как прочитанные')
  }

  revalidatePath('/admin')
  revalidatePath('/admin/deleted')
}
