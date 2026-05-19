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
    const box = qs("#artist-requests-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function statusLabel(status) {
    return {
      new: "Nouvelle",
      sent_to_artist: "Envoyée au DJ",
      artist_accepted: "DJ intéressé",
      artist_refused: "DJ indisponible",
      client_confirmed: "Client confirmé",
      invoice_sent: "Facture envoyée",
      paid: "Payé",
      contacted: "Contacté",
      confirmed: "Confirmée",
      cancelled: "Annulée"
    }[status] || status;
  }

  async function ownProfile(userId) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function loadRequests(profileId) {
    const { data, error } = await client()
      .from("booking_requests")
      .select("*")
      .eq("artist_profile_id", profileId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data || [];
  }

  function summary(request) {
    return [
      "Demande DJ-hub",
      "Client : " + (request.client_name || ""),
      "Email : " + (request.client_email || ""),
      "Téléphone : " + (request.client_phone || ""),
      "Ville : " + (request.city || ""),
      "Date : " + (request.event_date || ""),
      "Heure : " + (request.start_time || ""),
      "Durée : " + (request.duration || ""),
      "Événement : " + (request.event_type || ""),
      "Lieu : " + (request.venue_type || ""),
      "Invités / jauge : " + (request.guests || ""),
      "Style : " + (request.music_style || ""),
      "Budget : " + (request.budget || ""),
      "Message : " + (request.message || "")
    ].join("\n");
  }

  function mailto(request) {
    return "mailto:contact@dj-hub.fr?subject=" + encodeURIComponent("DJ-hub - Plus d'infos demande " + (request.city || "")) + "&body=" + encodeURIComponent(summary(request));
  }

  function render(requests) {
    const root = qs("#artist-requests-list");
    if (!root) return;

    if (!requests.length) {
      root.innerHTML = '<div class="empty-state empty-state-premium"><h2>Aucune demande pour le moment.</h2><p>Les demandes apparaîtront ici lorsqu’un client choisira votre profil.</p></div>';
      return;
    }

    root.innerHTML = requests.map(function (request) {
      return [
        '<article class="validation-card" data-request-id="' + esc(request.id) + '">',
        '<div class="section-heading-row">',
        '<div><p class="eyebrow">' + esc(statusLabel(request.status)) + '</p><h2>' + esc(request.event_type || "Demande client") + '</h2><p>' + esc(request.city) + ' · ' + esc(request.event_date) + ' · ' + esc(request.budget || "Budget à confirmer") + '</p></div>',
        '</div>',
        '<div class="detail-grid compact-admin">',
        '<section class="detail-panel"><h3>Client</h3><p>' + esc(request.client_name) + '<br>' + esc(request.client_email) + '<br>' + esc(request.client_phone) + '</p></section>',
        '<section class="detail-panel"><h3>Soirée</h3><p>' + esc(request.event_type) + '<br>' + esc(request.venue_type) + '<br>' + esc(request.guests || "") + ' invités / jauge</p></section>',
        '<section class="detail-panel"><h3>Musique</h3><p>' + esc(request.music_style || "À confirmer") + '</p></section>',
        '<section class="detail-panel"><h3>Technique</h3><p>Sono : ' + esc(request.sound_system) + '<br>Lumières : ' + esc(request.lights_needed) + '<br>Matériel : ' + esc(request.material_needed) + '</p></section>',
        '</div>',
        '<p>' + esc(request.message || "") + '</p>',
        '<div class="hero-actions">',
        '<button class="btn btn-primary" type="button" data-action="artist_accepted">Accepter</button>',
        '<button class="btn btn-secondary" type="button" data-action="artist_refused">Refuser</button>',
        '<a class="btn btn-ghost" href="' + esc(mailto(request)) + '">Demander plus d’infos</a>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  async function updateRequest(id, status) {
    const { error } = await client()
      .from("booking_requests")
      .update({ status: status, artist_responded_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    try {
      const user = await window.getCurrentUser();
      await client().from("booking_events").insert({
        booking_request_id: id,
        actor_user_id: user ? user.id : null,
        actor_role: "artist",
        event_type: status,
        note: status === "artist_accepted" ? "Le DJ accepte la demande." : "Le DJ refuse la demande."
      });
    } catch (eventError) {
      console.warn("[DJ-hub] Événement artiste non enregistré.", eventError.message);
    }
  }

  async function init() {
    const root = qs("#artist-requests-list");
    if (!root) return;

    if (!configured()) {
      show("Supabase n’est pas encore configuré. Les demandes artiste seront visibles après connexion du projet.", "warning");
      return;
    }

    const role = await window.requireRole("artist", "connexion.html");
    if (!role) return;
    const user = await window.getCurrentUser();

    try {
      const profile = await ownProfile(user.id);
      if (!profile) {
        root.innerHTML = '<div class="empty-state empty-state-premium"><h2>Profil artiste requis</h2><p>Complétez votre profil pour recevoir des demandes liées.</p><a class="btn btn-primary" href="questionnaire-artiste.html">Compléter mon profil</a></div>';
        return;
      }
      render(await loadRequests(profile.id));
    } catch (error) {
      show(error.message || "Impossible de charger vos demandes.", "error");
    }

    root.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const card = event.target.closest("[data-request-id]");
      if (!card) return;
      try {
        await updateRequest(card.dataset.requestId, button.dataset.action);
        show("Demande mise à jour.", "success");
        const userNow = await window.getCurrentUser();
        const profile = await ownProfile(userNow.id);
        render(await loadRequests(profile.id));
      } catch (error) {
        show(error.message || "Mise à jour impossible.", "error");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
