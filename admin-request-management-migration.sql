-- DJ-hub - Gestion admin des demandes client
-- A executer dans l'editeur SQL Supabase si votre base existe deja.
-- Permet a l'admin Supabase de supprimer une demande client depuis admin-validations.html.

grant delete on public.booking_requests to authenticated;

drop policy if exists "booking_requests_admin_can_delete" on public.booking_requests;
create policy "booking_requests_admin_can_delete"
on public.booking_requests for delete to authenticated
using (public.is_admin());
