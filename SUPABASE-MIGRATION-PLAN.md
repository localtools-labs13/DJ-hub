# BookTonDJ V2 - Plan de migration Supabase

## Etat actuel

BookTonDJ est une V1 statique HTML/CSS/JS vanilla.

- Les artistes affiches publiquement viennent de `assets/js/data.js`.
- Le rendu public est gere par `assets/js/main.js`.
- Les formulaires Formspree existants restent en place.
- Les placeholders Stripe restent en place.
- Les pages `djs.html` et `dj.html` ne sont pas modifiees massivement dans cette etape.

## Selecteurs utilises par `main.js` a preserver

Classes structurelles :

- `artist-card`
- `artist-media`
- `artist-placeholder`
- `artist-placeholder-large`
- `artist-card-body`
- `badge`
- `badge-row`
- `artist-detail`
- `artist-detail-media`
- `artist-detail-content`
- `detail-grid`
- `detail-panel`
- `popular-artists`
- `artists-grid`
- `artist-filters`
- `selected-dj-box`
- `admin-stats`
- `admin-requests`
- `admin-artists`

IDs et attributs fonctionnels :

- `site-nav`
- `popular-artists`
- `artists-grid`
- `artist-filters`
- `filter-search`
- `filter-city`
- `filter-style`
- `filter-budget`
- `filter-event`
- `filter-material`
- `results-count`
- `artist-detail`
- `selected-dj-box`
- `selected-dj-input`
- `admin-stats`
- `admin-requests`
- `admin-artists`
- `data-form`
- `data-form-feedback`

## Architecture V2 ajoutee

Fichiers ajoutes :

- `supabase-schema.sql` : tables, contraintes et RLS.
- `assets/js/supabase-config.js` : configuration publique Supabase.
- `assets/js/supabase-auth.js` : connexion, inscription, espace artiste, questionnaire, disponibilites.
- `connexion.html` : connexion artiste.
- `inscription.html` : creation de compte artiste.
- `espace-artiste.html` : espace artiste protege.
- `questionnaire-artiste.html` : questionnaire artiste protege.

## Securite

- Utiliser uniquement la `anon key` cote frontend.
- Ne jamais mettre de `service_role` dans le code public.
- Activer Row Level Security sur toutes les tables sensibles.
- Les artistes peuvent lire/modifier uniquement leurs propres donnees non validees.
- Les profils publics ne sont visibles que si `status = 'approved'` et `published = true`.
- La validation admin se fait via une table `admin_users` et une fonction SQL `is_admin()`.
- L'ajout d'un admin se fait manuellement dans Supabase, pas depuis le frontend public.

## Migration progressive

1. Installer `supabase-schema.sql` dans Supabase.
2. Remplir `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans `assets/js/supabase-config.js`.
3. Tester inscription et connexion artiste.
4. Tester le questionnaire artiste : il doit creer ou mettre a jour un profil en `pending_review`.
5. Valider un profil dans Supabase en passant `status` a `approved` et `published` a `true`.
6. Dans une future etape, remplacer progressivement `data.js` par une lecture Supabase des profils publics approuves.
7. Dans une future etape, enregistrer aussi les demandes client dans `booking_requests`, tout en gardant Formspree si souhaite.

## Sources techniques

Cette architecture suit les pratiques Supabase documentees :

- Auth JavaScript : `supabase.auth.signUp`, `supabase.auth.signInWithPassword`, `supabase.auth.getSession`.
- RLS PostgreSQL avec `auth.uid()` et policies par table.
