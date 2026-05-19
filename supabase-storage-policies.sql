-- ============================================================
-- DJ-hub - Storage Supabase pour les photos artistes
-- ============================================================
-- A executer dans Supabase SQL Editor apres supabase-schema.sql.
-- Bucket attendu : artist-photos
-- Chemin d'upload conseille cote frontend :
--   user_id/profile-photo-timestamp.ext
--
-- Le frontend utilise uniquement l'anon public key. Pour le MVP, le bucket
-- peut etre public afin de simplifier l'affichage des photos validees.
-- Le site n'affiche publiquement une photo que si le profil artiste est approved.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-photos',
  'artist-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "artist_photos_artist_can_upload_own" on storage.objects;
create policy "artist_photos_artist_can_upload_own"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'artist-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "artist_photos_artist_can_read_own" on storage.objects;
create policy "artist_photos_artist_can_read_own"
on storage.objects for select to authenticated
using (
  bucket_id = 'artist-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "artist_photos_artist_can_update_own" on storage.objects;
create policy "artist_photos_artist_can_update_own"
on storage.objects for update to authenticated
using (
  bucket_id = 'artist-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'artist-photos'
  and auth.uid()::text = (storage.foldername(name))[1]
);

drop policy if exists "artist_photos_public_can_read_approved" on storage.objects;
create policy "artist_photos_public_can_read_approved"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'artist-photos'
  and exists (
    select 1
    from public.artist_profiles ap
    where ap.user_id::text = (storage.foldername(name))[1]
      and ap.status = 'approved'
  )
);

drop policy if exists "artist_photos_admin_can_read_all" on storage.objects;
create policy "artist_photos_admin_can_read_all"
on storage.objects for select to authenticated
using (
  bucket_id = 'artist-photos'
  and public.is_admin()
);

-- Variante plus restrictive possible : passer le bucket en prive et conserver
-- uniquement les policies de lecture ci-dessus. Pour le MVP GitHub Pages,
-- "Public bucket" est accepte, avec affichage public controle par status approved.
