(function () {
  "use strict";

  var artists = Array.isArray(window.ARTISTS) ? window.ARTISTS : [];

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
    if (!value) return "Tarif sur demande";
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0
    }).format(value);
  }

  function uniqueSorted(values) {
    return Array.from(new Set(values.filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b, "fr");
    });
  }

  function hashHue(value) {
    var hash = 0;
    String(value || "DJ-hub").split("").forEach(function (char) {
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
    var styles = artist.styles || [];
    var badges = [
      artist.material ? "Matériel possible" : "Matériel à confirmer",
      artist.available || "Disponibilités à confirmer"
    ].concat(artist.badges || []);

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
      '      <span class="rating">Validé</span>',
      '    </div>',
      '    <div class="style-line">' + stylePills(styles, 4) + '</div>',
      '    <div class="artist-meta">',
      '      <span>' + (artist.priceFrom ? 'À partir de ' + formatEuro(artist.priceFrom) : 'Tarif sur demande') + '</span>',
      '      <span>' + escapeHtml((artist.eventTypes || []).slice(0, 2).join(" · ") || "Soirées privées") + '</span>',
      '      <span>' + (artist.material ? "DJ + matériel possible" : "Matériel à confirmer") + '</span>',
      '    </div>',
      '    <p class="availability">' + escapeHtml(artist.available || "Disponibilités à confirmer avec le DJ") + '</p>',
      '    <div class="badge-row">' + badgeList(badges, 3) + '</div>',
      '    <div class="card-actions">',
      '      <a class="btn btn-secondary" href="dj.html?id=' + encodeURIComponent(artist.id) + '">Voir le profil</a>',
      '      <a class="btn btn-primary" href="trouver-un-dj.html?dj=' + encodeURIComponent(artist.id) + '">Demander ce DJ</a>',
      '    </div>',
      '  </div>',
      '</article>'
    ].join("");
  }

  function emptyArtistsHome() {
    return [
      '<div class="empty-state empty-state-premium reveal">',
      '<p class="eyebrow">Sélection en cours</p>',
      '<h2>Premiers artistes en cours de sélection</h2>',
      '<p>DJ-hub n’affiche que des profils validés manuellement. Les premiers DJs seront ajoutés progressivement après vérification des informations, des liens musicaux, de la zone de déplacement et des disponibilités.</p>',
      '<div class="hero-actions">',
      '<a class="btn btn-primary" href="inscription-artiste.html">Rejoindre la sélection DJ</a>',
      '<a class="btn btn-secondary" href="trouver-un-dj.html">Décrire ma soirée</a>',
      '</div>',
      '</div>'
    ].join("");
  }

  function emptyArtistsList() {
    return [
      '<div class="empty-state empty-state-premium reveal">',
      '<p class="eyebrow">Lancement DJ-hub</p>',
      '<h2>Aucun DJ validé pour le moment</h2>',
      '<p>DJ-hub est en phase de lancement. Les premiers artistes apparaîtront ici après validation manuelle.</p>',
      '<div class="hero-actions">',
      '<a class="btn btn-primary" href="devenir-dj.html">Devenir DJ</a>',
      '<a class="btn btn-secondary" href="trouver-un-dj.html">Décrire ma soirée</a>',
      '</div>',
      '</div>'
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

  async function loadArtists(filters) {
    if (window.djHubArtists && window.djHubArtists.loadApprovedArtists) {
      artists = await window.djHubArtists.loadApprovedArtists(filters || {});
    } else {
      artists = Array.isArray(window.ARTISTS) ? window.ARTISTS : [];
    }
    return artists;
  }

  async function renderPopularArtists() {
    var container = $("#popular-artists");
    if (!container) return;
    var limit = Number(container.dataset.limit || 6);
    var loaded = await loadArtists();
    container.innerHTML = loaded.length ? loaded.slice(0, limit).map(artistCard).join("") : emptyArtistsHome();
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
      date: $("#filter-date", form) ? $("#filter-date", form).value : "",
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
      (artist.eventTypes || []).join(" ")
    ].join(" "));

    if (filters.q && haystack.indexOf(filters.q) === -1) return false;
    if (filters.city && artist.city !== filters.city) return false;
    if (filters.style && (artist.styles || []).indexOf(filters.style) === -1) return false;
    if (filters.budget && artist.priceFrom && artist.priceFrom > filters.budget) return false;
    if (filters.event && (artist.eventTypes || []).indexOf(filters.event) === -1) return false;
    if (filters.material === "true" && !artist.material) return false;
    if (filters.material === "false" && artist.material) return false;
    return true;
  }

  async function renderArtistsList() {
    var grid = $("#artists-grid");
    var form = $("#artist-filters");
    if (!grid || !form) return;

    var params = new URLSearchParams(window.location.search);
    ["q", "city", "date", "style", "budget", "event", "material"].forEach(function (name) {
      var input = $('[name="' + name + '"]', form);
      if (input && params.has(name)) input.value = params.get(name);
    });

    async function update() {
      var filters = readFilters(form);
      var loaded = await loadArtists(filters);

      fillSelect($("#filter-city", form), uniqueSorted(loaded.map(function (artist) { return artist.city; })));
      fillSelect($("#filter-style", form), uniqueSorted(loaded.flatMap(function (artist) { return artist.styles || []; })));
      fillSelect($("#filter-event", form), uniqueSorted(loaded.flatMap(function (artist) { return artist.eventTypes || []; })));

      var filtered = loaded.filter(function (artist) { return matchesFilters(artist, filters); });
      grid.innerHTML = filtered.length ? filtered.map(artistCard).join("") : emptyArtistsList();
      var count = $("#results-count");
      if (count) count.textContent = filtered.length ? String(filtered.length) : "Sélection en cours";
      initReveal();
    }

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("reset", function () {
      window.setTimeout(update, 0);
    });

    await update();
  }

  async function getArtistFromUrl() {
    var id = new URLSearchParams(window.location.search).get("id");
    if (window.djHubArtists && window.djHubArtists.getApprovedArtistById) {
      return window.djHubArtists.getApprovedArtistById(id);
    }
    return artists.find(function (artist) { return artist.id === id; }) || null;
  }

  function socialLinks(artist) {
    var links = [
      ["Instagram", artist.instagram],
      ["SoundCloud", artist.soundcloud],
      ["Mixcloud", artist.mixcloud],
      ["YouTube", artist.youtube],
      ["Site web", artist.website]
    ].filter(function (entry) { return entry[1]; });

    if (!links.length) return '<p class="muted">Liens sociaux à confirmer.</p>';

    return links.map(function (entry) {
      return '<a class="social-link" href="' + escapeHtml(entry[1]) + '" target="_blank" rel="noopener">' + escapeHtml(entry[0]) + '</a>';
    }).join("");
  }

  async function renderArtistDetail() {
    var container = $("#artist-detail");
    if (!container) return;

    function availabilityMarkup() {
      if (!artist.publicAvailability || !artist.publicAvailability.length) {
        return '<p>Disponibilités à confirmer avec le DJ.</p>';
      }
      return '<div class="tag-grid compact">' + artist.publicAvailability.map(function (slot) {
        var start = new Date(slot.start_at);
        var label = start.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) + " · " + (slot.status === "option" ? "Option" : "Disponible");
        return '<span>' + escapeHtml(label) + '</span>';
      }).join("") + '</div>';
    }

    var artist = await getArtistFromUrl();
    if (!artist) {
      container.innerHTML = [
        '<div class="empty-detail empty-state-premium">',
        '  <p class="eyebrow">Profil non disponible</p>',
        '  <h1>Profil non disponible</h1>',
        '  <p>Ce profil n’est pas encore validé ou n’existe plus dans la sélection DJ-hub.</p>',
        '  <div class="hero-actions">',
        '  <a class="btn btn-primary" href="djs.html">Voir les DJs</a>',
        '  <a class="btn btn-secondary" href="trouver-un-dj.html">Décrire ma soirée</a>',
        '  </div>',
        '</div>'
      ].join("");
      return;
    }

    document.title = artist.name + " - DJ " + artist.city + " - DJ-hub";

    container.innerHTML = [
      '<article class="artist-detail reveal">',
      '  <div class="artist-detail-media">' + artistVisual(artist, true) + '</div>',
      '  <div class="artist-detail-content">',
      '    <p class="eyebrow">Profil DJ validé</p>',
      '    <h1>' + escapeHtml(artist.name) + '</h1>',
      '    <p class="detail-subtitle">' + escapeHtml(artist.city) + ' · ' + escapeHtml((artist.styles || []).join(" / ")) + '</p>',
      '    <div class="detail-stats">',
      '      <span><strong>' + formatEuro(artist.priceFrom) + '</strong><small>à partir de</small></span>',
      '      <span><strong>' + escapeHtml(artist.material ? "Oui" : "À confirmer") + '</strong><small>matériel</small></span>',
      '      <span><strong>Validé</strong><small>par DJ-hub</small></span>',
      '    </div>',
      '    <p>' + escapeHtml(artist.bio || "Présentation en cours de validation.") + '</p>',
      '    <p class="muted">' + (artist.priceFrom ? 'À partir de ' + formatEuro(artist.priceFrom) + ' selon durée, lieu, matériel et disponibilité. Tarif final confirmé avant validation.' : 'Tarif à confirmer selon durée, lieu, matériel et disponibilité. Tarif final confirmé avant validation.') + '</p>',
      '    <div class="style-line detail-style-line">' + stylePills(artist.styles || [], 6) + '</div>',
      '    <div class="badge-row">' + badgeList([artist.material ? "Matériel possible" : "Matériel à confirmer", "Profil vérifié"], 3) + '</div>',
      '    <div class="detail-actions">',
      '      <a class="btn btn-primary" href="trouver-un-dj.html?dj=' + encodeURIComponent(artist.id) + '">Demander ce DJ</a>',
      artist.hasPresskit ? '      <a class="btn btn-secondary" href="presskit-public.html?id=' + encodeURIComponent(artist.id) + '">Voir le presskit</a>' : '',
      '      <a class="btn btn-secondary" href="djs.html">Voir d’autres DJs</a>',
      '    </div>',
      '    <div class="alert alert-soft">Tarif final confirmé avant validation avec le DJ. Les frais de service DJ-hub sont indiqués sur la facture.</div>',
      '  </div>',
      '</article>',
      '<div class="detail-grid">',
      '  <section class="detail-panel reveal"><h2>Expérience</h2><p>' + escapeHtml(artist.experience || "Expérience à confirmer.") + '</p></section>',
      '  <section class="detail-panel reveal"><h2>Matériel</h2><p>' + (artist.material ? "Matériel possible selon prestation et configuration du lieu." : "Matériel à confirmer selon le lieu et la demande.") + '</p></section>',
      '  <section class="detail-panel reveal"><h2>Zones couvertes</h2><div class="tag-grid compact">' + (artist.zones || []).map(function (zone) { return '<span>' + escapeHtml(zone) + '</span>'; }).join("") + '</div></section>',
      '  <section class="detail-panel reveal"><h2>Événements adaptés</h2><div class="tag-grid compact">' + (artist.eventTypes || []).map(function (type) { return '<span>' + escapeHtml(type) + '</span>'; }).join("") + '</div></section>',
      '  <section class="detail-panel reveal"><h2>Disponibilités publiques</h2>' + availabilityMarkup() + '</section>',
      '  <section class="detail-panel reveal"><h2>Liens</h2><div class="social-row">' + socialLinks(artist) + '</div></section>',
      '</div>'
    ].join("");

    initReveal();
  }

  function prefillFromQuery() {
    var params = new URLSearchParams(window.location.search);
    if (!params.toString()) return;

    var map = {
      ville: "city",
      date_evenement: "event_date",
      type_evenement: "event_type",
      style_musical: "music_style",
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
        feedback.textContent = "Merci, votre demande est en cours d’envoi.";
      });
    });
  }

  function renderAdminPrototype() {
    var stats = $("#admin-stats");
    var requestsTable = $("#admin-requests");
    var artistsTable = $("#admin-artists");
    if (!stats && !requestsTable && !artistsTable) return;

    if (stats) {
      stats.innerHTML = [
        ["Demandes enregistrées", "0"],
        ["DJs validés", String(artists.length)],
        ["Profils à valider", "0"],
        ["Alertes", "0"]
      ].map(function (item) {
        return '<article class="stat-card"><span>' + escapeHtml(item[0]) + '</span><strong>' + escapeHtml(item[1]) + '</strong></article>';
      }).join("");
    }

    if (requestsTable) {
      requestsTable.innerHTML = '<tr><td colspan="7">Aucune demande locale à afficher. Les demandes réelles seront visibles dans Supabase.</td></tr>';
    }

    if (artistsTable) {
      artistsTable.innerHTML = artists.length ? artists.map(function (artist) {
        return [
          '<tr>',
          '<td>' + escapeHtml(artist.name) + '</td>',
          '<td>' + escapeHtml(artist.city) + '</td>',
          '<td>' + escapeHtml((artist.styles || []).join(", ")) + '</td>',
          '<td>' + formatEuro(artist.priceFrom) + '</td>',
          '<td><span class="status-pill">Publié</span></td>',
          '</tr>'
        ].join("");
      }).join("") : '<tr><td colspan="5">Aucun DJ validé pour le moment.</td></tr>';
    }
  }

  document.addEventListener("DOMContentLoaded", async function () {
    initNav();
    prefillFromQuery();
    initForms();
    await renderPopularArtists();
    await renderArtistsList();
    await renderArtistDetail();
    renderAdminPrototype();
    initReveal();
  });
})();
