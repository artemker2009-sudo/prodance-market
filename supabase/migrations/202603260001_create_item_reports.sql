create table if not exists public.item_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table public.item_reports enable row level security;

drop policy if exists "Users can insert item reports" on public.item_reports;
create policy "Users can insert item reports"
  on public.item_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);
