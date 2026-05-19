# DJ-hub - Plan de migration Supabase

Le projet reste compatible GitHub Pages et fonctionne sans backend maison.

Étapes :

1. Garder les pages publiques statiques.
2. Configurer Supabase avec `supabase-schema.sql`.
3. Activer Auth email/password.
4. Remplacer les placeholders dans `assets/js/supabase-config.js`.
5. Créer le premier admin.
6. Valider manuellement les premiers profils artistes.
7. Ajouter ensuite le stockage photo Supabase si nécessaire.

La sécurité repose sur les policies RLS du schéma SQL.
