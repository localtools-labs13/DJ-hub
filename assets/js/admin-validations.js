(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function esc(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char];
    });
  }

  function client() {
    return window.djHubSupabase || null;
  }

  function configured() {
    return Boolean(window.djHubSupabaseConfig && window.djHubSupabaseConfig.isConfigured && client());
  }

  function show(text, state) {
    const box = qs("#admin-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function statusLabel(status) {
    return {
      pending: "En attente",
      approved: "Approuvé",
      needs_changes: "À corriger",
      rejected: "Refusé",
      new: "Nouvelle",
      contacted: "Contacté",
      sent_to_artist: "Envoyée au DJ",
      confirmed: "Confirmée",
      cancelled: "Annulée",
      accepted: "Acceptée",
      refused: "Refusée"
    }[status] || status || "À traiter";
  }

  function list(values) {
    return Array.isArray(values) && values.length ? values.join(", ") : "Non renseigné";
  }

  function mailto(to, subject, body) {
    return "mailto:" + encodeURIComponent(to || "") + "?subject=" + encodeURIComponent(subject || "DJ-hub") + "&body=" + encodeURIComponent(body || "");
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return Promise.resolve();
  }

  async function loadAll() {
    const [artistRes, profileRes, requestRes, presskitRes] = await Promise.all([
      client().from("artist_profiles").select("*").order("created_at", { ascending: false }),
      client().from("profiles").select("id,email,full_name"),
      client().from("booking_requests").select("*").order("created_at", { ascending: false }),
      client().from("artist_presskits").select("*")
    ]);

    if (artistRes.error) throw artistRes.error;
    if (profileRes.error) throw profileRes.error;
    if (requestRes.error) throw requestRes.error;
    if (presskitRes.error) console.warn("[DJ-hub] Presskits non chargés.", presskitRes.error.message);

    const profilesById = {};
    (profileRes.data || []).forEach(function (profile) { profilesById[profile.id] = profile; });

    const artistsById = {};
    (artistRes.data || []).forEach(function (artist) { artistsById[artist.id] = artist; });

    const presskitsByArtistId = {};
    (presskitRes.data || []).forEach(function (presskit) { presskitsByArtistId[presskit.artist_profile_id] = presskit; });

    return {
      artists: artistRes.data || [],
      profilesById: profilesById,
      requests: requestRes.data || [],
      artistsById: artistsById,
      presskitsByArtistId: presskitsByArtistId
    };
  }

  function renderStats(state) {
    const root = qs("#validation-stats");
    if (!root) return;
    const items = [
      ["Artistes en attente", state.artists.filter(function (a) { return a.status === "pending"; }).length],
      ["Artistes validés", state.artists.filter(function (a) { return a.status === "approved"; }).length],
      ["Corrections demandées", state.artists.filter(function (a) { return a.status === "needs_changes"; }).length],
      ["Profils refusés", state.artists.filter(function (a) { return a.status === "rejected"; }).length],
      ["Demandes clients nouvelles", state.requests.filter(function (r) { return r.status === "new"; }).length]
    ];
    root.innerHTML = items.map(function (item) {
      return '<article class="stat-card"><span>' + esc(item[0]) + '</span><strong>' + esc(item[1]) + '</strong></article>';
    }).join("");
  }

  function artistSummary(artist, email) {
    return [
      "Artiste DJ-hub : " + (artist.artist_name || ""),
      "Email : " + (email || ""),
      "Ville : " + (artist.city || ""),
      "Styles : " + list(artist.styles),
      "Prix indicatif : " + (artist.price_from || "Non renseigné"),
      "Matériel : " + (artist.material ? "Oui" : "À confirmer"),
      "Zones : " + list(artist.zones),
      "Événements : " + list(artist.event_types),
      "Bio : " + (artist.bio || ""),
      "Expérience : " + (artist.experience || "")
    ].join("\n");
  }

  function renderArtistCard(artist, state) {
    const owner = state.profilesById[artist.user_id] || {};
    const presskit = state.presskitsByArtistId[artist.id];
    const uploadedPhoto = artist.public_image_url || "";
    const externalPhoto = artist.photo_url || "";
    const summary = artistSummary(artist, owner.email);
    return [
      '<article class="validation-card" data-profile-id="' + esc(artist.id) + '">',
      '<div class="section-heading-row">',
      '<div><p class="eyebrow">' + esc(statusLabel(artist.status)) + '</p><h2>' + esc(artist.artist_name) + '</h2><p>' + esc(owner.email || "Email indisponible") + ' · ' + esc(artist.city) + '</p></div>',
      uploadedPhoto ? '<a class="btn btn-ghost" href="' + esc(uploadedPhoto) + '" target="_blank" rel="noopener">Voir la photo</a>' : '',
      externalPhoto ? '<a class="btn btn-ghost" href="' + esc(externalPhoto) + '" target="_blank" rel="noopener">Ouvrir le presskit / lien externe</a>' : '',
      '</div>',
      uploadedPhoto ? '<div class="validation-photo-block"><img src="' + esc(uploadedPhoto) + '" alt="Photo artiste ' + esc(artist.artist_name) + '"><p>' + esc(artist.photo_credit ? "Crédit photo : " + artist.photo_credit : "Photo uploadée par l’artiste") + '</p></div>' : '',
      '<div class="detail-grid compact-admin">',
      '<section class="detail-panel"><h3>Styles</h3><p>' + esc(list(artist.styles)) + '</p></section>',
      '<section class="detail-panel"><h3>Prix indicatif</h3><p>' + esc(artist.price_from ? artist.price_from + " EUR" : "Non renseigné") + '</p></section>',
      '<section class="detail-panel"><h3>Matériel</h3><p>' + esc(artist.material ? "Oui" : "À confirmer") + '</p></section>',
      '<section class="detail-panel"><h3>Statut légal</h3><p>' + esc(artist.legal_status || "Non renseigné") + '</p></section>',
      '<section class="detail-panel"><h3>Bio</h3><p>' + esc(artist.bio || "Non renseignée") + '</p></section>',
      '<section class="detail-panel"><h3>Expérience</h3><p>' + esc(artist.experience || "Non renseignée") + '</p></section>',
      '<section class="detail-panel"><h3>Zones</h3><p>' + esc(list(artist.zones)) + '</p></section>',
      '<section class="detail-panel"><h3>Événements</h3><p>' + esc(list(artist.event_types)) + '</p></section>',
      '<section class="detail-panel"><h3>Liens</h3><p>' + esc([artist.instagram, artist.soundcloud, artist.mixcloud, artist.youtube, artist.website].filter(Boolean).join(" · ") || "Aucun") + '</p></section>',
      '<section class="detail-panel"><h3>Photo / presskit</h3><p>Photo uploadée : ' + esc(uploadedPhoto || "Aucune") + '<br>Lien externe : ' + esc(externalPhoto || "Aucun") + '<br>Crédit : ' + esc(artist.photo_credit || "Non renseigné") + '<br>Note : ' + esc(artist.photo_note || "Aucune") + '</p></section>',
      presskit ? '<section class="detail-panel"><h3>Presskit généré</h3><p>' + esc(presskit.short_intro || presskit.title || "Presskit disponible") + '</p></section>' : '<section class="detail-panel"><h3>Presskit</h3><p>Non généré</p></section>',
      '</div>',
      '<label>Note admin</label>',
      '<textarea data-note rows="3">' + esc(artist.admin_note || "") + '</textarea>',
      '<div class="hero-actions">',
      '<button class="btn btn-primary" type="button" data-profile-action="approved">Approuver</button>',
      '<button class="btn btn-secondary" type="button" data-profile-action="needs_changes">Demander correction</button>',
      '<button class="btn btn-ghost" type="button" data-profile-action="rejected">Refuser</button>',
      presskit ? '<a class="btn btn-secondary" href="presskit-public.html?id=' + encodeURIComponent(artist.id) + '&admin=1">Voir presskit</a>' : '',
      '<button class="btn btn-ghost" type="button" data-copy="' + esc(summary) + '">Copier résumé artiste</button>',
      owner.email ? '<a class="btn btn-ghost" href="' + esc(mailto(owner.email, "DJ-hub - Votre profil artiste", summary)) + '">Envoyer email à l’artiste</a>' : '',
      '</div>',
      '</article>'
    ].join("");
  }

  function renderArtistSection(selector, artists, state, emptyText) {
    const root = qs(selector);
    if (!root) return;
    root.innerHTML = artists.length ? artists.map(function (artist) { return renderArtistCard(artist, state); }).join("") : '<div class="empty-state empty-state-premium"><h2>' + esc(emptyText) + '</h2></div>';
  }

  function requestSummary(request, artist) {
    return [
      "Demande client DJ-hub",
      "Client : " + (request.client_name || ""),
      "Email : " + (request.client_email || ""),
      "Téléphone : " + (request.client_phone || ""),
      "Type demandeur : " + (request.requester_type || ""),
      "Ville : " + (request.city || ""),
      "Date : " + (request.event_date || ""),
      "Heure : " + (request.start_time || ""),
      "Durée : " + (request.duration || ""),
      "Événement : " + (request.event_type || ""),
      "Lieu : " + (request.venue_type || ""),
      "Invités / jauge : " + (request.guests || ""),
      "Style : " + (request.music_style || ""),
      "Budget : " + (request.budget || ""),
      "Sono : " + (request.sound_system || ""),
      "Lumières : " + (request.lights_needed || ""),
      "Matériel : " + (request.material_needed || ""),
      "DJ demandé : " + (artist ? artist.artist_name : "Non lié"),
      "Message : " + (request.message || "")
    ].join("\n");
  }

  function renderRequestCard(request, state) {
    const artist = request.artist_profile_id ? state.artistsById[request.artist_profile_id] : null;
    const artistOwner = artist ? state.profilesById[artist.user_id] : null;
    const summary = requestSummary(request, artist);
    return [
      '<article class="validation-card" data-request-id="' + esc(request.id) + '">',
      '<div class="section-heading-row">',
      '<div><p class="eyebrow">' + esc(statusLabel(request.status)) + '</p><h2>' + esc(request.event_type || "Demande client") + '</h2><p>' + esc(request.client_name) + ' · ' + esc(request.city) + ' · ' + esc(request.event_date) + '</p></div>',
      '</div>',
      '<div class="detail-grid compact-admin">',
      '<section class="detail-panel"><h3>Client</h3><p>' + esc(request.client_name) + '<br>' + esc(request.client_email) + '<br>' + esc(request.client_phone) + '<br>' + esc(request.requester_type) + '</p></section>',
      '<section class="detail-panel"><h3>Événement</h3><p>' + esc(request.event_type) + '<br>' + esc(request.venue_type) + '<br>' + esc(request.start_time || "") + ' · ' + esc(request.duration || "") + '</p></section>',
      '<section class="detail-panel"><h3>Jauge / style</h3><p>' + esc(request.guests || "") + ' invités<br>' + esc(request.music_style || "Style à confirmer") + '<br>' + esc(request.budget || "Budget à confirmer") + '</p></section>',
      '<section class="detail-panel"><h3>Technique</h3><p>Sono : ' + esc(request.sound_system) + '<br>Lumières : ' + esc(request.lights_needed) + '<br>Matériel : ' + esc(request.material_needed) + '</p></section>',
      '<section class="detail-panel"><h3>DJ demandé</h3><p>' + esc(artist ? artist.artist_name : "Aucun DJ lié") + '</p></section>',
      '<section class="detail-panel"><h3>Message</h3><p>' + esc(request.message || "Aucun message") + '</p></section>',
      '</div>',
      '<div class="hero-actions">',
      '<button class="btn btn-secondary" type="button" data-request-action="contacted">Marquer contacté</button>',
      '<button class="btn btn-primary" type="button" data-request-action="sent_to_artist">Envoyer au DJ</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="confirmed">Marquer confirmé</button>',
      '<button class="btn btn-ghost" type="button" data-request-action="cancelled">Annuler</button>',
      '<button class="btn btn-ghost" type="button" data-copy="' + esc(summary) + '">Copier résumé client</button>',
      request.client_email ? '<a class="btn btn-ghost" href="' + esc(mailto(request.client_email, "DJ-hub - Votre demande DJ", summary)) + '">Envoyer email au client</a>' : '',
      artistOwner && artistOwner.email ? '<a class="btn btn-ghost" href="' + esc(mailto(artistOwner.email, "DJ-hub - Nouvelle demande liée", summary)) + '">Envoyer email à l’artiste</a>' : '',
      '</div>',
      '</article>'
    ].join("");
  }

  function renderRequests(selector, requests, state, emptyText) {
    const root = qs(selector);
    if (!root) return;
    root.innerHTML = requests.length ? requests.map(function (request) { return renderRequestCard(request, state); }).join("") : '<div class="empty-state empty-state-premium"><h2>' + esc(emptyText) + '</h2></div>';
  }

  async function updateArtist(card, status) {
    const note = qs("[data-note]", card).value.trim();
    const { error } = await client()
      .from("artist_profiles")
      .update({ status: status, admin_note: note })
      .eq("id", card.dataset.profileId);
    if (error) throw error;
  }

  async function updateRequest(card, status) {
    const { error } = await client()
      .from("booking_requests")
      .update({ status: status })
      .eq("id", card.dataset.requestId);
    if (error) throw error;
  }

  let currentState = null;

  async function refresh() {
    currentState = await loadAll();
    renderStats(currentState);
    renderArtistSection("#pending-artists-list", currentState.artists.filter(function (a) { return a.status === "pending"; }), currentState, "Aucun artiste en attente.");
    renderArtistSection("#approved-artists-list", currentState.artists.filter(function (a) { return a.status === "approved"; }), currentState, "Aucun artiste validé.");
    renderArtistSection("#review-artists-list", currentState.artists.filter(function (a) { return a.status === "needs_changes" || a.status === "rejected"; }), currentState, "Aucune correction ou refus.");
    renderRequests("#booking-requests-list", currentState.requests, currentState, "Aucune demande client.");
    renderRequests("#recent-requests-list", currentState.requests.slice(0, 5), currentState, "Aucune demande récente.");
  }

  async function init() {
    if (!qs("#validation-list")) return;

    if (!configured()) {
      show("Supabase n’est pas encore configuré. La validation admin sera active après connexion du projet.", "warning");
      return;
    }

    const profile = await window.requireRole("admin", "connexion.html");
    if (!profile || profile.role !== "admin") return;

    try {
      await refresh();
    } catch (error) {
      show(error.message || "Impossible de charger les données admin.", "error");
    }

    document.addEventListener("click", async function (event) {
      const copyButton = event.target.closest("[data-copy]");
      if (copyButton) {
        await copy(copyButton.dataset.copy);
        show("Résumé copié.", "success");
        return;
      }

      const profileButton = event.target.closest("[data-profile-action]");
      if (profileButton) {
        const card = event.target.closest("[data-profile-id]");
        if (!card) return;
        try {
          await updateArtist(card, profileButton.dataset.profileAction);
          show("Profil artiste mis à jour.", "success");
          await refresh();
        } catch (error) {
          show(error.message || "Mise à jour artiste impossible.", "error");
        }
        return;
      }

      const requestButton = event.target.closest("[data-request-action]");
      if (requestButton) {
        const card = event.target.closest("[data-request-id]");
        if (!card) return;
        try {
          await updateRequest(card, requestButton.dataset.requestAction);
          show("Demande client mise à jour.", "success");
          await refresh();
        } catch (error) {
          show(error.message || "Mise à jour demande impossible.", "error");
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
