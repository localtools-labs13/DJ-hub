-- DJ-hub - Suppression admin des profils artistes
-- A executer dans l'editeur SQL Supabase si votre base existe deja.
-- Permet uniquement aux comptes admin de supprimer un profil artiste depuis admin-validations.html.

grant delete on public.artist_profiles to authenticated;

drop policy if exists "artist_profiles_admin_can_delete" on public.artist_profiles;
create policy "artist_profiles_admin_can_delete"
on public.artist_profiles for delete to authenticated
using (public.is_admin());
