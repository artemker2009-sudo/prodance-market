import { Construction } from 'lucide-react'

export default function SearchPage() {
  return (
    <main className="px-4 py-6 text-slate-950">
      <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
        <Construction className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Раздел в разработке</h1>
        <p className="text-sm text-slate-500">
          Скоро здесь появится удобный поиск по всем танцевальным костюмам и аксессуарам.
        </p>
      </div>
    </main>
  )
}
