-- DJ-hub - Champs complets du questionnaire artiste
-- A executer dans l'editeur SQL Supabase si votre base existe deja.
-- Corrige notamment l'erreur :
-- Could not find the 'cdj_ready' column of 'artist_profiles' in the schema cache

alter table public.artist_profiles add column if not exists public_image_url text;
alter table public.artist_profiles add column if not exists photo_url text;
alter table public.artist_profiles add column if not exists photo_credit text;
alter table public.artist_profiles add column if not exists photo_note text;
alter table public.artist_profiles add column if not exists photo_authorized boolean default false;

alter table public.artist_profiles add column if not exists youtube text;
alter table public.artist_profiles add column if not exists website text;
alter table public.artist_profiles add column if not exists influences text;
alter table public.artist_profiles add column if not exists set_formats text[] default '{}';
alter table public.artist_profiles add column if not exists references_text text;
alter table public.artist_profiles add column if not exists preferred_vibe text;

alter table public.artist_profiles add column if not exists sound_system text;
alter table public.artist_profiles add column if not exists lights_needed text;
alter table public.artist_profiles add column if not exists controller_available boolean default false;
alter table public.artist_profiles add column if not exists cdj_ready boolean default false;
alter table public.artist_profiles add column if not exists controller_ready boolean default false;
alter table public.artist_profiles add column if not exists technical_notes text;

alter table public.artist_profiles add column if not exists photo_rights_confirmed boolean default false;
alter table public.artist_profiles add column if not exists photo_rights_confirmed_at timestamptz;
alter table public.artist_profiles add column if not exists photo_rights_note text;

-- Force Supabase/PostgREST a recharger le cache de schema apres ajout des colonnes.
notify pgrst, 'reload schema';
