const categories = ['Все', 'Тренировочное', 'Турнирное', 'Обувь']

const demoProducts = [
  {
    id: '1',
    title: 'Платье для стандарта с мягким сиянием',
    price: 24800,
    details: 'Размер 42 • Состояние: Отличное',
  },
  {
    id: '2',
    title: 'Латинский комплект для тренировок графитового оттенка',
    price: 6900,
    details: 'Размер 40 • Состояние: Новое',
  },
  {
    id: '3',
    title: 'Туфли для паркета с устойчивым каблуком',
    price: 11200,
    details: 'Размер 37 • Состояние: Отличное',
  },
  {
    id: '4',
    title: 'Турнирное платье с открытой линией спины',
    price: 31900,
    details: 'Размер 44 • Состояние: Отличное',
  },
  {
    id: '5',
    title: 'Боди и юбка для ежедневных тренировок',
    price: 5400,
    details: 'Размер 38 • Состояние: Хорошее',
  },
  {
    id: '6',
    title: 'Мужская рубашка для рейтинга и турниров',
    price: 8700,
    details: 'Размер 48 • Состояние: Отличное',
  },
] as const

function formatPrice(price: number) {
  return new Intl.NumberFormat('ru-RU').format(price)
}

function ProductPlaceholder() {
  return (
    <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl bg-gradient-to-br from-gray-100 via-gray-50 to-gray-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_transparent_48%),linear-gradient(160deg,rgba(255,255,255,0.45),rgba(229,231,235,0.75))]" />
      <div className="absolute inset-x-6 top-6 h-16 rounded-full bg-white/50 blur-2xl" />
      <div className="absolute inset-x-0 bottom-0 flex h-24 items-end justify-center pb-6">
        <div className="h-24 w-16 rounded-t-[999px] bg-white/60" />
      </div>
    </div>
  )
}

function ProductCard({
  product,
  accent,
}: {
  product: (typeof demoProducts)[number]
  accent: string
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
      <div className={accent}>
        <ProductPlaceholder />
      </div>

      <div className="flex min-h-[120px] flex-col px-3 pb-3 pt-2">
        <p className="mt-2 text-lg font-bold text-gray-900">
          {formatPrice(product.price)} ₽
        </p>
        <h2 className="mt-1 line-clamp-2 text-sm leading-5 text-gray-700">
          {product.title}
        </h2>
        <p className="mt-auto pt-3 text-xs text-gray-400">{product.details}</p>
      </div>
    </article>
  )
}

export default function HomePage() {
  const accents = [
    'bg-[#f3f4f6]',
    'bg-[#f5efe8]',
    'bg-[#eef2f7]',
    'bg-[#f5f0f3]',
    'bg-[#f1f5f9]',
    'bg-[#f7f3ed]',
  ]

  return (
    <main className="min-h-screen bg-[#fafafa] text-gray-900">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur">
        <div className="px-4 pb-4 pt-4">
          <div>
            <p className="text-xl font-semibold tracking-tight text-gray-950">
              ProDance
            </p>
          </div>

          <div className="no-scrollbar mt-4 overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {categories.map((category, index) => {
                const isActive = index === 0

                return (
                  <button
                    key={category}
                    type="button"
                    className={`rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                      isActive
                        ? 'bg-gray-950 text-white'
                        : 'border border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {category}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 px-4 pb-24 pt-4">
        {demoProducts.map((product, index) => (
          <ProductCard
            key={product.id}
            product={product}
            accent={accents[index % accents.length]}
          />
        ))}
      </section>
    </main>
  )
}
