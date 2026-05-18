(function () {
  "use strict";

  var artists = Array.isArray(window.ARTISTS) ? window.ARTISTS : [];
  var stripeDepositUrl = "https://buy.stripe.com/TON_LIEN_ACOMPTE";

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function formatEuro(value) {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b, "fr");
    });
  }

  function hashHue(value) {
    var hash = 0;
    String(value || "BookTonDJ").split("").forEach(function (char) {
      hash = char.charCodeAt(0) + ((hash << 5) - hash);
    });
    return Math.abs(hash) % 360;
  }

  function initials(name) {
    return String(name || "DJ")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(function (part) { return part.charAt(0); })
      .join("")
      .toUpperCase();
  }

  function artistVisual(artist, large) {
    if (artist.image) {
      return '<img src="' + escapeHtml(artist.image) + '" alt="' + escapeHtml(artist.name) + '" loading="lazy">';
    }

    return '<div class="artist-placeholder' + (large ? " artist-placeholder-large" : "") + '" style="--artist-hue:' + hashHue(artist.id) + 'deg">' +
      '<span>' + escapeHtml(initials(artist.name)) + '</span>' +
      '<i></i>' +
      '</div>';
  }

  function badgeList(items, limit) {
    return (items || []).slice(0, limit || items.length).map(function (item) {
      return '<span class="badge">' + escapeHtml(item) + '</span>';
    }).join("");
  }

  function stylePills(items, limit) {
    return (items || []).slice(0, limit || items.length).map(function (item) {
      return '<span>' + escapeHtml(item) + '</span>';
    }).join("");
  }

  function artistCard(artist) {
    return [
      '<article class="artist-card reveal">',
      '  <a class="artist-media" href="dj.html?id=' + encodeURIComponent(artist.id) + '" aria-label="Voir le profil de ' + escapeHtml(artist.name) + '">',
      artistVisual(artist, false),
      '  </a>',
      '  <div class="artist-card-body">',
      '    <div class="artist-card-top">',
      '      <div>',
      '        <h3>' + escapeHtml(artist.name) + '</h3>',
      '        <p>' + escapeHtml(artist.city) + '</p>',
      '      </div>',
      '      <span class="rating">' + escapeHtml(artist.rating) + '/5</span>',
      '    </div>',
      '    <div class="style-line">' + stylePills(artist.styles || [], 3) + '</div>',
      '    <div class="artist-meta">',
      '      <span>À partir de ' + formatEuro(artist.priceFrom) + '</span>',
      '      <span>' + escapeHtml(artist.events) + ' événements</span>',
      '      <span>' + (artist.material ? "Matériel possible" : "Matériel à prévoir") + '</span>',
      '    </div>',
      '    <p class="availability">' + escapeHtml(artist.available) + '</p>',
      '    <div class="badge-row">' + badgeList(artist.badges || [], 3) + '</div>',
      '    <div class="card-actions">',
      '      <a class="btn btn-secondary" href="dj.html?id=' + encodeURIComponent(artist.id) + '">Voir le profil</a>',
      '      <a class="btn btn-primary" href="trouver-un-dj.html?dj=' + encodeURIComponent(artist.id) + '">Demander ce DJ</a>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function initNav() {
    var toggle = $(".nav-toggle");
    var nav = $("#site-nav");
    if (!toggle || !nav) return;

    toggle.addEventListener("click", function () {
      var expanded = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!expanded));
      nav.classList.toggle("is-open", !expanded);
      document.body.classList.toggle("nav-open", !expanded);
    });

    $all("a", nav).forEach(function (link) {
      link.addEventListener("click", function () {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        document.body.classList.remove("nav-open");
      });
    });
  }

  function initReveal() {
    var nodes = $all(".reveal");
    if (!nodes.length) return;

    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    nodes.forEach(function (node) { observer.observe(node); });
  }

  function renderPopularArtists() {
    var container = $("#popular-artists");
    if (!container) return;
    var limit = Number(container.dataset.limit || 6);
    var popular = artists
      .slice()
      .sort(function (a, b) { return b.rating - a.rating || b.events - a.events; })
      .slice(0, limit);

    container.innerHTML = popular.map(artistCard).join("");
    initReveal();
  }

  function fillSelect(select, values) {
    if (!select) return;
    var current = select.value;
    var first = select.querySelector("option");
    select.innerHTML = first ? first.outerHTML : '<option value="">Tous</option>';
    values.forEach(function (value) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    select.value = current;
  }

  function readFilters(form) {
    return {
      q: normalize($("#filter-search", form) && $("#filter-search", form).value),
      city: $("#filter-city", form) ? $("#filter-city", form).value : "",
      style: $("#filter-style", form) ? $("#filter-style", form).value : "",
      budget: $("#filter-budget", form) ? Number($("#filter-budget", form).value) : 0,
      event: $("#filter-event", form) ? $("#filter-event", form).value : "",
      material: $("#filter-material", form) ? $("#filter-material", form).value : ""
    };
  }

  function matchesFilters(artist, filters) {
    var haystack = normalize([
      artist.name,
      artist.city,
      (artist.styles || []).join(" "),
      (artist.eventTypes || []).join(" "),
      (artist.badges || []).join(" ")
    ].join(" "));

    if (filters.q && haystack.indexOf(filters.q) === -1) return false;
    if (filters.city && artist.city !== filters.city) return false;
    if (filters.style && (artist.styles || []).indexOf(filters.style) === -1) return false;
    if (filters.budget && artist.priceFrom > filters.budget) return false;
    if (filters.event && (artist.eventTypes || []).indexOf(filters.event) === -1) return false;
    if (filters.material === "true" && !artist.material) return false;
    if (filters.material === "false" && artist.material) return false;
    return true;
  }

  function renderArtistsList() {
    var grid = $("#artists-grid");
    var form = $("#artist-filters");
    if (!grid || !form) return;

    fillSelect($("#filter-city", form), uniqueSorted(artists.map(function (artist) { return artist.city; })));
    fillSelect($("#filter-style", form), uniqueSorted(artists.flatMap(function (artist) { return artist.styles || []; })));
    fillSelect($("#filter-event", form), uniqueSorted(artists.flatMap(function (artist) { return artist.eventTypes || []; })));

    var params = new URLSearchParams(window.location.search);
    ["q", "city", "style", "budget", "event", "material"].forEach(function (name) {
      var input = $('[name="' + name + '"]', form);
      if (input && params.has(name)) input.value = params.get(name);
    });

    function update() {
      var filters = readFilters(form);
      var filtered = artists.filter(function (artist) { return matchesFilters(artist, filters); });
      grid.innerHTML = filtered.length ? filtered.map(artistCard).join("") : '<div class="empty-state">Aucun DJ ne correspond à ces filtres pour le moment. Essayez d’élargir la ville, le style ou le budget.</div>';
      var count = $("#results-count");
      if (count) count.textContent = String(filtered.length);
      initReveal();
    }

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("reset", function () {
      window.setTimeout(update, 0);
    });

    update();
  }

  function getArtistFromUrl() {
    var id = new URLSearchParams(window.location.search).get("id");
    return artists.find(function (artist) { return artist.id === id; });
  }

  function socialLinks(artist) {
    var links = [
      ["Instagram", artist.instagram],
      ["SoundCloud", artist.soundcloud],
      ["Mixcloud", artist.mixcloud]
    ].filter(function (entry) { return entry[1]; });

    if (!links.length) return '<p class="muted">Liens sociaux à ajouter.</p>';

    return links.map(function (entry) {
      return '<a class="social-link" href="' + escapeHtml(entry[1]) + '" target="_blank" rel="noopener">' + escapeHtml(entry[0]) + '</a>';
    }).join("");
  }

  function renderArtistDetail() {
    var container = $("#artist-detail");
    if (!container) return;

    var artist = getArtistFromUrl();
    if (!artist) {
      container.innerHTML = [
        '<div class="empty-detail">',
        '  <p class="eyebrow">Profil introuvable</p>',
        '  <h1>Ce DJ n’existe pas encore dans la sélection BookTonDJ.</h1>',
        '  <p>Le lien est peut-être incomplet ou l’artiste a été retiré du prototype.</p>',
        '  <a class="btn btn-primary" href="djs.html">Retour aux DJs</a>',
        '</div>'
      ].join("");
      return;
    }

    document.title = artist.name + " - DJ " + artist.city + " - BookTonDJ";

    container.innerHTML = [
      '<article class="artist-detail reveal">',
      '  <div class="artist-detail-media">' + artistVisual(artist, true) + '</div>',
      '  <div class="artist-detail-content">',
      '    <p class="eyebrow">Profil DJ</p>',
      '    <h1>' + escapeHtml(artist.name) + '</h1>',
      '    <p class="detail-subtitle">' + escapeHtml(artist.city) + ' · ' + escapeHtml((artist.styles || []).join(" / ")) + '</p>',
      '    <div class="detail-stats">',
      '      <span><strong>' + formatEuro(artist.priceFrom) + '</strong><small>à partir de</small></span>',
      '      <span><strong>' + escapeHtml(artist.rating) + '/5</strong><small>note</small></span>',
      '      <span><strong>' + escapeHtml(artist.events) + '</strong><small>événements</small></span>',
      '    </div>',
      '    <p>' + escapeHtml(artist.bio) + '</p>',
      '    <div class="style-line detail-style-line">' + stylePills(artist.styles || [], 5) + '</div>',
      '    <div class="badge-row">' + badgeList(artist.badges || [], 6) + '</div>',
      '    <div class="detail-actions">',
      '      <a class="btn btn-primary" href="trouver-un-dj.html?dj=' + encodeURIComponent(artist.id) + '">Demander ce DJ</a>',
      '      <a class="btn btn-secondary" href="' + stripeDepositUrl + '">Payer l’acompte</a>',
      '    </div>',
      '    <div class="alert alert-soft">Le paiement d’un acompte ne confirme pas automatiquement la prestation. La réservation finale dépend de la confirmation du DJ, du lieu, de la date, du matériel et du tarif global.</div>',
      '  </div>',
      '</article>',
      '<div class="detail-grid">',
      '  <section class="detail-panel reveal"><h2>Expérience</h2><p>' + escapeHtml(artist.experience) + '</p></section>',
      '  <section class="detail-panel reveal"><h2>Matériel</h2><p>' + (artist.material ? "Matériel possible selon prestation et configuration du lieu." : "Matériel à prévoir ou à confirmer avec le lieu.") + '</p></section>',
      '  <section class="detail-panel reveal"><h2>Zones couvertes</h2><div class="tag-grid compact">' + (artist.zones || []).map(function (zone) { return '<span>' + escapeHtml(zone) + '</span>'; }).join("") + '</div></section>',
      '  <section class="detail-panel reveal"><h2>Événements adaptés</h2><div class="tag-grid compact">' + (artist.eventTypes || []).map(function (type) { return '<span>' + escapeHtml(type) + '</span>'; }).join("") + '</div></section>',
      '  <section class="detail-panel reveal"><h2>Disponibilité</h2><p>' + escapeHtml(artist.available) + '</p></section>',
      '  <section class="detail-panel reveal"><h2>Liens</h2><div class="social-row">' + socialLinks(artist) + '</div></section>',
      '</div>'
    ].join("");

    initReveal();
  }

  function initSelectedArtistRequest() {
    var box = $("#selected-dj-box");
    var input = $("#selected-dj-input");
    if (!box || !input) return;

    var id = new URLSearchParams(window.location.search).get("dj");
    var artist = artists.find(function (item) { return item.id === id; });
    if (!artist) return;

    input.value = artist.name + " - " + artist.city + " (" + artist.id + ")";
    box.hidden = false;
    box.innerHTML = '<strong>DJ demandé :</strong> ' + escapeHtml(artist.name) + ' · ' + escapeHtml(artist.city) + ' · à partir de ' + formatEuro(artist.priceFrom);
  }

  function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    var map = {
      ville: "ville",
      date_evenement: "date_evenement",
      type_evenement: "type_evenement",
      style_musical: "style_musical",
      budget: "budget"
    };

    Object.keys(map).forEach(function (param) {
      var field = $('[name="' + map[param] + '"]');
      if (field && params.has(param)) field.value = params.get(param);
    });
  }

  function initForms() {
    $all("form[data-form]").forEach(function (form) {
      var feedback = $("[data-form-feedback]", form);
      form.addEventListener("submit", function () {
        if (!feedback) return;
        feedback.hidden = false;
        feedback.textContent = "Merci, votre demande est en cours d'envoi. Vous allez être redirigé vers le service de formulaire.";
      });
    });
  }

  function renderAdmin() {
    var stats = $("#admin-stats");
    var requestsTable = $("#admin-requests");
    var artistsTable = $("#admin-artists");
    if (!stats && !requestsTable && !artistsTable) return;

    var requests = [
      { client: "Camille R.", city: "Paris", date: "24/05/2026", style: "House / Disco", budget: "650 EUR", status: "À traiter" },
      { client: "Maison Alta", city: "Nice", date: "29/05/2026", style: "Lounge", budget: "900 EUR", status: "Prioritaire" },
      { client: "Hugo B.", city: "Lyon", date: "31/05/2026", style: "Généraliste", budget: "450 EUR", status: "Assigné" },
      { client: "Le Comptoir", city: "Bordeaux", date: "06/06/2026", style: "Afro / Latino", budget: "500 EUR", status: "En attente" }
    ];

    if (stats) {
      stats.innerHTML = [
        ["Demandes reçues", "128"],
        ["DJs inscrits", String(artists.length)],
        ["Demandes en attente", "9"],
        ["Réservations confirmées", "17"]
      ].map(function (item) {
        return '<article class="stat-card"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></article>';
      }).join("");
    }

    if (requestsTable) {
      requestsTable.innerHTML = requests.map(function (request) {
        return [
          '<tr>',
          '<td>' + escapeHtml(request.client) + '</td>',
          '<td>' + escapeHtml(request.city) + '</td>',
          '<td>' + escapeHtml(request.date) + '</td>',
          '<td>' + escapeHtml(request.style) + '</td>',
          '<td>' + escapeHtml(request.budget) + '</td>',
          '<td><span class="status-pill">' + escapeHtml(request.status) + '</span></td>',
          '<td class="table-actions"><button>contacter</button><button>assigner</button><button>confirmer</button><button>archiver</button></td>',
          '</tr>'
        ].join("");
      }).join("");
    }

    if (artistsTable) {
      artistsTable.innerHTML = artists.map(function (artist) {
        return [
          '<tr>',
          '<td>' + escapeHtml(artist.name) + '</td>',
          '<td>' + escapeHtml(artist.city) + '</td>',
          '<td>' + escapeHtml((artist.styles || []).join(", ")) + '</td>',
          '<td>' + formatEuro(artist.priceFrom) + '</td>',
          '<td><span class="status-pill">Publié</span></td>',
          '</tr>'
        ].join("");
      }).join("");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    renderPopularArtists();
    renderArtistsList();
    renderArtistDetail();
    initSelectedArtistRequest();
    prefillFromQuery();
    initForms();
    renderAdmin();
    initReveal();
  });
})();
