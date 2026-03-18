import type {
  DanceProgram,
  Product,
  ProductCategory,
  ProductCondition,
  ProductGender,
} from './types'
import { createSupabaseServerClient } from './supabase-server'

export type MarketplaceProduct = Pick<
  Product,
  'id' | 'title' | 'price' | 'image_url' | 'category' | 'condition' | 'program' | 'gender'
>

export type MarketplaceSearchParams = Record<
  string,
  string | string[] | undefined
>

export type MarketplaceSearchParamsInput =
  | Promise<MarketplaceSearchParams>
  | MarketplaceSearchParams

type MarketplaceFilters = {
  category?: ProductCategory
  condition?: ProductCondition
  program?: DanceProgram
  gender?: ProductGender
}

type FilterChip = {
  label: string
  key: keyof MarketplaceFilters | 'reset'
  value?: string
}

const categories: ProductCategory[] = ['турнирная', 'тренировочная']
const conditions: ProductCondition[] = ['новое', 'бу']
const programs: DanceProgram[] = ['стандарт', 'латина']
const genders: ProductGender[] = ['М', 'Ж', 'Дети']

export const marketplaceFilterChips: FilterChip[] = [
  { label: 'Все', key: 'reset' },
  { label: 'Турнирная', key: 'category', value: 'турнирная' },
  { label: 'Тренировочная', key: 'category', value: 'тренировочная' },
  { label: 'Новое', key: 'condition', value: 'новое' },
  { label: 'Б/у', key: 'condition', value: 'бу' },
  { label: 'Стандарт', key: 'program', value: 'стандарт' },
  { label: 'Латина', key: 'program', value: 'латина' },
]

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function isAllowedValue<T extends string>(
  allowedValues: readonly T[],
  value: string | undefined
): value is T {
  return value !== undefined && allowedValues.includes(value as T)
}

export async function resolveMarketplaceSearchParams(
  searchParams?: MarketplaceSearchParamsInput
) {
  return searchParams ? await Promise.resolve(searchParams) : {}
}

export function getMarketplaceFilters(
  params: MarketplaceSearchParams
): MarketplaceFilters {
  const category = getSingleParam(params.category)
  const condition = getSingleParam(params.condition)
  const program = getSingleParam(params.program)
  const gender = getSingleParam(params.gender)

  return {
    category: isAllowedValue(categories, category) ? category : undefined,
    condition: isAllowedValue(conditions, condition) ? condition : undefined,
    program: isAllowedValue(programs, program) ? program : undefined,
    gender: isAllowedValue(genders, gender) ? gender : undefined,
  }
}

export function buildMarketplaceHref(
  basePath: string,
  params: MarketplaceSearchParams,
  key: keyof MarketplaceFilters | 'reset',
  value?: string
) {
  if (key === 'reset') {
    return basePath
  }

  const nextParams = new URLSearchParams()

  Object.entries(params).forEach(([entryKey, entryValue]) => {
    if (entryKey === key || entryValue === undefined) {
      return
    }

    if (Array.isArray(entryValue)) {
      entryValue.forEach((item) => nextParams.append(entryKey, item))
      return
    }

    nextParams.set(entryKey, entryValue)
  })

  if (value) {
    nextParams.set(key, value)
  }

  const queryString = nextParams.toString()

  return queryString ? `${basePath}?${queryString}` : basePath
}

export async function getMarketplaceProducts(
  filters: MarketplaceFilters
): Promise<{ products: MarketplaceProduct[]; errorMessage: string | null }> {
  try {
    const supabase = await createSupabaseServerClient()

    let query = supabase
      .from('products')
      .select('id, title, price, image_url, category, condition, program, gender')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })

    if (filters.category) {
      query = query.eq('category', filters.category)
    }

    if (filters.condition) {
      query = query.eq('condition', filters.condition)
    }

    if (filters.program) {
      query = query.eq('program', filters.program)
    }

    if (filters.gender) {
      query = query.eq('gender', filters.gender)
    }

    const { data, error } = await query

    if (error) {
      return { products: [], errorMessage: error.message }
    }

    return { products: data ?? [], errorMessage: null }
  } catch (error) {
    return {
      products: [],
      errorMessage:
        error instanceof Error ? error.message : 'Не удалось загрузить каталог',
    }
  }
}
