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
      rejected: "Refusé"
    }[status] || status;
  }

  async function loadProfiles() {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  function renderStats(profiles) {
    const root = qs("#validation-stats");
    if (!root) return;
    const statuses = ["pending", "approved", "needs_changes", "rejected"];
    root.innerHTML = statuses.map(function (status) {
      const count = profiles.filter(function (profile) { return profile.status === status; }).length;
      return '<article class="stat-card"><span>' + statusLabel(status) + '</span><strong>' + count + '</strong></article>';
    }).join("");
  }

  function renderList(profiles) {
    const root = qs("#validation-list");
    if (!root) return;

    if (!profiles.length) {
      root.innerHTML = '<div class="empty-state"><h2>Aucun profil à valider pour le moment</h2><p>Les nouvelles candidatures artistes apparaîtront ici.</p></div>';
      return;
    }

    root.innerHTML = profiles.map(function (profile) {
      return [
        '<article class="validation-card" data-profile-id="' + esc(profile.id) + '">',
        '<div>',
        '<p class="eyebrow">' + esc(statusLabel(profile.status)) + '</p>',
        '<h2>' + esc(profile.artist_name) + '</h2>',
        '<p>' + esc(profile.city) + ' · ' + esc((profile.styles || []).join(" / ")) + '</p>',
        '</div>',
        '<div class="detail-grid compact-admin">',
        '<section class="detail-panel"><h3>Tarif</h3><p>' + (profile.price_from ? esc(profile.price_from + " EUR") : "Non renseigné") + '</p></section>',
        '<section class="detail-panel"><h3>Matériel</h3><p>' + (profile.material ? "Oui" : "Non / à confirmer") + '</p></section>',
        '<section class="detail-panel"><h3>Bio</h3><p>' + esc(profile.bio || "Non renseignée") + '</p></section>',
        '<section class="detail-panel"><h3>Expérience</h3><p>' + esc(profile.experience || "Non renseignée") + '</p></section>',
        '<section class="detail-panel"><h3>Zones</h3><p>' + esc((profile.zones || []).join(", ") || "Non renseignées") + '</p></section>',
        '<section class="detail-panel"><h3>Événements</h3><p>' + esc((profile.event_types || []).join(", ") || "Non renseignés") + '</p></section>',
        '<section class="detail-panel"><h3>Liens</h3><p>' + esc([profile.instagram, profile.soundcloud, profile.mixcloud].filter(Boolean).join(" · ") || "Aucun") + '</p></section>',
        '<section class="detail-panel"><h3>Photo / presskit</h3><p>' + esc(profile.photo_url || profile.public_image_url || "Aucun lien") + '</p></section>',
        '</div>',
        '<label for="note-' + esc(profile.id) + '">Note admin</label>',
        '<textarea id="note-' + esc(profile.id) + '" data-note rows="3">' + esc(profile.admin_note || "") + '</textarea>',
        '<div class="hero-actions">',
        '<button class="btn btn-primary" type="button" data-action="approved">Approuver</button>',
        '<button class="btn btn-secondary" type="button" data-action="needs_changes">Demander correction</button>',
        '<button class="btn btn-ghost" type="button" data-action="rejected">Refuser</button>',
        '</div>',
        '</article>'
      ].join("");
    }).join("");
  }

  async function updateProfile(card, status) {
    const id = card.dataset.profileId;
    const note = qs("[data-note]", card).value.trim();
    const { error } = await client()
      .from("artist_profiles")
      .update({ status: status, admin_note: note })
      .eq("id", id);

    if (error) throw error;
  }

  async function refresh() {
    const profiles = await loadProfiles();
    renderStats(profiles);
    renderList(profiles);
  }

  async function init() {
    if (!qs("#validation-list")) return;

    if (!window.djHubSupabaseConfig || !window.djHubSupabaseConfig.isConfigured || !client()) {
      show("Supabase n’est pas encore configuré. La validation admin sera active après connexion du projet.", "warning");
      return;
    }

    const profile = await window.requireRole("admin", "connexion.html");
    if (!profile || profile.role !== "admin") return;

    try {
      await refresh();
    } catch (error) {
      show(error.message || "Impossible de charger les validations.", "error");
    }

    qs("#validation-list").addEventListener("click", async function (event) {
      const button = event.target.closest("[data-action]");
      if (!button) return;
      const card = event.target.closest("[data-profile-id]");
      if (!card) return;

      try {
        await updateProfile(card, button.dataset.action);
        show("Profil mis à jour.", "success");
        await refresh();
      } catch (error) {
        show(error.message || "Mise à jour impossible.", "error");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
