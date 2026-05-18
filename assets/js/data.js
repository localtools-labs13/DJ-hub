/*
  BOOKTONDJ - GUIDE SIMPLE POUR AJOUTER UN ARTISTE

  Ce fichier contient les profils affichés sur la page d'accueil, la liste DJs,
  les fiches artistes et le prototype admin. Pour ajouter un DJ, copiez un bloc
  existant dans window.ARTISTS, collez-le avant le crochet final, puis adaptez
  chaque champ.

  Comment créer un id propre :
  - utilisez uniquement des minuscules, chiffres et tirets ;
  - évitez les accents, espaces et caractères spéciaux ;
  - format conseillé : "nom-artiste-ville" ;
  - exemple : "nova-club-paris".

  Exemples de styles :
  - "House", "Disco", "Techno", "Minimal", "Hip-hop", "RnB", "Afro",
    "Latino", "Open format", "Lounge", "Deep house", "Mariage".

  Exemples de types d'événements :
  - "Soirée privée", "Anniversaire", "Mariage", "Bar", "Restaurant",
    "Hôtel", "Corporate", "Rooftop", "Afterwork", "Club", "Collectif".

  Où mettre l'image :
  - placez le fichier dans assets/img/artists/ ;
  - renseignez ensuite image: "assets/img/artists/nom-ville.jpg" ;
  - si vous n'avez pas encore d'image, laissez image: "" ;
  - le site affichera automatiquement un visuel premium en dégradé.

  Modèle prêt à copier :

  {
    id: "nom-ville",
    name: "Nom DJ",
    city: "Ville",
    styles: ["House", "Disco"],
    priceFrom: 250,
    rating: 4.8,
    events: 12,
    material: true,
    image: "assets/img/artists/nom-ville.jpg",
    instagram: "",
    soundcloud: "",
    mixcloud: "",
    bio: "",
    zones: ["Ville", "Autour"],
    available: "Sur demande",
    eventTypes: ["Soirée privée", "Bar"],
    badges: ["Réponse rapide"],
    experience: "..."
  }
*/

window.ARTISTS = [
  {
    id: "mara-kline-marseille",
    name: "Mara Kline",
    city: "Marseille",
    styles: ["Techno", "Industrial", "Acid"],
    priceFrom: 420,
    rating: 4.9,
    events: 38,
    material: false,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "https://soundcloud.com/",
    mixcloud: "",
    bio: "Sélection sombre et tendue, pensée pour les clubs, collectifs et lieux qui veulent une vraie intensité dancefloor.",
    zones: ["Marseille", "Aix-en-Provence", "Toulon", "Avignon"],
    available: "Soirs et week-ends, sur demande",
    eventTypes: ["Club", "Collectif", "Rooftop", "Afterwork"],
    badges: ["Club-ready", "Set énergique", "Sélection pointue"],
    experience: "7 ans de scènes locales, collectifs techno et événements alternatifs en région PACA."
  },
  {
    id: "eliott-parker-paris",
    name: "Eliott Parker",
    city: "Paris",
    styles: ["House", "Disco", "Corporate"],
    priceFrom: 550,
    rating: 4.8,
    events: 64,
    material: true,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "",
    mixcloud: "https://mixcloud.com/",
    bio: "Un format élégant entre house solaire, disco moderne et sélection corporate maîtrisée pour garder une piste accessible.",
    zones: ["Paris", "Neuilly-sur-Seine", "Boulogne", "Saint-Denis"],
    available: "Disponible semaine et week-end selon planning",
    eventTypes: ["Corporate", "Hôtel", "Restaurant", "Afterwork", "Soirée privée"],
    badges: ["Corporate", "Matériel possible", "Réponse rapide"],
    experience: "Plus de 60 événements privés et professionnels, dont soirées de marque, galas et hôtels parisiens."
  },
  {
    id: "leo-martin-lyon",
    name: "Léo Martin",
    city: "Lyon",
    styles: ["Généraliste", "Mariage", "Anniversaire"],
    priceFrom: 390,
    rating: 4.7,
    events: 82,
    material: true,
    image: "",
    instagram: "",
    soundcloud: "",
    mixcloud: "",
    bio: "DJ polyvalent pour événements familiaux, mariages et anniversaires, avec une lecture de salle très fiable.",
    zones: ["Lyon", "Villeurbanne", "Vienne", "Bourgoin-Jallieu"],
    available: "Week-ends principalement",
    eventTypes: ["Mariage", "Anniversaire", "Soirée privée", "Restaurant"],
    badges: ["Mariage", "Open format", "Matériel inclus possible"],
    experience: "10 ans d'expérience en mariages, anniversaires et événements privés de 50 à 250 invités."
  },
  {
    id: "alma-santos-bordeaux",
    name: "Alma Santos",
    city: "Bordeaux",
    styles: ["Afro", "Latino", "House"],
    priceFrom: 360,
    rating: 4.8,
    events: 41,
    material: true,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "https://soundcloud.com/",
    mixcloud: "",
    bio: "Sets chaleureux entre afro house, latin club et edits solaires, parfaits pour bars, rooftops et soirées privées.",
    zones: ["Bordeaux", "Mérignac", "Arcachon", "Libourne"],
    available: "Jeudi à dimanche, sur demande",
    eventTypes: ["Rooftop", "Bar", "Soirée privée", "Anniversaire"],
    badges: ["Afro house", "Latino", "Good vibes"],
    experience: "Résidences en bars bordelais, soirées étudiantes premium et événements privés estivaux."
  },
  {
    id: "jay-north-lille",
    name: "Jay North",
    city: "Lille",
    styles: ["Hip-hop", "RnB", "Afrobeats"],
    priceFrom: 330,
    rating: 4.6,
    events: 29,
    material: false,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "https://soundcloud.com/",
    mixcloud: "",
    bio: "Culture hip-hop, RnB 2000s et afrobeats actuels pour des soirées urbaines, clubs et événements étudiants.",
    zones: ["Lille", "Roubaix", "Tourcoing", "Arras"],
    available: "Sur demande",
    eventTypes: ["Club", "Anniversaire", "Bar", "Collectif"],
    badges: ["Hip-hop", "RnB", "Club"],
    experience: "DJ sets en clubs, open mics, soirées campus et showcases d'artistes locaux."
  },
  {
    id: "sacha-river-toulouse",
    name: "Sacha River",
    city: "Toulouse",
    styles: ["Electro", "House", "Deep house"],
    priceFrom: 340,
    rating: 4.7,
    events: 34,
    material: true,
    image: "",
    instagram: "",
    soundcloud: "https://soundcloud.com/",
    mixcloud: "https://mixcloud.com/",
    bio: "Une sélection electro-house fluide pour afterworks, rooftops et soirées privées qui veulent monter en énergie.",
    zones: ["Toulouse", "Blagnac", "Colomiers", "Montauban"],
    available: "Semaine et week-end selon date",
    eventTypes: ["Afterwork", "Rooftop", "Soirée privée", "Bar"],
    badges: ["Deep house", "Matériel possible", "Progressif"],
    experience: "Résidences ponctuelles en bars toulousains et événements corporate jusqu'à 300 personnes."
  },
  {
    id: "mia-azure-nice",
    name: "Mia Azure",
    city: "Nice",
    styles: ["Lounge", "Beach club", "Deep house"],
    priceFrom: 480,
    rating: 4.9,
    events: 57,
    material: true,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "",
    mixcloud: "https://mixcloud.com/",
    bio: "Signature chic et balnéaire pour hôtels, terrasses, plages privées et cocktails au coucher du soleil.",
    zones: ["Nice", "Cannes", "Antibes", "Monaco"],
    available: "Très demandée en saison, sur validation",
    eventTypes: ["Hôtel", "Restaurant", "Rooftop", "Corporate"],
    badges: ["Lounge premium", "Beach club", "Hôtels"],
    experience: "Programmations lounge en établissements premium de la Côte d'Azur et événements de marque."
  },
  {
    id: "tom-briand-nantes",
    name: "Tom Briand",
    city: "Nantes",
    styles: ["Open format", "Pop", "Disco"],
    priceFrom: 310,
    rating: 4.6,
    events: 46,
    material: true,
    image: "",
    instagram: "",
    soundcloud: "",
    mixcloud: "",
    bio: "Open format propre et efficace, capable de passer d'un cocktail calme à une piste très festive.",
    zones: ["Nantes", "Saint-Herblain", "Rezé", "La Baule"],
    available: "Week-end et veilles de jours fériés",
    eventTypes: ["Anniversaire", "Mariage", "Soirée privée", "Bar"],
    badges: ["Open format", "Tout public", "Matériel possible"],
    experience: "Nombreux événements privés, bars, fêtes d'entreprise et soirées associatives dans l'Ouest."
  },
  {
    id: "noa-minsk-montpellier",
    name: "Noa Minsk",
    city: "Montpellier",
    styles: ["Techno", "Minimal", "Micro house"],
    priceFrom: 370,
    rating: 4.7,
    events: 31,
    material: false,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "https://soundcloud.com/",
    mixcloud: "",
    bio: "Minimal précise, techno hypnotique et grooves micro house pour événements pointus et clubs à jauge intime.",
    zones: ["Montpellier", "Sète", "Nîmes", "Béziers"],
    available: "Sur demande",
    eventTypes: ["Club", "Collectif", "Rooftop", "Bar"],
    badges: ["Minimal", "Underground", "Vinyle possible"],
    experience: "Sets en collectifs électroniques, petits clubs et soirées alternatives du Sud."
  },
  {
    id: "claire-hess-strasbourg",
    name: "Claire Hess",
    city: "Strasbourg",
    styles: ["Corporate", "Deep house", "Lounge"],
    priceFrom: 430,
    rating: 4.8,
    events: 53,
    material: true,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "",
    mixcloud: "",
    bio: "Sélection raffinée pour séminaires, cocktails, restaurants et événements transfrontaliers.",
    zones: ["Strasbourg", "Colmar", "Nancy", "Kehl"],
    available: "Semaine privilégiée, week-end sur demande",
    eventTypes: ["Corporate", "Restaurant", "Hôtel", "Afterwork"],
    badges: ["Corporate", "Lounge", "Bilingue FR/EN"],
    experience: "Prestations pour entreprises, institutions, lieux culturels et hôtels dans le Grand Est."
  },
  {
    id: "mael-orion-rennes",
    name: "Maël Orion",
    city: "Rennes",
    styles: ["Indie dance", "Electro", "Nu disco"],
    priceFrom: 320,
    rating: 4.7,
    events: 27,
    material: true,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "https://soundcloud.com/",
    mixcloud: "https://mixcloud.com/",
    bio: "Entre indie dance, electro et nu disco, idéal pour bars curieux, collectifs et soirées privées alternatives.",
    zones: ["Rennes", "Saint-Malo", "Vannes", "Laval"],
    available: "Sur demande, surtout vendredi et samedi",
    eventTypes: ["Bar", "Collectif", "Soirée privée", "Afterwork"],
    badges: ["Indie dance", "Curated set", "Matériel possible"],
    experience: "Programmations dans bars indépendants, événements culturels et soirées associatives."
  },
  {
    id: "ines-verlan-aix",
    name: "Inès Verlan",
    city: "Aix-en-Provence",
    styles: ["Private events", "House", "Disco"],
    priceFrom: 450,
    rating: 4.9,
    events: 49,
    material: true,
    image: "",
    instagram: "https://instagram.com/",
    soundcloud: "",
    mixcloud: "https://mixcloud.com/",
    bio: "DJ premium pour événements privés, cocktails, villas et soirées élégantes autour d'Aix et du Luberon.",
    zones: ["Aix-en-Provence", "Marseille", "Luberon", "Cassis"],
    available: "Sur demande, réservation anticipée conseillée",
    eventTypes: ["Soirée privée", "Mariage", "Corporate", "Rooftop"],
    badges: ["Private events", "House chic", "Matériel possible"],
    experience: "Prestations privées haut de gamme, villas, mariages intimistes et cocktails de marque."
  }
];
