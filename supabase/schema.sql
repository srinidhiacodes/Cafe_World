-- Cafe Passport database setup.
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run once on a new project.

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 30),
  plan text not null default 'free',
  created_at timestamptz not null default now()
);

-- ---------- Cafes (one row = one polaroid) ----------
create table if not exists public.cafes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  area text not null default '' check (char_length(area) <= 60),
  city text not null check (char_length(city) between 1 and 80),
  country text not null default '' check (char_length(country) <= 80),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  google_place_id text,
  maps_url text check (maps_url is null or maps_url like 'https://%'),
  ordered text not null default '' check (char_length(ordered) <= 80),
  rating smallint not null check (rating between 1 and 5),
  vibe text not null check (vibe in ('Aesthetic', 'Work-friendly', 'Budget', 'Date spot')),
  note text not null default '' check (char_length(note) <= 200),
  kind text not null default 'cup' check (kind in ('cup', 'iced', 'filter')),
  visited_on date not null default current_date check (visited_on <= current_date + 1),
  created_at timestamptz not null default now()
);
create index if not exists cafes_user_visited_idx on public.cafes (user_id, visited_on desc);

-- ---------- Photos (files live in Storage, rows point to them) ----------
create table if not exists public.cafe_photos (
  id uuid primary key default gen_random_uuid(),
  cafe_id uuid not null references public.cafes (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  storage_path text not null,
  position smallint not null default 0 check (position between 0 and 5),
  created_at timestamptz not null default now()
);
create index if not exists cafe_photos_cafe_idx on public.cafe_photos (cafe_id, position);

-- ---------- Row Level Security: everyone sees only their own rows ----------
alter table public.profiles enable row level security;
alter table public.cafes enable row level security;
alter table public.cafe_photos enable row level security;

create policy "own profile: read"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "own cafes: read"   on public.cafes for select to authenticated using (user_id = (select auth.uid()));
create policy "own cafes: add"    on public.cafes for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own cafes: edit"   on public.cafes for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "own cafes: delete" on public.cafes for delete to authenticated using (user_id = (select auth.uid()));

create policy "own photos: read"   on public.cafe_photos for select to authenticated using (user_id = (select auth.uid()));
create policy "own photos: add"    on public.cafe_photos for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.cafes c where c.id = cafe_id and c.user_id = (select auth.uid())));
create policy "own photos: delete" on public.cafe_photos for delete to authenticated using (user_id = (select auth.uid()));

-- ---------- Create a profile automatically on first sign-in ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 30))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Private photo bucket: each user gets their own folder ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafe-photos', 'cafe-photos', false, 5242880, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;

create policy "own photo files: read" on storage.objects for select to authenticated
  using (bucket_id = 'cafe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photo files: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "own photo files: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'cafe-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
