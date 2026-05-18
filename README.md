# BookTonDJ

BookTonDJ est une V1 statique française de marketplace de matching humain entre organisateurs d'événements, lieux professionnels et DJs indépendants.

Slogan : **Trouvez le DJ parfait pour votre soirée.**

Cette version est pensée pour être mise en ligne rapidement sur un hébergement statique comme IONOS : HTML, CSS et JavaScript vanilla uniquement, sans backend, sans framework et sans dépendance npm.

## Ouvrir le site en local

Depuis le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrez :

```text
http://localhost:8000
```

Pages principales :

- `index.html`
- `trouver-un-dj.html`
- `devenir-dj.html`
- `lieux-et-pros.html`
- `djs.html`
- `dj.html?id=mara-kline-marseille`
- `admin.html`

## Ajouter un artiste

Les profils sont dans :

```text
assets/js/data.js
```

Copiez un bloc artiste existant dans `window.ARTISTS`, changez l'id, le nom, la ville, les styles, le prix, la bio et les liens.

Conseils :

- utilisez un id sans accents ni espaces, par exemple `nom-artiste-ville` ;
- laissez `image: ""` si vous n'avez pas encore de photo ;
- placez les futures images dans `assets/img/artists/` ;
- renseignez les styles et types d'événements avec des valeurs cohérentes pour les filtres.

## Remplacer les liens Formspree

Les formulaires utilisent des placeholders :

- client : `https://formspree.io/f/TON_FORM_CLIENT`
- DJ : `https://formspree.io/f/TON_FORM_DJ`
- pro : `https://formspree.io/f/TON_FORM_PRO`

Créez vos formulaires dans Formspree, puis remplacez ces URLs dans les fichiers HTML.

## Remplacer les liens Stripe

Les boutons Stripe utilisent ces placeholders :

- acompte : `https://buy.stripe.com/TON_LIEN_ACOMPTE`
- mise en avant DJ : `https://buy.stripe.com/TON_LIEN_MISE_EN_AVANT`
- demande pro prioritaire : `https://buy.stripe.com/TON_LIEN_PRO`

Créez vos Payment Links Stripe, puis remplacez les placeholders dans les pages concernées.

## Héberger sur IONOS

1. Connectez-vous à votre espace IONOS.
2. Ouvrez le gestionnaire de fichiers ou votre accès FTP.
3. Envoyez tous les fichiers du dossier projet à la racine du site ou dans le dossier web choisi.
4. Vérifiez que `index.html` est bien à la racine.
5. Testez les pages, les formulaires et les liens Stripe après mise en ligne.

## Limites du MVP

- Pas de backend.
- Pas de vraie réservation instantanée.
- Pas de disponibilité garantie.
- Pas de paiement marketplace automatisé.
- Pas d'authentification admin.
- Les demandes Formspree et paiements Stripe doivent être configurés avec de vrais comptes.
- Les profils et tarifs doivent être validés manuellement avant toute prestation.

## Prochaines étapes

- Backend.
- Vraie authentification admin.
- Base de données.
- Dashboard DJ.
- Paiement marketplace.
- Calendrier.
- Emails automatiques.
- RGPD complet.
