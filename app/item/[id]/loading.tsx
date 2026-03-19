function LoadingBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/80 ${className}`} />
}

export default function ItemLoadingPage() {
  return (
    <main className="min-h-screen bg-slate-50 pb-40 md:pb-32">
      <div className="aspect-[3/4] w-full animate-pulse bg-slate-200/70" />

      <section className="relative z-10 -mt-6 rounded-t-3xl bg-white px-4 pb-8 pt-6">
        <LoadingBlock className="h-10 w-36 rounded-xl" />
        <LoadingBlock className="mt-3 h-5 w-2/3 rounded-lg" />

        <div className="mt-5 flex flex-wrap gap-2">
          <LoadingBlock className="h-8 w-28 rounded-lg" />
          <LoadingBlock className="h-8 w-32 rounded-lg" />
          <LoadingBlock className="h-8 w-24 rounded-lg" />
        </div>

        <div className="mt-8 space-y-3">
          <LoadingBlock className="h-5 w-24 rounded-lg" />
          <LoadingBlock className="h-4 w-full rounded-lg" />
          <LoadingBlock className="h-4 w-[92%] rounded-lg" />
          <LoadingBlock className="h-4 w-[78%] rounded-lg" />
        </div>
      </section>

      <div className="fixed bottom-16 left-1/2 z-40 w-full max-w-[480px] -translate-x-1/2 border-t border-slate-200 bg-white px-4 py-4 pb-safe md:bottom-0">
        <LoadingBlock className="h-14 w-full rounded-2xl bg-slate-300" />
      </div>
    </main>
  )
}
