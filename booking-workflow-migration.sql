-- ============================================================
-- DJ-hub - Workflow demandes / réservation MVP
-- ============================================================
-- A exécuter après supabase-schema.sql.
-- Cette migration ajoute le pipeline admin, les champs de facturation
-- manuelle et l'historique booking_events.
-- ============================================================

alter table public.booking_requests
  add column if not exists admin_note text,
  add column if not exists artist_note text,
  add column if not exists client_note text,
  add column if not exists validated_dj_price numeric,
  add column if not exists service_fee numeric,
  add column if not exists total_client_price numeric,
  add column if not exists invoice_status text default 'not_sent',
  add column if not exists invoice_link text,
  add column if not exists invoice_note text,
  add column if not exists contacted_at timestamptz,
  add column if not exists sent_to_artist_at timestamptz,
  add column if not exists artist_responded_at timestamptz,
  add column if not exists confirmed_at timestamptz,
  add column if not exists paid_at timestamptz;

alter table public.booking_requests
  drop constraint if exists booking_requests_status_check;

-- Mise à jour éventuelle des anciennes valeurs de statut avant d'ajouter la nouvelle contrainte.
update public.booking_requests set status = 'artist_accepted' where status = 'accepted';
update public.booking_requests set status = 'artist_refused' where status = 'refused';
update public.booking_requests set status = 'contacted' where status = 'assigned';

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in (
    'new',
    'contacted',
    'sent_to_artist',
    'artist_accepted',
    'artist_refused',
    'client_confirmed',
    'invoice_sent',
    'paid',
    'confirmed',
    'cancelled'
  ));

alter table public.booking_requests
  drop constraint if exists booking_requests_invoice_status_check;

alter table public.booking_requests
  add constraint booking_requests_invoice_status_check
  check (invoice_status in ('not_sent', 'sent', 'paid', 'cancelled'));

create index if not exists booking_requests_invoice_status_idx
  on public.booking_requests(invoice_status);

create table if not exists public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid references public.booking_requests(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  event_type text not null,
  note text,
  created_at timestamptz default now()
);

create index if not exists booking_events_booking_request_id_idx
  on public.booking_events(booking_request_id);

grant select, insert on public.booking_events to authenticated;

alter table public.booking_events enable row level security;

create or replace function public.protect_booking_request_artist_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.artist_profile_id is distinct from new.artist_profile_id
    or old.client_user_id is distinct from new.client_user_id
    or old.client_name is distinct from new.client_name
    or old.client_email is distinct from new.client_email
    or old.client_phone is distinct from new.client_phone
    or old.requester_type is distinct from new.requester_type
    or old.city is distinct from new.city
    or old.event_date is distinct from new.event_date
    or old.start_time is distinct from new.start_time
    or old.duration is distinct from new.duration
    or old.event_type is distinct from new.event_type
    or old.venue_type is distinct from new.venue_type
    or old.guests is distinct from new.guests
    or old.music_style is distinct from new.music_style
    or old.budget is distinct from new.budget
    or old.sound_system is distinct from new.sound_system
    or old.lights_needed is distinct from new.lights_needed
    or old.material_needed is distinct from new.material_needed
    or old.message is distinct from new.message
    or old.admin_note is distinct from new.admin_note
    or old.artist_note is distinct from new.artist_note
    or old.client_note is distinct from new.client_note
    or old.validated_dj_price is distinct from new.validated_dj_price
    or old.service_fee is distinct from new.service_fee
    or old.total_client_price is distinct from new.total_client_price
    or old.invoice_status is distinct from new.invoice_status
    or old.invoice_link is distinct from new.invoice_link
    or old.invoice_note is distinct from new.invoice_note
    or old.contacted_at is distinct from new.contacted_at
    or old.sent_to_artist_at is distinct from new.sent_to_artist_at
    or old.confirmed_at is distinct from new.confirmed_at
    or old.paid_at is distinct from new.paid_at then
    raise exception 'Modification de demande non autorisee.';
  end if;

  if new.status not in ('artist_accepted', 'artist_refused') then
    raise exception 'Statut artiste non autorise.';
  end if;

  return new;
end;
$$;

drop trigger if exists booking_requests_protect_artist_update on public.booking_requests;
create trigger booking_requests_protect_artist_update
before update on public.booking_requests
for each row execute function public.protect_booking_request_artist_update();

drop policy if exists "booking_events_admin_can_read" on public.booking_events;
create policy "booking_events_admin_can_read"
on public.booking_events for select
using (public.is_admin());

drop policy if exists "booking_events_admin_can_insert" on public.booking_events;
create policy "booking_events_admin_can_insert"
on public.booking_events for insert
with check (public.is_admin());

drop policy if exists "booking_events_artist_can_read_related" on public.booking_events;
create policy "booking_events_artist_can_read_related"
on public.booking_events for select
using (
  exists (
    select 1
    from public.booking_requests br
    join public.artist_profiles ap on ap.id = br.artist_profile_id
    where br.id = booking_events.booking_request_id
      and ap.user_id = auth.uid()
  )
);

drop policy if exists "booking_events_artist_can_insert_related_response" on public.booking_events;
create policy "booking_events_artist_can_insert_related_response"
on public.booking_events for insert
with check (
  actor_user_id = auth.uid()
  and actor_role = 'artist'
  and event_type in ('artist_accepted', 'artist_refused')
  and exists (
    select 1
    from public.booking_requests br
    join public.artist_profiles ap on ap.id = br.artist_profile_id
    where br.id = booking_events.booking_request_id
      and ap.user_id = auth.uid()
      and ap.status = 'approved'
  )
);

drop policy if exists "booking_requests_artist_can_update_related_response" on public.booking_requests;
create policy "booking_requests_artist_can_update_related_response"
on public.booking_requests for update to authenticated
using (
  artist_profile_id is not null
  and exists (
    select 1
    from public.artist_profiles ap
    where ap.id = artist_profile_id
      and ap.user_id = auth.uid()
      and ap.status = 'approved'
  )
)
with check (
  status in ('artist_accepted', 'artist_refused')
  and artist_profile_id is not null
  and exists (
    select 1
    from public.artist_profiles ap
    where ap.id = artist_profile_id
      and ap.user_id = auth.uid()
      and ap.status = 'approved'
  )
);

drop policy if exists "booking_requests_anon_can_create" on public.booking_requests;
create policy "booking_requests_anon_can_create"
on public.booking_requests for insert to anon
with check (
  status = 'new'
  and client_user_id is null
  and admin_note is null
  and artist_note is null
  and client_note is null
  and validated_dj_price is null
  and service_fee is null
  and total_client_price is null
  and coalesce(invoice_status, 'not_sent') = 'not_sent'
  and invoice_link is null
  and invoice_note is null
  and contacted_at is null
  and sent_to_artist_at is null
  and artist_responded_at is null
  and confirmed_at is null
  and paid_at is null
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
  and admin_note is null
  and artist_note is null
  and client_note is null
  and validated_dj_price is null
  and service_fee is null
  and total_client_price is null
  and coalesce(invoice_status, 'not_sent') = 'not_sent'
  and invoice_link is null
  and invoice_note is null
  and contacted_at is null
  and sent_to_artist_at is null
  and artist_responded_at is null
  and confirmed_at is null
  and paid_at is null
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

-- Rappel : le calcul interne de frais client reste admin-only.
-- Ne jamais afficher publiquement le pourcentage de frais.
