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
      artist_accepted: "DJ intéressé",
      artist_refused: "DJ indisponible",
      client_confirmed: "Client confirmé",
      invoice_sent: "Facture envoyée",
      paid: "Payé",
      confirmed: "Confirmée",
      cancelled: "Annulée",
      accepted: "Acceptée",
      refused: "Refusée"
    }[status] || status || "À traiter";
  }

  function statusClass(status) {
    return "status-" + String(status || "new").replace(/_/g, "-");
  }

  function list(values) {
    return Array.isArray(values) && values.length ? values.join(", ") : "Non renseigné";
  }

  function listValue(values) {
    return Array.isArray(values) ? values.filter(Boolean).join(", ") : "";
  }

  function boolValue(value) {
    if (value === true) return "true";
    if (value === false) return "false";
    return "";
  }

  function fieldBlock(label, key, value, type) {
    type = type || "text";
    return '<div><label>' + esc(label) + '</label><input data-admin-profile-field="' + esc(key) + '" type="' + esc(type) + '" value="' + esc(value || "") + '"></div>';
  }

  function textBlock(label, key, value, rows) {
    return '<div class="full"><label>' + esc(label) + '</label><textarea data-admin-profile-field="' + esc(key) + '" rows="' + esc(rows || 3) + '">' + esc(value || "") + '</textarea></div>';
  }

  function selectBlock(label, key, value, options) {
    return '<div><label>' + esc(label) + '</label><select data-admin-profile-field="' + esc(key) + '">' + options.map(function (item) {
      return '<option value="' + esc(item[0]) + '"' + (String(value || "") === String(item[0]) ? " selected" : "") + '>' + esc(item[1]) + '</option>';
    }).join("") + '</select></div>';
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
    const [artistRes, profileRes, requestRes, presskitRes, eventRes] = await Promise.all([
      client().from("artist_profiles").select("*").order("created_at", { ascending: false }),
      client().from("profiles").select("id,email,full_name"),
      client().from("booking_requests").select("*").order("created_at", { ascending: false }),
      client().from("artist_presskits").select("*"),
      client().from("booking_events").select("*").order("created_at", { ascending: false })
    ]);

    if (artistRes.error) throw artistRes.error;
    if (profileRes.error) throw profileRes.error;
    if (requestRes.error) throw requestRes.error;
    if (presskitRes.error) console.warn("[DJ-hub] Presskits non chargés.", presskitRes.error.message);
    if (eventRes.error) console.warn("[DJ-hub] Historique demandes non chargé.", eventRes.error.message);

    const profilesById = {};
    (profileRes.data || []).forEach(function (profile) { profilesById[profile.id] = profile; });

    const artistsById = {};
    (artistRes.data || []).forEach(function (artist) { artistsById[artist.id] = artist; });

    const presskitsByArtistId = {};
    (presskitRes.data || []).forEach(function (presskit) { presskitsByArtistId[presskit.artist_profile_id] = presskit; });
    const eventsByRequestId = {};
    (eventRes.data || []).forEach(function (event) {
      if (!eventsByRequestId[event.booking_request_id]) eventsByRequestId[event.booking_request_id] = [];
      eventsByRequestId[event.booking_request_id].push(event);
    });

    return {
      artists: artistRes.data || [],
      profilesById: profilesById,
      requests: requestRes.data || [],
      artistsById: artistsById,
      presskitsByArtistId: presskitsByArtistId,
      eventsByRequestId: eventsByRequestId
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
      ["Demandes nouvelles", state.requests.filter(function (r) { return r.status === "new"; }).length],
      ["Demandes confirmées", state.requests.filter(function (r) { return r.status === "confirmed"; }).length],
      ["Factures à suivre", state.requests.filter(function (r) { return r.invoice_status === "sent" || r.status === "invoice_sent"; }).length]
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
    const canPreviewPresskit = Boolean(presskit || (artist.artist_name && artist.city && ((artist.styles || []).length || artist.bio)));
    const rightsConfirmed = Boolean(artist.photo_rights_confirmed);
    const validationActions = artist.status === "approved" ? [
      '<span class="status-pill status-approved">Artiste déjà approuvé</span>',
      '<button class="btn btn-secondary" type="button" data-profile-action="needs_changes">Demander correction</button>'
    ].join("") : [
      '<button class="btn btn-primary" type="button" data-profile-action="approved">Approuver</button>',
      '<button class="btn btn-secondary" type="button" data-profile-action="needs_changes">Demander correction</button>',
      '<button class="btn btn-ghost" type="button" data-profile-action="rejected">Refuser</button>'
    ].join("");
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
      '<section class="detail-panel"><h3>Photo / presskit</h3><p>Photo uploadée : ' + esc(uploadedPhoto || "Aucune") + '<br>Lien externe : ' + esc(externalPhoto || "Aucun") + '<br>Crédit : ' + esc(artist.photo_credit || "Non renseigné") + '<br>Note : ' + esc(artist.photo_note || "Aucune") + '<br>Droits photo confirmés : ' + esc(rightsConfirmed ? "Oui" : "Non") + '<br>Date confirmation : ' + esc(artist.photo_rights_confirmed_at ? new Date(artist.photo_rights_confirmed_at).toLocaleString("fr-FR") : "Non renseignée") + '</p>' + (uploadedPhoto && !rightsConfirmed ? '<span class="status-pill status-cancelled">Droits photo à vérifier</span>' : '') + '</section>',
      presskit ? '<section class="detail-panel"><h3>Presskit généré</h3><p>' + esc(presskit.short_intro || presskit.title || "Presskit disponible") + '</p></section>' : '<section class="detail-panel"><h3>Presskit</h3><p>Non généré</p></section>',
      '</div>',
      '<details class="admin-artist-editor">',
      '<summary>Modifier la page artiste</summary>',
      '<p class="editor-helper">Ces champs mettent à jour la fiche artiste publique. Les changements restent soumis au statut du profil : seuls les profils approuvés sont visibles publiquement.</p>',
      '<div class="form-grid admin-profile-edit-grid">',
      fieldBlock("Nom d’artiste", "artist_name", artist.artist_name),
      fieldBlock("Slug public", "slug", artist.slug),
      fieldBlock("Ville", "city", artist.city),
      fieldBlock("Styles musicaux", "styles", listValue(artist.styles)),
      fieldBlock("Tarif à partir de", "price_from", artist.price_from, "number"),
      selectBlock("Matériel", "material", boolValue(artist.material), [["", "À confirmer"], ["true", "Oui"], ["false", "Non / à confirmer"]]),
      fieldBlock("Zones de déplacement", "zones", listValue(artist.zones)),
      fieldBlock("Types d’événements", "event_types", listValue(artist.event_types)),
      fieldBlock("Formats de set", "set_formats", listValue(artist.set_formats)),
      fieldBlock("Influences", "influences", artist.influences),
      fieldBlock("Ambiance préférée", "preferred_vibe", artist.preferred_vibe),
      fieldBlock("Instagram", "instagram", artist.instagram, "url"),
      fieldBlock("SoundCloud", "soundcloud", artist.soundcloud, "url"),
      fieldBlock("Mixcloud", "mixcloud", artist.mixcloud, "url"),
      fieldBlock("YouTube", "youtube", artist.youtube, "url"),
      fieldBlock("Site web", "website", artist.website, "url"),
      fieldBlock("Statut légal", "legal_status", artist.legal_status),
      fieldBlock("Photo uploadée URL", "public_image_url", artist.public_image_url, "url"),
      fieldBlock("Lien photo / presskit externe", "photo_url", artist.photo_url, "url"),
      fieldBlock("Crédit photo", "photo_credit", artist.photo_credit),
      textBlock("Bio", "bio", artist.bio, 5),
      textBlock("Expérience", "experience", artist.experience, 4),
      textBlock("Note photo", "photo_note", artist.photo_note, 3),
      '</div>',
      '<div class="hero-actions">',
      '<button class="btn btn-primary" type="button" data-profile-save="details">Enregistrer les modifications</button>',
      '</div>',
      '</details>',
      '<label>Note admin</label>',
      '<textarea data-note rows="3">' + esc(artist.admin_note || "") + '</textarea>',
      '<div class="hero-actions">',
      validationActions,
      canPreviewPresskit ? '<a class="btn btn-secondary" href="presskit-public.html?id=' + encodeURIComponent(artist.id) + '&admin=1">Voir presskit</a>' : '',
      '<a class="btn btn-secondary" href="presskit-artiste.html?artist=' + encodeURIComponent(artist.id) + '">Générer / modifier presskit</a>',
      '<a class="btn btn-ghost" href="presskit-artiste.html?artist=' + encodeURIComponent(artist.id) + '&download=pdf">Télécharger PDF A4</a>',
      '<button class="btn btn-ghost" type="button" data-copy="' + esc(summary) + '">Copier résumé artiste</button>',
      owner.email ? '<a class="btn btn-ghost" href="' + esc(mailto(owner.email, "DJ-hub - Votre profil artiste", summary)) + '">Envoyer email à l’artiste</a>' : '',
      '<button class="btn btn-danger" type="button" data-profile-delete>Supprimer l’artiste</button>',
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
      "Résumé demande DJ-hub",
      "Client : " + (request.client_name || ""),
      "Téléphone : " + (request.client_phone || ""),
      "Email : " + (request.client_email || ""),
      "Type demandeur : " + (request.requester_type || ""),
      "Ville : " + (request.city || ""),
      "Date : " + (request.event_date || ""),
      "Heure : " + (request.start_time || ""),
      "Durée : " + (request.duration || ""),
      "Type de soirée : " + (request.event_type || ""),
      "Type de lieu : " + (request.venue_type || ""),
      "Nombre d’invités / jauge : " + (request.guests || ""),
      "Style souhaité : " + (request.music_style || ""),
      "Budget : " + (request.budget || ""),
      "Sono : " + (request.sound_system || ""),
      "Lumières : " + (request.lights_needed || ""),
      "Matériel : " + (request.material_needed || ""),
      "DJ demandé : " + (artist ? artist.artist_name : "Non lié"),
      "Message : " + (request.message || ""),
      "Statut : " + statusLabel(request.status)
    ].join("\n");
  }

  function whatsappSummary(request, artist) {
    return [
      "Hello, nouvelle demande DJ-hub :",
      (request.event_type || "Soirée") + " à " + (request.city || "ville à confirmer") + " le " + (request.event_date || "date à confirmer"),
      "Heure : " + (request.start_time || "à confirmer") + " · Durée : " + (request.duration || "à confirmer"),
      "Jauge : " + (request.guests || "à confirmer") + " · Style : " + (request.music_style || "à confirmer"),
      "Budget : " + (request.budget || "à confirmer"),
      "DJ demandé : " + (artist ? artist.artist_name : "non lié"),
      "Réponse possible ?"
    ].join("\n");
  }

  function defaultEmailMessage(request, artist, target) {
    if (target === "artist") {
      return [
        "Bonjour,",
        "",
        "Nouvelle demande DJ-hub à regarder :",
        "",
        "Ville : " + (request.city || "à confirmer"),
        "Date : " + (request.event_date || "à confirmer"),
        "Heure : " + (request.start_time || "à confirmer"),
        "Type de soirée : " + (request.event_type || "à confirmer"),
        "Lieu : " + (request.venue_type || "à confirmer"),
        "Jauge : " + (request.guests || "à confirmer"),
        "Style souhaité : " + (request.music_style || "à confirmer"),
        "Budget : " + (request.budget || "à confirmer"),
        "Matériel / sono : " + (request.material_needed || request.sound_system || "à confirmer"),
        "",
        "Peux-tu me confirmer si tu es disponible et intéressé pour cette demande ?",
        "",
        "Merci,",
        "DJ-hub"
      ].join("\n");
    }

    return [
      "Bonjour " + (request.client_name || ""),
      "",
      "Merci pour votre demande DJ-hub.",
      "",
      "Nous avons bien reçu les informations pour votre événement à " + (request.city || "votre ville") + (request.event_date ? " le " + request.event_date : "") + ".",
      "Nous revenons vers vous avec un DJ compatible et un tarif final confirmé avant validation.",
      "",
      "Récapitulatif :",
      "- Type de soirée : " + (request.event_type || "à confirmer"),
      "- Lieu : " + (request.venue_type || "à confirmer"),
      "- Style souhaité : " + (request.music_style || "à confirmer"),
      "- Budget : " + (request.budget || "à confirmer"),
      "",
      "Le remplissage de la demande ne vous engage pas. Les frais de service DJ-hub seront indiqués clairement sur la facture.",
      "",
      "À très vite,",
      "DJ-hub"
    ].join("\n");
  }

  function emailSubject(request, target) {
    if (target === "artist") return "Nouvelle demande DJ-hub - " + (request.city || "ville à confirmer") + " - " + (request.event_date || "date à confirmer");
    return "Votre demande DJ-hub";
  }

  function invoiceText(request) {
    const dj = Number(request.validated_dj_price || 0);
    const fee = Number(request.service_fee || 0);
    const total = Number(request.total_client_price || 0);
    return [
      "Tarif prestation DJ : " + dj.toFixed(2) + " €",
      "Frais de service DJ-hub : " + fee.toFixed(2) + " €",
      "Total client : " + total.toFixed(2) + " €",
      "Tarif final, disponibilité et conditions confirmés avant validation."
    ].join("\n");
  }

  function invoiceTextFromCard(card) {
    const dj = Number((qs('[data-invoice-field="validated_dj_price"]', card) || {}).value || 0);
    const fee = Number((qs('[data-invoice-field="service_fee"]', card) || {}).value || 0);
    const total = Number((qs('[data-invoice-field="total_client_price"]', card) || {}).value || 0);
    return invoiceText({
      validated_dj_price: dj,
      service_fee: fee,
      total_client_price: total
    });
  }

  function invoiceStatusOptions(current) {
    const statuses = [
      ["not_sent", "Non envoyée"],
      ["sent", "Envoyée"],
      ["paid", "Payée"],
      ["cancelled", "Annulée"]
    ];
    return statuses.map(function (item) {
      return '<option value="' + esc(item[0]) + '"' + (current === item[0] ? " selected" : "") + '>' + esc(item[1]) + '</option>';
    }).join("");
  }

  function eventHistory(requestId, state) {
    const events = state.eventsByRequestId[requestId] || [];
    if (!events.length) return '<p>Aucun historique.</p>';
    return '<ul class="clean-list">' + events.slice(0, 6).map(function (event) {
      return '<li><strong>' + esc(statusLabel(event.event_type) || event.event_type) + '</strong> · ' + esc(new Date(event.created_at).toLocaleString("fr-FR")) + (event.note ? '<br>' + esc(event.note) : '') + '</li>';
    }).join("") + '</ul>';
  }

  function renderRequestCard(request, state) {
    const artist = request.artist_profile_id ? state.artistsById[request.artist_profile_id] : null;
    const artistOwner = artist ? state.profilesById[artist.user_id] : null;
    const summary = requestSummary(request, artist);
    const whatsapp = whatsappSummary(request, artist);
    return [
      '<article class="validation-card" data-request-id="' + esc(request.id) + '">',
      '<div class="section-heading-row">',
      '<div><p class="eyebrow">Pipeline demandes</p><h2>' + esc(request.event_type || "Demande client") + '</h2><p>' + esc(request.client_name) + ' · ' + esc(request.city) + ' · ' + esc(request.event_date) + '</p></div>',
      '<span class="status-pill ' + esc(statusClass(request.status)) + '">' + esc(statusLabel(request.status)) + '</span>',
      '</div>',
      '<div class="detail-grid compact-admin">',
      '<section class="detail-panel"><h3>Client</h3><p>' + esc(request.client_name) + '<br>' + esc(request.client_email) + '<br>' + esc(request.client_phone) + '<br>' + esc(request.requester_type) + '</p></section>',
      '<section class="detail-panel"><h3>Événement</h3><p>' + esc(request.event_type) + '<br>' + esc(request.venue_type) + '<br>' + esc(request.start_time || "") + ' · ' + esc(request.duration || "") + '</p></section>',
      '<section class="detail-panel"><h3>Jauge / style</h3><p>' + esc(request.guests || "") + ' invités<br>' + esc(request.music_style || "Style à confirmer") + '<br>' + esc(request.budget || "Budget à confirmer") + '</p></section>',
      '<section class="detail-panel"><h3>Technique</h3><p>Sono : ' + esc(request.sound_system) + '<br>Lumières : ' + esc(request.lights_needed) + '<br>Matériel : ' + esc(request.material_needed) + '</p></section>',
      '<section class="detail-panel"><h3>DJ demandé</h3><p>' + esc(artist ? artist.artist_name : "Aucun DJ lié") + '</p></section>',
      '<section class="detail-panel"><h3>Message</h3><p>' + esc(request.message || "Aucun message") + '</p></section>',
      '<section class="detail-panel"><h3>Notes</h3><label>Note admin</label><textarea data-admin-note rows="3">' + esc(request.admin_note || "") + '</textarea><label>Note DJ</label><textarea data-artist-note rows="2">' + esc(request.artist_note || "") + '</textarea><label>Note client</label><textarea data-client-note rows="2">' + esc(request.client_note || "") + '</textarea></section>',
      '<section class="detail-panel"><h3>Historique</h3>' + eventHistory(request.id, state) + '</section>',
      '</div>',
      '<div class="detail-panel invoice-panel">',
      '<h3>Facturation interne</h3>',
      '<div class="form-grid">',
      '<div><label>Tarif DJ validé</label><input data-invoice-field="validated_dj_price" type="number" min="0" step="0.01" value="' + esc(request.validated_dj_price || "") + '"></div>',
      '<div><label>Frais service</label><input data-invoice-field="service_fee" type="number" min="0" step="0.01" value="' + esc(request.service_fee || "") + '"></div>',
      '<div><label>Total client</label><input data-invoice-field="total_client_price" type="number" min="0" step="0.01" value="' + esc(request.total_client_price || "") + '"></div>',
      '<div><label>Statut facture</label><select data-invoice-field="invoice_status">' + invoiceStatusOptions(request.invoice_status || "not_sent") + '</select></div>',
      '<div class="full"><label>Lien facture / paiement</label><input data-invoice-field="invoice_link" type="url" value="' + esc(request.invoice_link || "") + '"></div>',
      '<div class="full"><label>Note facture</label><textarea data-invoice-field="invoice_note" rows="2">' + esc(request.invoice_note || "") + '</textarea></div>',
      '</div>',
      '<div class="hero-actions">',
      '<button class="btn btn-secondary" type="button" data-invoice-action="calculate">Calculer</button>',
      '<button class="btn btn-primary" type="button" data-invoice-action="save">Enregistrer facturation</button>',
      '<button class="btn btn-ghost" type="button" data-invoice-action="copy">Copier détail facture</button>',
      '</div>',
      '</div>',
      '<div class="detail-panel request-email-panel">',
      '<h3>Messages mail</h3>',
      '<p>Modifiez le texte si besoin, puis ouvrez votre email prérempli. Aucun envoi automatique n’est fait sans votre validation.</p>',
      '<div class="form-grid">',
      '<div><label>Message client</label><textarea data-email-message="client" rows="9">' + esc(defaultEmailMessage(request, artist, "client")) + '</textarea></div>',
      '<div><label>Message DJ</label><textarea data-email-message="artist" rows="9">' + esc(defaultEmailMessage(request, artist, "artist")) + '</textarea></div>',
      '</div>',
      '<div class="hero-actions">',
      request.client_email ? '<button class="btn btn-primary" type="button" data-mail-action="client">Envoyer email client</button>' : '<span class="status-pill">Email client indisponible</span>',
      artistOwner && artistOwner.email ? '<button class="btn btn-secondary" type="button" data-mail-action="artist">Envoyer email DJ</button>' : '<span class="status-pill">Email artiste indisponible</span>',
      '<button class="btn btn-ghost" type="button" data-copy-email-message="client">Copier message client</button>',
      '<button class="btn btn-ghost" type="button" data-copy-email-message="artist">Copier message DJ</button>',
      '</div>',
      '</div>',
      '<div class="hero-actions">',
      '<button class="btn btn-primary" type="button" data-request-action="confirmed">Accepter la demande</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="contacted">Marquer contacté</button>',
      '<button class="btn btn-primary" type="button" data-request-action="sent_to_artist">Envoyer au DJ</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="artist_accepted">Marquer accepté par DJ</button>',
      '<button class="btn btn-ghost" type="button" data-request-action="artist_refused">Marquer refusé par DJ</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="client_confirmed">Marquer client confirmé</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="invoice_sent">Marquer facture envoyée</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="paid">Marquer payé</button>',
      '<button class="btn btn-secondary" type="button" data-request-action="confirmed">Marquer confirmé</button>',
      '<button class="btn btn-ghost" type="button" data-request-action="cancelled">Annuler</button>',
      '<button class="btn btn-ghost" type="button" data-copy="' + esc(summary) + '">Copier résumé</button>',
      '<button class="btn btn-ghost" type="button" data-copy="' + esc(whatsapp) + '">Copier message WhatsApp</button>',
      '<button class="btn btn-danger" type="button" data-request-delete>Supprimer la demande</button>',
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

  function splitList(value) {
    return String(value || "")
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function readAdminProfileFields(card) {
    const data = {};
    Array.prototype.slice.call(card.querySelectorAll("[data-admin-profile-field]")).forEach(function (field) {
      const key = field.dataset.adminProfileField;
      if (["styles", "zones", "event_types", "set_formats"].indexOf(key) !== -1) {
        data[key] = splitList(field.value);
        return;
      }
      if (key === "price_from") {
        data[key] = field.value ? Number(field.value) : null;
        return;
      }
      if (key === "material") {
        data[key] = field.value === "true" ? true : field.value === "false" ? false : null;
        return;
      }
      data[key] = field.value ? field.value.trim() : null;
    });

    data.admin_note = qs("[data-note]", card) ? qs("[data-note]", card).value.trim() : "";
    return data;
  }

  async function updateArtistDetails(card) {
    const { error } = await client()
      .from("artist_profiles")
      .update(readAdminProfileFields(card))
      .eq("id", card.dataset.profileId);
    if (error) throw error;
  }

  async function deleteArtist(card) {
    const { error } = await client()
      .from("artist_profiles")
      .delete()
      .eq("id", card.dataset.profileId);
    if (error) throw error;
  }

  async function updateRequest(card, status) {
    const timestamps = {
      contacted: "contacted_at",
      sent_to_artist: "sent_to_artist_at",
      artist_accepted: "artist_responded_at",
      artist_refused: "artist_responded_at",
      client_confirmed: "confirmed_at",
      invoice_sent: "contacted_at",
      paid: "paid_at",
      confirmed: "confirmed_at"
    };
    const body = { status: status };
    if (timestamps[status]) body[timestamps[status]] = new Date().toISOString();
    if (status === "invoice_sent") body.invoice_status = "sent";
    if (status === "paid") body.invoice_status = "paid";
    if (status === "cancelled") body.invoice_status = "cancelled";
    body.admin_note = qs("[data-admin-note]", card) ? qs("[data-admin-note]", card).value.trim() : "";
    body.artist_note = qs("[data-artist-note]", card) ? qs("[data-artist-note]", card).value.trim() : "";
    body.client_note = qs("[data-client-note]", card) ? qs("[data-client-note]", card).value.trim() : "";

    const { error } = await client()
      .from("booking_requests")
      .update(body)
      .eq("id", card.dataset.requestId);
    if (error) throw error;

    await addBookingEvent(card.dataset.requestId, status, "Action admin : " + statusLabel(status));
  }

  async function deleteRequest(card) {
    const { error } = await client()
      .from("booking_requests")
      .delete()
      .eq("id", card.dataset.requestId);
    if (error) throw error;
  }

  function requestContext(card) {
    const request = (currentState && currentState.requests || []).find(function (item) {
      return String(item.id) === String(card.dataset.requestId);
    });
    const artist = request && request.artist_profile_id ? currentState.artistsById[request.artist_profile_id] : null;
    const artistOwner = artist ? currentState.profilesById[artist.user_id] : null;
    return { request: request, artist: artist, artistOwner: artistOwner };
  }

  function emailTargetAddress(context, target) {
    if (!context || !context.request) return "";
    if (target === "artist") return context.artistOwner && context.artistOwner.email ? context.artistOwner.email : "";
    return context.request.client_email || "";
  }

  async function openRequestEmail(card, target) {
    const context = requestContext(card);
    if (!context.request) throw new Error("Demande introuvable.");
    const to = emailTargetAddress(context, target);
    if (!to) throw new Error(target === "artist" ? "Email artiste indisponible." : "Email client indisponible.");
    const field = qs('[data-email-message="' + target + '"]', card);
    const body = field && field.value ? field.value : defaultEmailMessage(context.request, context.artist, target);
    await addBookingEvent(
      card.dataset.requestId,
      target === "artist" ? "email_artist_prepared" : "email_client_prepared",
      target === "artist" ? "Email DJ préparé par l’admin" : "Email client préparé par l’admin"
    );
    window.location.href = mailto(to, emailSubject(context.request, target), body);
  }

  async function addBookingEvent(requestId, eventType, note) {
    try {
      const profile = await window.getCurrentProfile();
      const user = await window.getCurrentUser();
      await client()
        .from("booking_events")
        .insert({
          booking_request_id: requestId,
          actor_user_id: user ? user.id : null,
          actor_role: profile ? profile.role : "admin",
          event_type: eventType,
          note: note || ""
        });
    } catch (error) {
      console.warn("[DJ-hub] Événement booking non enregistré.", error.message);
    }
  }

  function invoiceBody(card) {
    const data = {};
    Array.prototype.slice.call(card.querySelectorAll("[data-invoice-field]")).forEach(function (field) {
      const key = field.dataset.invoiceField;
      if (["validated_dj_price", "service_fee", "total_client_price"].indexOf(key) !== -1) {
        data[key] = field.value ? Number(field.value) : null;
      } else {
        data[key] = field.value || null;
      }
    });
    data.admin_note = qs("[data-admin-note]", card) ? qs("[data-admin-note]", card).value.trim() : "";
    data.artist_note = qs("[data-artist-note]", card) ? qs("[data-artist-note]", card).value.trim() : "";
    data.client_note = qs("[data-client-note]", card) ? qs("[data-client-note]", card).value.trim() : "";
    return data;
  }

  function calculateInvoice(card) {
    const djInput = qs('[data-invoice-field="validated_dj_price"]', card);
    const feeInput = qs('[data-invoice-field="service_fee"]', card);
    const totalInput = qs('[data-invoice-field="total_client_price"]', card);
    const dj = Number(djInput && djInput.value ? djInput.value : 0);
    const fee = Math.round(dj * 0.17 * 100) / 100;
    const total = Math.round((dj + fee) * 100) / 100;
    if (feeInput) feeInput.value = fee ? fee.toFixed(2) : "";
    if (totalInput) totalInput.value = total ? total.toFixed(2) : "";
  }

  async function saveInvoice(card) {
    const { error } = await client()
      .from("booking_requests")
      .update(invoiceBody(card))
      .eq("id", card.dataset.requestId);
    if (error) throw error;
    await addBookingEvent(card.dataset.requestId, "invoice_updated", "Facturation mise à jour");
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

      const profileSaveButton = event.target.closest("[data-profile-save]");
      if (profileSaveButton) {
        const card = event.target.closest("[data-profile-id]");
        if (!card) return;
        try {
          await updateArtistDetails(card);
          show("Page artiste mise à jour par l’admin.", "success");
          await refresh();
        } catch (error) {
          show(error.message || "Modification de la page artiste impossible.", "error");
        }
        return;
      }

      const profileDeleteButton = event.target.closest("[data-profile-delete]");
      if (profileDeleteButton) {
        const card = event.target.closest("[data-profile-id]");
        if (!card) return;
        const title = (qs("h2", card) || {}).textContent || "cet artiste";
        const confirmed = window.confirm("Supprimer définitivement le profil artiste “" + title + "” ? Ses disponibilités et presskits liés seront supprimés, et ses demandes client resteront conservées sans DJ lié.");
        if (!confirmed) return;
        try {
          await deleteArtist(card);
          show("Profil artiste supprimé.", "success");
          await refresh();
        } catch (error) {
          show(error.message || "Suppression artiste impossible. Vérifiez la policy Supabase admin.", "error");
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
        return;
      }

      const deleteButton = event.target.closest("[data-request-delete]");
      if (deleteButton) {
        const card = event.target.closest("[data-request-id]");
        if (!card) return;
        const confirmed = window.confirm("Supprimer définitivement cette demande client ? Cette action ne sera pas visible publiquement, mais elle retirera la demande de Supabase.");
        if (!confirmed) return;
        try {
          await deleteRequest(card);
          show("Demande client supprimée.", "success");
          await refresh();
        } catch (error) {
          show(error.message || "Suppression de la demande impossible. Vérifiez la policy Supabase admin.", "error");
        }
        return;
      }

      const mailButton = event.target.closest("[data-mail-action]");
      if (mailButton) {
        const card = event.target.closest("[data-request-id]");
        if (!card) return;
        try {
          await openRequestEmail(card, mailButton.dataset.mailAction);
          show("Email préparé dans votre logiciel de messagerie.", "success");
        } catch (error) {
          show(error.message || "Préparation email impossible.", "error");
        }
        return;
      }

      const copyEmailButton = event.target.closest("[data-copy-email-message]");
      if (copyEmailButton) {
        const card = event.target.closest("[data-request-id]");
        const target = copyEmailButton.dataset.copyEmailMessage;
        const field = card ? qs('[data-email-message="' + target + '"]', card) : null;
        if (!field) return;
        await copy(field.value);
        show(target === "artist" ? "Message DJ copié." : "Message client copié.", "success");
        return;
      }

      const invoiceButton = event.target.closest("[data-invoice-action]");
      if (invoiceButton) {
        const card = event.target.closest("[data-request-id]");
        if (!card) return;
        if (invoiceButton.dataset.invoiceAction === "calculate") {
          calculateInvoice(card);
          show("Calcul interne effectué.", "success");
          return;
        }
        if (invoiceButton.dataset.invoiceAction === "copy") {
          await copy(invoiceTextFromCard(card));
          show("Détail facture copié.", "success");
          return;
        }
        try {
          await saveInvoice(card);
          show("Facturation enregistrée.", "success");
          await refresh();
        } catch (error) {
          show(error.message || "Enregistrement facturation impossible.", "error");
        }
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
