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

-- Rappel : le calcul interne de frais client reste admin-only.
-- Ne jamais afficher publiquement le pourcentage de frais.
