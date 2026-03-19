import { Search, SlidersHorizontal } from 'lucide-react'

const featuredCategories = [
  {
    name: 'Обувь',
    hint: 'Латина, стандарт, practice',
    accent: 'from-stone-100 via-white to-amber-50',
    placeholder: 'heels',
  },
  {
    name: 'Платья',
    hint: 'Сценические и турнирные',
    accent: 'from-rose-50 via-white to-stone-100',
    placeholder: 'silk',
  },
  {
    name: 'Мужское',
    hint: 'Фрачные и тренировочные образы',
    accent: 'from-slate-100 via-white to-neutral-100',
    placeholder: 'tailoring',
  },
  {
    name: 'Аксессуары',
    hint: 'Украшения, сумки, чехлы',
    accent: 'from-amber-50 via-white to-orange-50',
    placeholder: 'details',
  },
] as const

export default function SearchPage() {
  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-6 pb-28 text-slate-950 md:pb-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-8">
        <section className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
              Marketplace
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Поиск</h1>
          </div>

          <div className="rounded-[2rem] border border-slate-200/70 bg-white p-2 shadow-sm transition-shadow focus-within:shadow-[0_18px_40px_-28px_rgba(15,23,42,0.35)]">
            <div className="flex items-center gap-2">
              <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.5rem] px-4 py-3">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="search"
                  placeholder="Ищите платья, обувь и редкие находки"
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
                />
              </label>

              <button
                type="button"
                className="inline-flex h-12 shrink-0 items-center gap-2 rounded-[1.5rem] border border-slate-200/70 px-4 text-sm font-medium text-slate-950 transition hover:bg-slate-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span>Фильтры</span>
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">Популярное</h2>
            <span className="text-sm text-slate-500">Для быстрого старта</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {featuredCategories.map((category) => (
              <article
                key={category.name}
                className="overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white p-3 shadow-sm"
              >
                <div
                  className={`relative h-32 overflow-hidden rounded-[1.5rem] bg-gradient-to-br ${category.accent}`}
                >
                  <div className="absolute inset-4 rounded-[1.25rem] border border-white/80 bg-white/50" />
                  <div className="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
                    {category.placeholder}
                  </div>
                </div>
                <div className="space-y-1 px-1 pb-1 pt-4">
                  <h3 className="text-base font-semibold text-slate-950">{category.name}</h3>
                  <p className="text-sm leading-5 text-slate-500">{category.hint}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="flex flex-1 items-center">
          <div className="w-full rounded-[2rem] border border-slate-200/70 bg-white px-6 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-slate-200/70 text-slate-300">
              <Search className="h-7 w-7 stroke-[1.75]" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-950">
              Поиск танцевальных сокровищ
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Сформулируйте запрос или откройте популярные категории, чтобы начать.
            </p>
          </div>
        </section>
      </div>
    </main>
  )
}
