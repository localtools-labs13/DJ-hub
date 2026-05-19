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
    const box = qs("#auth-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function statusLabel(status) {
    return {
      pending: "En attente de validation",
      approved: "Validé",
      rejected: "Refusé",
      needs_changes: "Modifications demandées"
    }[status] || "Profil à compléter";
  }

  async function getOwnArtistProfile(userId) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  function render(profile, user) {
    const root = qs("#artist-dashboard");
    if (!root) return;

    if (!profile) {
      root.innerHTML = [
        '<article class="auth-card empty-state">',
        '<p class="eyebrow">Profil artiste</p>',
        '<h2>Votre fiche DJ n’est pas encore créée.</h2>',
        '<p>Complétez le questionnaire artiste. Votre profil restera privé jusqu’à validation manuelle par DJ-hub.</p>',
        '<a class="btn btn-primary" href="questionnaire-artiste.html">Compléter mon questionnaire artiste</a>',
        '</article>'
      ].join("");
      return;
    }

    root.innerHTML = [
      '<article class="auth-card">',
      '<p class="eyebrow">Mon profil</p>',
      '<h2>' + esc(profile.artist_name) + '</h2>',
      '<div class="auth-status-row">',
      '<span class="status-pill">' + esc(statusLabel(profile.status)) + '</span>',
      '<span>' + esc(profile.city) + '</span>',
      '<span>' + esc((profile.styles || []).join(" / ")) + '</span>',
      '</div>',
      profile.admin_note ? '<div class="alert alert-soft"><strong>Note DJ-hub :</strong> ' + esc(profile.admin_note) + '</div>' : '',
      '<p>' + esc(profile.bio || "Bio à compléter.") + '</p>',
      '<div class="hero-actions">',
      '<a class="btn btn-primary" href="questionnaire-artiste.html">Créer / modifier mon profil</a>',
      '<a class="btn btn-secondary" href="calendrier-artiste.html">Gérer mes disponibilités</a>',
      profile.status === "approved" ? '<a class="btn btn-ghost" href="dj.html?id=' + encodeURIComponent(profile.id) + '">Voir ma fiche publique</a>' : '',
      '</div>',
      '<small>Connecté avec ' + esc(user.email) + '</small>',
      '</article>'
    ].join("");
  }

  async function init() {
    if (!qs("#artist-dashboard")) return;

    if (!window.djHubSupabaseConfig || !window.djHubSupabaseConfig.isConfigured || !client()) {
      show("Supabase n’est pas encore configuré. L’espace artiste sera actif après connexion du projet Supabase.", "warning");
      return;
    }

    const profile = await window.requireRole("artist", "connexion.html");
    if (!profile) return;

    const user = await window.getCurrentUser();
    try {
      const artistProfile = await getOwnArtistProfile(user.id);
      render(artistProfile, user);
    } catch (error) {
      show(error.message || "Impossible de charger l’espace artiste.", "error");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
