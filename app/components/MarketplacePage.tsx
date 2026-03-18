import Link from 'next/link'

import {
  buildMarketplaceHref,
  getMarketplaceFilters,
  getMarketplaceProducts,
  marketplaceFilterChips,
  resolveMarketplaceSearchParams,
  type MarketplaceSearchParamsInput,
} from '../lib/marketplace'

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

export async function MarketplacePage({
  searchParams,
  basePath = '/',
}: {
  searchParams?: MarketplaceSearchParamsInput
  basePath?: string
}) {
  const resolvedSearchParams = await resolveMarketplaceSearchParams(searchParams)
  const filters = getMarketplaceFilters(resolvedSearchParams)
  const { products, errorMessage } = await getMarketplaceProducts(filters)
  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <main className="min-h-screen bg-[#f6f3ee] pb-28 text-slate-950 md:pb-0">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-[#f6f3ee]/95 backdrop-blur">
          <div className="px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-lg font-extrabold text-white shadow-lg shadow-slate-950/15">
                  N
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold tracking-[0.04em] text-slate-950">
                    ProDance Market
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    Танцевальный маркетплейс
                  </p>
                </div>
              </Link>

              <div className="ml-auto flex items-center gap-2">
                <Link
                  href="/market/create"
                  className="inline-flex h-10 items-center justify-center rounded-full bg-slate-950 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-fuchsia-700"
                >
                  Продать
                </Link>

                <Link
                  href="/profile"
                  aria-label="Профиль"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-fuchsia-200 hover:text-fuchsia-700"
                >
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 20 20"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                  >
                    <circle cx="10" cy="6.25" r="2.75" />
                    <path d="M4.5 16c1-2.7 3.03-4.05 5.5-4.05S14.5 13.3 15.5 16" />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="-mx-4 mt-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
              <div className="flex min-w-max gap-2">
                {marketplaceFilterChips.map((chip) => {
                  const isActive =
                    chip.key === 'reset'
                      ? !hasActiveFilters
                      : filters[chip.key] === chip.value

                  return (
                    <Link
                      key={`${chip.key}-${chip.value ?? 'all'}`}
                      href={buildMarketplaceHref(
                        basePath,
                        resolvedSearchParams,
                        chip.key,
                        chip.value
                      )}
                      className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition ${
                        isActive
                          ? 'border-slate-950 bg-slate-950 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-fuchsia-200 hover:text-fuchsia-700'
                      }`}
                    >
                      {chip.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </header>

        <section className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Каталог
              </h1>
              <p className="text-sm text-slate-500">
                Одобренные объявления для танцоров
              </p>
            </div>

            <p className="shrink-0 text-sm text-slate-500">
              {products.length} {products.length === 1 ? 'товар' : 'товаров'}
            </p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Каталог временно недоступен. Показываем пустое состояние, пока
              соединение не восстановится.
            </div>
          ) : null}

          {!products.length ? (
            <section className="flex min-h-[50vh] flex-col items-center justify-center rounded-[2rem] border border-dashed border-slate-300 bg-white/75 px-6 py-12 text-center shadow-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-950 text-2xl text-white">
                N
              </div>
              <h2 className="mt-5 text-xl font-semibold text-slate-950">
                Товаров пока нет
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
                Станьте первым, кто добавит товар, и откройте каталог для
                танцевального сообщества.
              </p>
              <Link
                href="/market/create"
                className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-fuchsia-700"
              >
                Добавить первый товар
              </Link>
            </section>
          ) : (
            <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_20px_45px_-35px_rgba(15,23,42,0.5)]"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="aspect-[3/4] w-full bg-slate-100 object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center bg-gradient-to-br from-slate-100 via-white to-fuchsia-50 px-4 text-center text-sm text-slate-400">
                      Фото появится после публикации
                    </div>
                  )}

                  <div className="space-y-2 p-3 sm:p-4">
                    <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {product.program}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1">
                        {product.condition}
                      </span>
                    </div>

                    <h2 className="min-h-10 text-sm font-semibold leading-5 text-slate-950 sm:min-h-12 sm:text-base">
                      {product.title}
                    </h2>

                    <div className="flex items-end justify-between gap-2">
                      <p className="text-base font-extrabold text-slate-950 sm:text-lg">
                        {formatPrice(product.price)} ₽
                      </p>
                      <p className="text-xs uppercase tracking-[0.08em] text-slate-400">
                        {product.gender}
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </section>
      </div>
    </main>
  )
}
