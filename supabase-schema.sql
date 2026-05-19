-- ============================================================
-- DJ-hub - Schema Supabase
-- ============================================================
-- Marketplace de mise en relation entre clients, petits lieux et DJs.
-- Securite : Row Level Security activee sur toutes les tables.
-- Frontend : utiliser uniquement l'anon public key Supabase.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- Helpers
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- 1. Comptes utilisateurs applicatifs
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'client',
  full_name text,
  created_at timestamptz not null default now(),
  constraint profiles_role_check check (role in ('artist', 'client', 'admin'))
);

create index if not exists profiles_role_idx on public.profiles (role);

-- Cree un profil quand un utilisateur Supabase Auth s'inscrit.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'client');
  if requested_role not in ('artist', 'client') then
    requested_role := 'client';
  end if;

  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    requested_role,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Retourne true si l'utilisateur connecte est admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Empeche un utilisateur non admin de changer son role.
create or replace function public.prevent_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if old.role is distinct from new.role and not public.is_admin() then
    raise exception 'Modification du role interdite.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_prevent_role_change on public.profiles;
create trigger profiles_prevent_role_change
before update on public.profiles
for each row execute function public.prevent_profile_role_change();

-- ============================================================
-- 2. Profils artistes
-- ============================================================

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  artist_name text not null,
  slug text unique,
  city text not null,
  styles text[] default '{}',
  price_from integer,
  material boolean default false,
  bio text,
  experience text,
  zones text[] default '{}',
  event_types text[] default '{}',
  instagram text,
  soundcloud text,
  mixcloud text,
  legal_status text,
  status text not null default 'pending',
  admin_note text,
  public_image_url text,
  photo_url text,
  photo_credit text,
  photo_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_profiles_status_check check (status in ('pending', 'approved', 'rejected', 'needs_changes')),
  constraint artist_profiles_price_check check (price_from is null or price_from >= 0)
);

create index if not exists artist_profiles_user_id_idx on public.artist_profiles (user_id);
create index if not exists artist_profiles_status_idx on public.artist_profiles (status);
create index if not exists artist_profiles_city_idx on public.artist_profiles (city);

drop trigger if exists artist_profiles_set_updated_at on public.artist_profiles;
create trigger artist_profiles_set_updated_at
before update on public.artist_profiles
for each row execute function public.set_updated_at();

create or replace function public.is_artist_owner(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.artist_profiles ap
    where ap.id = profile_id
      and ap.user_id = auth.uid()
  );
$$;

-- Un artiste ne peut pas s'approuver lui-meme ni modifier la note admin.
create or replace function public.protect_artist_review_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if session_user in ('postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending';
    new.admin_note := null;
  elsif tg_op = 'UPDATE' then
    new.status := 'pending';
    new.admin_note := old.admin_note;
  end if;

  return new;
end;
$$;

drop trigger if exists artist_profiles_protect_review_fields on public.artist_profiles;
create trigger artist_profiles_protect_review_fields
before insert or update on public.artist_profiles
for each row execute function public.protect_artist_review_fields();

-- ============================================================
-- 3. Disponibilites calendrier
-- ============================================================

create table if not exists public.artist_availability (
  id uuid primary key default gen_random_uuid(),
  artist_profile_id uuid not null references public.artist_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'available',
  note text,
  created_at timestamptz not null default now(),
  constraint artist_availability_status_check check (status in ('available', 'option', 'busy')),
  constraint artist_availability_dates_check check (end_at > start_at)
);

create index if not exists artist_availability_artist_profile_id_idx on public.artist_availability (artist_profile_id);
create index if not exists artist_availability_user_id_idx on public.artist_availability (user_id);
create index if not exists artist_availability_start_at_idx on public.artist_availability (start_at);
create index if not exists artist_availability_end_at_idx on public.artist_availability (end_at);

-- ============================================================
-- 4. Demandes clients
-- ============================================================

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  artist_profile_id uuid references public.artist_profiles(id) on delete set null,
  client_user_id uuid references auth.users(id) on delete set null,
  client_name text not null,
  client_email text not null,
  client_phone text,
  requester_type text,
  city text not null,
  event_date date not null,
  start_time time,
  duration text,
  event_type text,
  venue_type text,
  guests integer,
  music_style text,
  budget text,
  sound_system text,
  lights_needed text,
  material_needed text,
  message text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint booking_requests_status_check check (status in ('new', 'sent_to_artist', 'accepted', 'refused', 'contacted', 'assigned', 'confirmed', 'cancelled')),
  constraint booking_requests_guests_check check (guests is null or guests > 0)
);

create index if not exists booking_requests_artist_profile_id_idx on public.booking_requests (artist_profile_id);
create index if not exists booking_requests_status_idx on public.booking_requests (status);
create index if not exists booking_requests_event_date_idx on public.booking_requests (event_date);

-- ============================================================
-- Grants necessaires pour l'API Supabase
-- Les policies RLS restent la vraie barriere de securite.
-- ============================================================

grant usage on schema public to anon, authenticated;
grant select on public.artist_profiles to anon, authenticated;
grant select on public.artist_availability to anon, authenticated;
grant insert on public.booking_requests to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant insert, update on public.artist_profiles to authenticated;
grant insert, update, delete on public.artist_availability to authenticated;
grant select, update on public.booking_requests to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_artist_owner(uuid) to anon, authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.artist_profiles enable row level security;
alter table public.artist_availability enable row level security;
alter table public.booking_requests enable row level security;

-- profiles
drop policy if exists "profiles_owner_can_read" on public.profiles;
create policy "profiles_owner_can_read"
on public.profiles for select to authenticated
using (id = auth.uid());

drop policy if exists "profiles_owner_can_insert" on public.profiles;
create policy "profiles_owner_can_insert"
on public.profiles for insert to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_owner_can_update_except_role" on public.profiles;
create policy "profiles_owner_can_update_except_role"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "profiles_admin_can_read_all" on public.profiles;
create policy "profiles_admin_can_read_all"
on public.profiles for select to authenticated
using (public.is_admin());

-- artist_profiles
drop policy if exists "artist_profiles_public_can_read_approved" on public.artist_profiles;
create policy "artist_profiles_public_can_read_approved"
on public.artist_profiles for select to anon, authenticated
using (status = 'approved');

drop policy if exists "artist_profiles_artist_can_read_own" on public.artist_profiles;
create policy "artist_profiles_artist_can_read_own"
on public.artist_profiles for select to authenticated
using (user_id = auth.uid());

drop policy if exists "artist_profiles_artist_can_create_own" on public.artist_profiles;
create policy "artist_profiles_artist_can_create_own"
on public.artist_profiles for insert to authenticated
with check (user_id = auth.uid() and status <> 'approved');

drop policy if exists "artist_profiles_artist_can_update_own" on public.artist_profiles;
create policy "artist_profiles_artist_can_update_own"
on public.artist_profiles for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and status <> 'approved');

drop policy if exists "artist_profiles_admin_can_read_all" on public.artist_profiles;
create policy "artist_profiles_admin_can_read_all"
on public.artist_profiles for select to authenticated
using (public.is_admin());

drop policy if exists "artist_profiles_admin_can_update_validation" on public.artist_profiles;
create policy "artist_profiles_admin_can_update_validation"
on public.artist_profiles for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- artist_availability
drop policy if exists "artist_availability_public_can_read_available_approved" on public.artist_availability;
create policy "artist_availability_public_can_read_available_approved"
on public.artist_availability for select to anon, authenticated
using (
  status in ('available', 'option')
  and exists (
    select 1
    from public.artist_profiles ap
    where ap.id = artist_profile_id
      and ap.status = 'approved'
  )
);

drop policy if exists "artist_availability_artist_can_read_own" on public.artist_availability;
create policy "artist_availability_artist_can_read_own"
on public.artist_availability for select to authenticated
using (user_id = auth.uid());

drop policy if exists "artist_availability_artist_can_create_own" on public.artist_availability;
create policy "artist_availability_artist_can_create_own"
on public.artist_availability for insert to authenticated
with check (user_id = auth.uid() and public.is_artist_owner(artist_profile_id));

drop policy if exists "artist_availability_artist_can_update_own" on public.artist_availability;
create policy "artist_availability_artist_can_update_own"
on public.artist_availability for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and public.is_artist_owner(artist_profile_id));

drop policy if exists "artist_availability_artist_can_delete_own" on public.artist_availability;
create policy "artist_availability_artist_can_delete_own"
on public.artist_availability for delete to authenticated
using (user_id = auth.uid());

drop policy if exists "artist_availability_admin_can_read_all" on public.artist_availability;
create policy "artist_availability_admin_can_read_all"
on public.artist_availability for select to authenticated
using (public.is_admin());

-- booking_requests
drop policy if exists "booking_requests_anon_can_create" on public.booking_requests;
create policy "booking_requests_anon_can_create"
on public.booking_requests for insert to anon
with check (
  status = 'new'
  and client_user_id is null
  and (
    artist_profile_id is null
    or exists (
      select 1
      from public.artist_profiles ap
      where ap.id = artist_profile_id
        and ap.status = 'approved'
    )
  )
);

drop policy if exists "booking_requests_client_can_create" on public.booking_requests;
create policy "booking_requests_client_can_create"
on public.booking_requests for insert to authenticated
with check (
  status = 'new'
  and (client_user_id is null or client_user_id = auth.uid())
  and (
    artist_profile_id is null
    or exists (
      select 1
      from public.artist_profiles ap
      where ap.id = artist_profile_id
        and ap.status = 'approved'
    )
  )
);

drop policy if exists "booking_requests_admin_can_read_all" on public.booking_requests;
create policy "booking_requests_admin_can_read_all"
on public.booking_requests for select to authenticated
using (public.is_admin());

drop policy if exists "booking_requests_artist_can_read_related" on public.booking_requests;
create policy "booking_requests_artist_can_read_related"
on public.booking_requests for select to authenticated
using (
  artist_profile_id is not null
  and exists (
    select 1
    from public.artist_profiles ap
    where ap.id = artist_profile_id
      and ap.user_id = auth.uid()
      and ap.status = 'approved'
  )
);

drop policy if exists "booking_requests_admin_can_update_status" on public.booking_requests;
create policy "booking_requests_admin_can_update_status"
on public.booking_requests for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ============================================================
-- Pour créer le premier admin :
-- 1. créer un compte via inscription-artiste.html ou connexion Supabase
-- 2. exécuter :
-- update public.profiles set role = 'admin' where email = 'TON_EMAIL';
-- ============================================================
