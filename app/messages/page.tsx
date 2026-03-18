export default function MessagesPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 pb-28 text-center md:pb-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/70 bg-white/90 px-6 py-8 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-950 text-sm font-semibold tracking-[0.2em] text-white">
          MSG
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight text-neutral-950">
          Сообщения скоро появятся
        </h1>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          Здесь будет переписка между покупателями и продавцами. Для MVP экран
          уже подготовлен под нижнюю навигацию.
        </p>
      </section>
    </main>
  )
}
