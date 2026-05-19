# DJ-hub

DJ-hub est une marketplace statique HTML/CSS/JavaScript vanilla pour aider les particuliers et petits lieux à trouver un DJ fiable pour une soirée privée, un anniversaire, une villa, un rooftop privé, une garden party, un petit bar ou un remplacement DJ.

Le site reste compatible GitHub Pages : pas de React, pas de backend maison. Le backend applicatif est Supabase.

## Identité visuelle

Le header utilise maintenant un logo vectoriel inline SVG : icône CDJ compacte + texte `DJ-hub.fr`.

Assets actifs :
- `dj-hub-favicon.svg` pour le favicon vectoriel.
- `dj-hub-touch-icon.png` pour l’icône Apple/téléphone.

Les anciens PNG du kit restent dans `assets/img/` comme archives de marque, mais ils ne sont plus utilisés dans le header.

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

Migrations MVP complémentaires :
- `booking-workflow-migration.sql` ajoute le pipeline de réservation, les champs de facturation interne et la table `booking_events`.
- `photo-rights-migration.sql` ajoute la confirmation des droits photo sur les profils artistes.
- `admin-request-management-migration.sql` autorise uniquement les admins à supprimer une demande client depuis l’interface privée.
- `admin-artist-delete-migration.sql` autorise uniquement les admins à supprimer un profil artiste depuis l’interface privée.

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
8. L’artiste clique simplement les jours disponibles sur `calendrier-artiste.html`; aucun horaire n’est demandé.
9. L’artiste voit ses demandes liées sur `demandes-artiste.html`.

DJ-hub est toujours gratuit pour les DJs : aucun abonnement, aucun paiement DJ, aucune commission côté DJ.

## Presskit PDF artiste

Chaque artiste peut générer gratuitement un presskit depuis `espace-artiste.html` ou `presskit-artiste.html`.

Le presskit est généré côté navigateur à partir du profil Supabase :
- photo artiste ou placeholder avec initiales ;
- nom d’artiste, ville et styles ;
- bio courte et bio longue ;
- univers musical, influences et formats de set si renseignés ;
- événements adaptés ;
- zone de déplacement, tarif indicatif et matériel ;
- liens Instagram, SoundCloud, Mixcloud, YouTube et site web ;
- contact réservation via DJ-hub.

Le PDF est généré côté navigateur :
- rendu optimisé sur une page A4 unique `1/1` ;
- modèle visuel sombre type press kit DJ premium, avec grand portrait, accents cyan/magenta, blocs biography / booking / technical rider et réseaux sociaux ;
- bouton `Imprimer / enregistrer en PDF A4` avec `window.print()` ;
- bouton `Télécharger PDF A4` via `html2pdf.js` si le CDN est disponible ;
- fallback automatique vers l’impression navigateur si `html2pdf.js` ne charge pas.

Aucune donnée privée n’est affichée dans le presskit : pas d’email personnel, pas de téléphone, pas de note admin. Le contact se fait via DJ-hub.

Le presskit public `presskit-public.html?id=ARTIST_PROFILE_ID` est visible seulement pour les profils `approved`. Si la table `artist_presskits` n’est pas disponible, la page artiste génère le presskit côté frontend sans bloquer le parcours.

Depuis l’admin, chaque fiche artiste propose aussi :
- édition directe de la page artiste ;
- sauvegarde des informations publiques ;
- génération / modification du presskit ;
- téléchargement du PDF A4.

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
- masquer automatiquement les boutons approuver/refuser quand un artiste est déjà validé ;
- supprimer un profil artiste depuis l’admin si nécessaire ;
- lire les presskits générés ;
- traiter les demandes clients dans le pipeline ;
- accepter / confirmer une demande client ;
- supprimer une demande client si elle est doublon, test ou invalide ;
- marquer une demande contactée, envoyée au DJ, acceptée/refusée par le DJ, confirmée par le client, facturée, payée, confirmée ou annulée ;
- modifier et envoyer des messages mail préremplis au client ou au DJ depuis son logiciel de messagerie ;
- copier un résumé client, un message WhatsApp et les messages email ;
- enregistrer des notes admin, DJ et client ;
- gérer une facturation MVP manuelle depuis l’admin.

## Pipeline de réservation MVP

Statuts supportés dans `booking_requests.status` :
- `new`
- `contacted`
- `sent_to_artist`
- `artist_accepted`
- `artist_refused`
- `client_confirmed`
- `invoice_sent`
- `paid`
- `confirmed`
- `cancelled`

Chaque changement de statut peut créer un événement dans `booking_events` si la migration a été appliquée.

## Facturation interne manuelle

Le MVP ne met pas encore en place de paiement marketplace automatisé.

Process recommandé :
1. L’admin qualifie la demande client.
2. L’admin confirme le tarif avec le DJ.
3. L’admin calcule les frais côté client dans `admin-validations.html`.
4. L’admin crée une facture ou un lien de paiement manuellement.
5. L’admin colle `invoice_link` dans la demande.
6. L’admin marque `invoice_sent`.
7. Après paiement, l’admin marque `paid`, puis `confirmed`.

Plus tard : Stripe Connect pourra être étudié si DJ-hub encaisse la totalité puis reverse automatiquement les DJs. Ce n’est pas intégré dans le MVP GitHub Pages.

## Parcours client

Le client n’a pas besoin de compte au lancement.

1. Il décrit sa soirée sur `trouver-un-dj.html`.
2. La demande est gratuite.
3. Si Supabase est configuré, la demande est stockée dans `booking_requests`.
4. Si Formspree est configuré, la demande est aussi envoyée par email.
5. Si l’URL contient `?dj=ARTIST_PROFILE_ID`, la demande est rattachée au DJ.
6. L’admin qualifie la demande et peut l’envoyer au DJ.
7. Le tarif final est confirmé avant validation.
8. Les frais de service DJ-hub sont côté client et indiqués sur facture.

## Modèle économique

- DJ-hub est toujours gratuit pour les DJs.
- Pas d’abonnement DJ.
- Pas de commission côté DJ.
- Pas de paiement DJ.
- Le DJ garde son tarif annoncé.
- Les frais de service sont côté client et indiqués sur facture.

Interne : frais de service client de 17 % du tarif DJ validé, ne pas afficher publiquement.

## SEO national et pages locales

DJ-hub reste une plateforme nationale française. Les pages locales et thématiques servent à capter les recherches Google sans changer le concept produit ni créer de faux profils.

Fichiers techniques :
- `robots.txt`
- `sitemap.xml`
- `404.html`

Pages SEO créées :
- intentions : soirée privée, anniversaire, bar, rooftop, restaurant-bar, villa, événement privé, entreprise, mariage, remplacement urgent ;
- styles : house, techno, disco, afro house, hip-hop, open format, généraliste, electro ;
- villes : Paris, Marseille, Lyon, Toulouse, Nice, Nantes, Montpellier, Bordeaux, Lille, Rennes, Strasbourg, Aix-en-Provence, Toulon, Cannes, Avignon.

Après déploiement :
- connecter Google Search Console ;
- vérifier `https://dj-hub.fr` ;
- soumettre `https://dj-hub.fr/sitemap.xml` ;
- inspecter la home et les pages villes prioritaires ;
- tester formulaire client, formulaire DJ, Supabase Auth et emails Resend ;
- suivre les premières requêtes SEO puis enrichir les pages qui commencent à recevoir des impressions.

Cette information est interne au README. Les pages publiques indiquent seulement que les frais de service DJ-hub sont côté client et visibles sur facture.

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
- Le calendrier artiste enregistre uniquement des jours `available`; les horaires précis se gèrent ensuite selon la demande client.
- Les notes admin, données privées et événements internes ne doivent jamais être affichés publiquement.
- Les droits photo doivent être confirmés avant publication d’une photo artiste.
- Les demandes anonymes ne peuvent insérer que les champs nécessaires au brief client.
- Les artistes peuvent uniquement répondre à leurs propres demandes liées ; les champs de facture, notes internes et données client restent protégés.

## Pages de confiance et lancement

Pages publiques :
- `comment-ca-marche.html`
- `mentions-legales.html`
- `confidentialite.html`
- `conditions-utilisation.html`
- `recrutement-dj.html`

Pages internes non présentes dans la navigation publique :
- `admin-validations.html`
- `launch-checklist.html`

Fichier prospection :
- `outreach-templates.md`

## Parcours recrutement premiers DJs

1. Envoyer un DM ou email avec `outreach-templates.md`.
2. Diriger vers `recrutement-dj.html` ou `inscription-artiste.html`.
3. L’artiste crée son compte.
4. Il complète le questionnaire, ajoute photo/liens audio et presskit.
5. L’admin valide les premiers vrais profils.
6. Les profils `approved` apparaissent sur `djs.html`.

## Configuration Supabase

1. Créer un projet Supabase.
2. Exécuter `supabase-schema.sql` dans SQL Editor.
3. Exécuter `supabase-storage-policies.sql` dans SQL Editor.
4. Exécuter `booking-workflow-migration.sql`.
5. Exécuter `photo-rights-migration.sql`.
6. Remplacer les placeholders dans `assets/js/supabase-config.js` si besoin :

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

## Prochaines étapes

- Compte client pour suivre une demande.
- Messagerie réelle client/admin/DJ.
- Paiement marketplace automatisé après validation du modèle.
- Avis clients réels, uniquement après prestations vérifiées.
- Upload presskit complet et stockage de documents additionnels.
