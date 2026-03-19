import { Mailbox } from 'lucide-react'

const chats: Array<{
  id: string
  name: string
  preview: string
  time: string
}> = []

export default function MessagesPage() {
  return (
    <main className="min-h-screen bg-[#faf7f3] px-4 py-6 pb-28 md:pb-10">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <header className="space-y-2">
          <p className="text-sm font-medium tracking-[0.18em] text-slate-500 uppercase">
            Inbox
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Сообщения</h1>
        </header>

        <section className="rounded-[2rem] border border-slate-200/70 bg-white shadow-sm">
          {chats.length ? (
            <ul className="divide-y divide-slate-200/70">
              {chats.map((chat) => (
                <li key={chat.id} className="flex items-center gap-4 px-4 py-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                    {chat.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-base font-semibold text-slate-950">{chat.name}</p>
                      <span className="shrink-0 text-xs text-slate-500">{chat.time}</span>
                    </div>
                    <p className="truncate text-sm text-slate-500">{chat.preview}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex min-h-[28rem] flex-col items-center justify-center px-6 py-10 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border border-slate-200/70 bg-[#faf7f3] text-slate-400">
                <Mailbox className="h-9 w-9 stroke-[1.75]" />
              </div>
              <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-950">
                Ваши переписки появятся здесь
              </h2>
              <p className="mt-3 max-w-xs text-sm leading-6 text-slate-500">
                Когда начнете обсуждать покупку или продажу, все диалоги аккуратно
                соберутся в этом разделе.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
