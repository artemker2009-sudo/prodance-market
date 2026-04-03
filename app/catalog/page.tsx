export default function CatalogPage() {
  const categories = ['Женское', 'Мужское', 'Обувь']

  return (
    <main className="min-h-screen bg-white px-4 py-6 pb-24 text-slate-900 md:pb-6">
      <div className="mx-auto w-full max-w-[480px]">
        <h1 className="text-3xl font-semibold tracking-tight">Каталог</h1>
        <ul className="mt-6 space-y-3">
          {categories.map((category) => (
            <li
              key={category}
              className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium"
            >
              {category}
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
