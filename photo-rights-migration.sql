-- ============================================================
-- DJ-hub - Droits photo artiste
-- ============================================================
-- A exécuter après supabase-schema.sql.
-- Les photos restent vérifiées avant publication publique.
-- ============================================================

alter table public.artist_profiles
  add column if not exists photo_rights_confirmed boolean default false,
  add column if not exists photo_rights_confirmed_at timestamptz,
  add column if not exists photo_rights_note text;

create index if not exists artist_profiles_photo_rights_idx
  on public.artist_profiles(photo_rights_confirmed);
