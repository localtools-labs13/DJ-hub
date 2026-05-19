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

  function unavailable(text) {
    const root = qs("#presskit-public");
    if (!root) return;
    root.innerHTML = '<div class="empty-state empty-state-premium"><p class="eyebrow">Presskit</p><h1>Presskit non disponible.</h1><p>' + esc(text || "Ce presskit n’est pas public pour le moment.") + '</p><a class="btn btn-primary" href="djs.html">Voir les DJs</a></div>';
  }

  function tags(values) {
    return (values || []).map(function (value) {
      return '<span>' + esc(value) + '</span>';
    }).join("");
  }

  function list(values, fallback) {
    return Array.isArray(values) && values.length ? values.join(", ") : fallback || "à confirmer";
  }

  function generateFallbackPresskit(profile) {
    const styles = list(profile.styles, "plusieurs univers musicaux");
    const events = list(profile.event_types, "soirées privées et petits lieux");
    const shortIntro = (profile.artist_name || "Ce DJ") + " est un DJ basé à " + (profile.city || "votre ville") + ", spécialisé en " + styles + ". Son univers est pensé pour les " + events + ", avec une sélection adaptée à l’ambiance du lieu, au public et au moment de la soirée.";
    return {
      short_intro: shortIntro,
      long_bio: [shortIntro, profile.bio || "", profile.experience || ""].filter(Boolean).join("\n\n"),
      booking_text: "Contact réservation via DJ-hub. Tarif final, disponibilité et conditions à confirmer avant validation.",
      technical_info: "Zone de déplacement : " + list(profile.zones, profile.city || "à confirmer") + ". Matériel : " + (profile.material ? "matériel disponible selon configuration" : "à confirmer") + "."
    };
  }

  function render(profile, presskit) {
    const root = qs("#presskit-public");
    const image = profile.public_image_url || "";
    if (!root) return;
    root.innerHTML = [
      '<article class="presskit-card presskit-page reveal" id="presskit-sheet">',
      image ? '<img class="presskit-cover" src="' + esc(image) + '" alt="' + esc(profile.artist_name) + '">' : '<div class="artist-placeholder artist-placeholder-large"><span>DJ</span><i></i></div>',
      '<div class="presskit-body">',
      profile.photo_credit ? '<small>Crédit photo : ' + esc(profile.photo_credit) + '</small>' : '',
      '<p class="eyebrow">' + (profile.status === "approved" ? "Profil validé par DJ-hub" : "Prévisualisation admin") + '</p>',
      '<h1>' + esc(profile.artist_name) + '</h1>',
      '<p class="detail-subtitle">' + esc(profile.city) + ' · ' + esc((profile.styles || []).join(" / ")) + '</p>',
      '<div class="style-line detail-style-line">' + tags(profile.styles) + '</div>',
      '<p>' + esc(presskit.short_intro || "") + '</p>',
      '<section><h2>Bio</h2><p>' + esc(presskit.long_bio || "").replace(/\n/g, "<br>") + '</p></section>',
      '<section><h2>Booking</h2><p>' + esc(presskit.booking_text || "") + '</p></section>',
      '<section><h2>Technique</h2><p>' + esc(presskit.technical_info || "") + '</p></section>',
      '<div class="hero-actions"><a class="btn btn-primary" href="trouver-un-dj.html?dj=' + encodeURIComponent(profile.id) + '">Demander ce DJ</a><button class="btn btn-secondary" type="button" onclick="window.print()">Imprimer / PDF</button></div>',
      '</div>',
      '</article>'
    ].join("");
  }

  async function init() {
    if (!qs("#presskit-public")) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const adminPreview = new URLSearchParams(window.location.search).get("admin") === "1";
    if (!id) {
      unavailable("Lien incomplet.");
      return;
    }

    if (!configured()) {
      unavailable("Supabase n’est pas encore configuré.");
      return;
    }

    try {
      if (adminPreview) {
        const role = await window.requireRole("admin", "connexion.html");
        if (!role || role.role !== "admin") return;
      }

      let query = client().from("artist_profiles").select("*").eq("id", id);
      if (!adminPreview) query = query.eq("status", "approved");
      const { data: profile, error: profileError } = await query.maybeSingle();
      if (profileError) throw profileError;
      if (!profile || (!adminPreview && profile.status !== "approved")) {
        unavailable();
        return;
      }

      const { data: presskit, error: presskitError } = await client()
        .from("artist_presskits")
        .select("*")
        .eq("artist_profile_id", id)
        .maybeSingle();
      if (presskitError) throw presskitError;
      if (!presskit && adminPreview) {
        render(profile, generateFallbackPresskit(profile));
        return;
      }
      if (!presskit) {
        unavailable("Ce profil n’a pas encore de presskit public.");
        return;
      }

      render(profile, presskit);
    } catch (error) {
      unavailable(error.message || "Presskit non disponible.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
