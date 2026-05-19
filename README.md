# DJ-hub

DJ-hub est une plateforme statique HTML/CSS/JavaScript vanilla pour mettre en relation des particuliers, petits lieux et DJs indépendants.

Positionnement : soirées privées, anniversaires, soirées entre amis, villas, rooftops privés, petits bars, bars à ambiance, restaurants-bars et remplacements DJ ponctuels.

## Règles produit

- Aucun faux profil artiste.
- `assets/js/data.js` reste vide tant qu’aucun vrai artiste n’est validé.
- Les artistes apparaissent publiquement uniquement après inscription, questionnaire et validation manuelle.
- Le compte artiste est obligatoire pour créer ou modifier un profil.
- Le compte client n’est pas obligatoire au lancement : une demande peut être envoyée sans compte.
- DJ-hub est toujours gratuit pour les DJs.
- Les frais de service sont côté client et indiqués sur la facture.

Modèle économique interne : frais de service client de 17 % du tarif DJ validé, appliqués sur facture. Ne pas afficher publiquement le pourcentage sur le site.

## Stack

- HTML/CSS/JavaScript vanilla.
- Compatible GitHub Pages.
- Supabase Auth pour les comptes artiste/admin.
- Supabase Postgres avec RLS pour profils, disponibilités et demandes.
- FullCalendar via CDN pour le calendrier artiste.
- Formspree peut rester actif en fallback formulaire email.

## Supabase

1. Créer un projet Supabase.
2. Ouvrir SQL Editor.
3. Copier/coller `supabase-schema.sql`.
4. Exécuter le script complet.
5. Dans `assets/js/supabase-config.js`, remplacer :
   - `TON_SUPABASE_URL`
   - `TON_SUPABASE_ANON_KEY`

Ne jamais mettre de clé serveur privée dans le frontend.

## Créer le premier admin

1. Créer un compte via `inscription-artiste.html` ou Supabase Auth.
2. Exécuter dans Supabase SQL Editor :

```sql
update public.profiles set role = 'admin' where email = 'TON_EMAIL';
```

3. Se reconnecter via `connexion.html`.
4. Aller sur `admin-validations.html`.

## Tester le parcours artiste

1. Ouvrir `inscription-artiste.html`.
2. Créer un compte artiste.
3. Remplir `questionnaire-artiste.html`.
4. Vérifier que le profil est en `pending`.
5. Se connecter avec un admin.
6. Valider le profil dans `admin-validations.html`.
7. Vérifier que le profil validé apparaît dans `djs.html`.
8. Gérer les disponibilités dans `calendrier-artiste.html`.

## Tester le parcours client

1. Ouvrir `trouver-un-dj.html`.
2. Remplir une demande sans compte.
3. Si Supabase est configuré, vérifier la table `booking_requests`.
4. Si Formspree est configuré, vérifier la réception email.

## Lancer en local

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://127.0.0.1:8000/index.html`.

## Déployer sur GitHub Pages

1. Commiter les fichiers.
2. Pousser sur GitHub.
3. Activer GitHub Pages sur la branche souhaitée.
4. Configurer les vraies valeurs Supabase avant mise en ligne.
