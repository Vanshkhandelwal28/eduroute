-- EduRoute minimal Supabase schema (500–600 students, free-tier friendly)
-- Run once in Supabase → SQL Editor.
-- Auth passwords live in auth.users (Supabase Auth). We only store public profile data.

-- 1) Profiles (one row per user)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null,
  username text not null,
  avatar_url text,
  bio text not null default '',
  role text not null default 'student',
  -- Compact public page payload only (skills, path summary, xp, certs)
  public_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create unique index if not exists profiles_email_lower_idx
  on public.profiles (lower(email));

-- 2) Auto-update updated_at
create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_profiles_updated_at();

-- 3) RLS
alter table public.profiles enable row level security;

-- Anyone can read a public profile by username (LeetCode-style share)
drop policy if exists "Public profiles are readable" on public.profiles;
create policy "Public profiles are readable"
  on public.profiles for select
  using (true);

-- Users manage their own row
drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 4) Optional: auto-create profile on signup (backup if client insert fails)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  n int := 0;
begin
  base_username := lower(regexp_replace(
    split_part(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), ' ', 1),
    '[^a-z0-9_]', '', 'g'
  ));
  if length(base_username) < 3 then
    base_username := 'user' || substr(replace(new.id::text, '-', ''), 1, 6);
  end if;
  base_username := left(base_username, 20);
  final_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = final_username) loop
    n := n + 1;
    final_username := left(base_username, 20) || n::text;
  end loop;

  insert into public.profiles (id, email, name, username, avatar_url, bio, role, public_data)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    final_username,
    new.raw_user_meta_data->>'avatar_url',
    '',
    'student',
    '{}'::jsonb
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Space note: ~600 rows × small jsonb ≈ well under free tier DB limits.
