-- ============================================================
--  Banana Shooter — схема облачного сохранения (Supabase)
--  Выполните этот файл в Supabase → SQL Editor → Run.
--  После этого скопируйте URL проекта и публичный anon-ключ
--  (Project Settings → API) в игре: АККАУНТ → НАСТРОЙКА ОБЛАКА.
-- ============================================================

-- таблица прогресса: одна строка на пользователя
create table if not exists public.player_saves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- доступ только к своей строке
alter table public.player_saves enable row level security;

drop policy if exists "player_saves_select_own" on public.player_saves;
create policy "player_saves_select_own" on public.player_saves
  for select using (auth.uid() = user_id);

drop policy if exists "player_saves_insert_own" on public.player_saves;
create policy "player_saves_insert_own" on public.player_saves
  for insert with check (auth.uid() = user_id);

drop policy if exists "player_saves_update_own" on public.player_saves;
create policy "player_saves_update_own" on public.player_saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "player_saves_delete_own" on public.player_saves;
create policy "player_saves_delete_own" on public.player_saves
  for delete using (auth.uid() = user_id);
