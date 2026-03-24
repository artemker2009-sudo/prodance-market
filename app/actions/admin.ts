'use server'

import { createClient } from '@supabase/supabase-js'

import { supabaseAdmin } from '../lib/supabase-admin'
import type { Product } from '../lib/types'

const ADMIN_PASSWORD = 'Artem.ker.09'

function assertAdmin(password: string) {
  if (password !== ADMIN_PASSWORD) {
    throw new Error('Неверный пароль')
  }
}

function getStoragePath(imageUrl: string | null) {
  if (!imageUrl) {
    return null
  }

  try {
    const { pathname } = new URL(imageUrl)
    const marker = '/storage/v1/object/public/marketplace-images/'
    const pathIndex = pathname.indexOf(marker)

    if (pathIndex === -1) {
      return null
    }

    return decodeURIComponent(pathname.slice(pathIndex + marker.length))
  } catch {
    return null
  }
}

export async function getPendingProducts(password: string): Promise<Product[]> {
  assertAdmin(password)

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('*')
    .eq('is_approved', false)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function approveProduct(id: string, password: string) {
  assertAdmin(password)

  // Hand-written DB types are enough for reads here, but Supabase infers
  // `update()` as `never` for this table. Narrow the workaround to this call.
  const { error } = await (supabaseAdmin.from('products') as any)
    .update({ is_approved: true })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function rejectProduct(id: string, password: string) {
  assertAdmin(password)

  const { data, error } = await (supabaseAdmin.from('products') as any)
    .select('image_url')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  const imageUrl = data ? data.image_url : null
  const storagePath = getStoragePath(imageUrl)

  if (storagePath) {
    await supabaseAdmin.storage.from('marketplace-images').remove([storagePath])
  }

  const { error: deleteError } = await supabaseAdmin
    .from('products')
    .delete()
    .eq('id', id)

  if (deleteError) {
    throw new Error(deleteError.message)
  }
}

export async function deleteItemAsAdmin(itemId: string) {
  const supabaseAdminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await supabaseAdminClient.from('items').delete().eq('id', itemId)

  if (error) {
    throw new Error(error.message)
  }

  return { success: true }
}
