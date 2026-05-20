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
      pending: "Profil en attente de validation",
      approved: "Profil validé et visible publiquement",
      rejected: "Profil refusé",
      needs_changes: "Modifications demandées"
    }[status] || "Profil à compléter";
  }

  function statusHelp(status) {
    if (status === "approved") return "Votre profil est validé. Vos disponibilités peuvent être utilisées pour les recherches clients.";
    if (status === "pending") return "Votre profil est en attente de validation. Vous pouvez préparer votre presskit et vos disponibilités, mais ils ne seront visibles publiquement qu’après validation.";
    if (status === "needs_changes") return "DJ-hub a demandé des corrections. Modifiez votre profil puis renvoyez-le en validation.";
    if (status === "rejected") return "Votre profil a été refusé pour le moment. Consultez la note admin avant de le retravailler.";
    return "Complétez votre profil pour l’envoyer en validation.";
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
        '<h2>Vous n’avez pas encore complété votre profil artiste.</h2>',
        '<p>Complétez votre profil. Il restera privé jusqu’à validation manuelle par DJ-hub.</p>',
        '<a class="btn btn-primary" href="questionnaire-artiste.html">Compléter mon profil</a>',
        '<div class="alert alert-soft">Complétez votre profil avant de générer un presskit complet.</div>',
        '</article>'
      ].join("");
      return;
    }

    const photo = profile.public_image_url
      ? '<img src="' + esc(profile.public_image_url) + '" alt="Photo artiste ' + esc(profile.artist_name) + '">'
      : '<div class="dashboard-photo-placeholder">Aucune photo importée pour le moment.</div>';

    root.innerHTML = [
      '<article class="auth-card">',
      '<div class="artist-dashboard-card">',
      '<div class="artist-dashboard-photo">' + photo + '</div>',
      '<div>',
      '<p class="eyebrow">Mon profil</p>',
      '<h2>' + esc(profile.artist_name) + '</h2>',
      '<div class="auth-status-row">',
      '<span class="status-pill">' + esc(statusLabel(profile.status)) + '</span>',
      '<span>' + esc(profile.city) + '</span>',
      '<span>' + esc((profile.styles || []).join(" / ")) + '</span>',
      '</div>',
      '</div>',
      '</div>',
      profile.admin_note ? '<div class="alert alert-soft"><strong>Note DJ-hub :</strong> ' + esc(profile.admin_note) + '</div>' : '',
      '<div class="alert alert-soft">' + esc(statusHelp(profile.status)) + '</div>',
      '<p>' + esc(profile.bio || "Bio à compléter.") + '</p>',
      '<div class="hero-actions">',
      '<a class="btn btn-primary" href="questionnaire-artiste.html">Créer / modifier mon profil</a>',
      '<a class="btn btn-secondary" href="questionnaire-artiste.html#photo">Ajouter / modifier ma photo</a>',
      '<a class="btn btn-secondary" href="presskit-artiste.html">Prévisualiser / modifier mon presskit</a>',
      '<a class="btn btn-secondary" href="calendrier-artiste.html">Gérer mes disponibilités</a>',
      '<a class="btn btn-secondary" href="demandes-artiste.html">Voir mes demandes</a>',
      profile.status === "approved" ? '<a class="btn btn-ghost" href="dj.html?id=' + encodeURIComponent(profile.id) + '">Voir ma fiche publique</a>' : '',
      '<button class="btn btn-ghost" type="button" onclick="signOutUser()">Déconnexion</button>',
      '</div>',
      '<small>Connecté avec ' + esc(user.email) + '</small>',
      '</article>',
      '<article class="auth-card dashboard-presskit-card">',
      '<p class="eyebrow">Presskit DJ-hub</p>',
      '<h2>Votre presskit DJ</h2>',
      '<p>Un document propre à préparer pour les organisateurs, bars ou lieux. Il reprend votre photo, votre bio, vos styles, vos liens audio, vos infos techniques et le contact via DJ-hub.</p>',
      '<div class="hero-actions">',
      '<a class="btn btn-primary" href="presskit-artiste.html">Prévisualiser / modifier mon presskit</a>',
      '</div>',
      (!profile.bio || !(profile.styles || []).length || !profile.city) ? '<div class="alert alert-soft">Complétez votre profil avant de générer un presskit complet.</div>' : '',
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
