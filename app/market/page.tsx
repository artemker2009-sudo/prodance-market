import { MarketplacePage } from '../components/MarketplacePage'
import type { MarketplaceSearchParamsInput } from '../lib/marketplace'

export default async function MarketPage({
  searchParams,
}: {
  searchParams?: MarketplaceSearchParamsInput
}) {
  return <MarketplacePage searchParams={searchParams} basePath="/market" />
}
