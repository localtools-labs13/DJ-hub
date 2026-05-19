# DJ-hub

DJ-hub est une marketplace statique HTML/CSS/JavaScript vanilla pour aider les particuliers et petits lieux à trouver un DJ fiable pour une soirée privée, un anniversaire, une villa, un rooftop privé, une garden party, un petit bar ou un remplacement DJ.

Le site reste compatible GitHub Pages : pas de React, pas de backend maison. Le backend applicatif est Supabase.

## Architecture

- GitHub Pages pour l’hébergement statique.
- Supabase Auth pour les comptes artistes et admin.
- Supabase Database pour profils, disponibilités, presskits et demandes.
- Supabase Storage pour les photos artistes.
- FullCalendar via CDN pour le calendrier artiste.
- Formspree peut rester actif comme fallback email pour les formulaires publics.

## Tables Supabase

Le fichier principal est `supabase-schema.sql`.

Tables :
- `profiles`
- `artist_profiles`
- `artist_availability`
- `booking_requests`
- `artist_presskits`

La sécurité repose sur Row Level Security. Le public voit uniquement les artistes `approved` et les presskits liés à des artistes `approved`.

## Storage Supabase

Fichier dédié : `supabase-storage-policies.sql`.

Bucket attendu :
- `artist-photos`

Formats acceptés :
- JPG
- PNG
- WebP

Taille maximum côté frontend et Storage : 5 Mo.

Champs utilisés :
- `artist_profiles.public_image_url` pour la photo uploadée dans Supabase Storage.
- `artist_profiles.photo_url` comme fallback pour un lien photo, Google Drive, site, Instagram ou presskit externe.

La photo n’est affichée publiquement par le site que si le profil artiste est `approved`.
Quand un artiste modifie sa photo ou son questionnaire, le profil repasse en `pending` pour validation.

### Créer le bucket Storage

1. Supabase → Storage.
2. New bucket.
3. Name : `artist-photos`.
4. Public bucket : ON pour MVP.
5. Save.
6. Appliquer `supabase-storage-policies.sql` si vous voulez conserver les restrictions d’écriture, taille et formats.

Pour le MVP, le bucket peut être public pour simplifier l’affichage des photos. Le contrôle public principal reste applicatif : seuls les profils artistes `approved` sont chargés par `djs.html`, `dj.html` et `presskit-public.html`.

Chemin d’upload utilisé par le frontend :

```text
user_id/profile-photo-timestamp.ext
```

## Confirmation email

Resend est utilisé comme SMTP pour les emails Supabase Auth.

Réglages conseillés dans Supabase :
- Sender email : `noreply@dj-hub.fr`
- Site URL : `https://dj-hub.fr/`
- Redirect URLs :
  - `https://dj-hub.fr/**`
  - `https://www.dj-hub.fr/**`
  - `https://localtools-labs13.github.io/DJ-hub/**`
  - `http://localhost:8000/**`

La redirection d’inscription artiste côté frontend pointe vers :

```text
https://dj-hub.fr/connexion.html
```

Problèmes fréquents :
- ancien lien de confirmation vers `localhost` dans Supabase Auth ;
- email non confirmé avant connexion ;
- mauvais mot de passe ;
- limite temporaire d’envoi d’emails côté Supabase/Resend.

## Parcours artiste

1. L’artiste crée un compte sur `inscription-artiste.html`.
2. Il remplit `questionnaire-artiste.html`.
3. Son profil passe en `pending`.
4. Il peut uploader une photo ou fournir un lien photo/presskit.
5. Il peut générer son presskit sur `presskit-artiste.html`.
6. L’admin valide, refuse ou demande correction.
7. Une fois `approved`, le profil devient visible publiquement.
8. L’artiste gère ses disponibilités sur `calendrier-artiste.html`.
9. L’artiste voit ses demandes liées sur `demandes-artiste.html`.

DJ-hub est toujours gratuit pour les DJs : aucun abonnement, aucun paiement DJ, aucune commission côté DJ.

## Parcours admin

Page privée :

```text
admin-validations.html
```

Elle n’est pas affichée dans la navigation publique.

Créer le premier admin :

```sql
update public.profiles set role = 'admin' where email = 'TON_EMAIL';
```

L’admin peut :
- voir les statistiques de profils et demandes ;
- lire les profils artistes en attente, validés, refusés ou à corriger ;
- approuver, refuser ou demander correction ;
- lire les presskits générés ;
- traiter les demandes clients ;
- marquer une demande contactée, envoyée au DJ, confirmée ou annulée ;
- utiliser les liens `mailto` préremplis.

## Parcours client

Le client n’a pas besoin de compte au lancement.

1. Il décrit sa soirée sur `trouver-un-dj.html`.
2. La demande est gratuite.
3. Si Supabase est configuré, la demande est stockée dans `booking_requests`.
4. Si Formspree est configuré, la demande est aussi envoyée par email.
5. Si l’URL contient `?dj=ARTIST_PROFILE_ID`, la demande est rattachée au DJ.
6. Le tarif final est confirmé avant validation.
7. Les frais de service DJ-hub sont côté client et indiqués sur facture.

## Modèle économique

- DJ-hub est toujours gratuit pour les DJs.
- Pas d’abonnement DJ.
- Pas de commission côté DJ.
- Pas de paiement DJ.
- Le DJ garde son tarif annoncé.
- Les frais de service sont côté client et indiqués sur facture.

Interne : frais de service client de 17 % du tarif DJ validé, ne pas afficher publiquement.

## Sécurité

- RLS obligatoire sur toutes les tables.
- Ne jamais utiliser de clé serveur privée côté frontend.
- Le frontend utilise uniquement `TON_SUPABASE_URL` et `TON_SUPABASE_ANON_KEY`.
- Les artistes peuvent lire et modifier uniquement leurs données.
- Les artistes voient uniquement les demandes liées à leur profil.
- Les clients peuvent créer une demande sans compte.
- Les admins peuvent lire et traiter les profils/demandes via policies RLS.
- Les profils publics sont seulement ceux avec `status = 'approved'`.
- Le bucket `artist-photos` peut être public en MVP, mais les pages publiques ne chargent que les photos liées à des profils `approved`.

## Configuration Supabase

1. Créer un projet Supabase.
2. Exécuter `supabase-schema.sql` dans SQL Editor.
3. Exécuter `supabase-storage-policies.sql` dans SQL Editor.
4. Remplacer les placeholders dans `assets/js/supabase-config.js` :

```js
const SUPABASE_URL = "TON_SUPABASE_URL";
const SUPABASE_ANON_KEY = "TON_SUPABASE_ANON_KEY";
```

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir :

```text
http://127.0.0.1:8000/index.html
```

## Déploiement GitHub Pages

1. Vérifier que `assets/js/supabase-config.js` contient les valeurs publiques Supabase.
2. Commiter les fichiers.
3. Pousser sur GitHub.
4. Activer GitHub Pages sur la branche souhaitée.
5. Tester :
   - `index.html`
   - `djs.html`
   - `trouver-un-dj.html`
   - `inscription-artiste.html`
   - `connexion.html`
   - `admin-validations.html`
