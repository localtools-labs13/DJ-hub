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

  function compactText(text, max) {
    text = String(text || "").replace(/\s+/g, " ").trim();
    if (!text || text.length <= max) return text;
    return text.slice(0, max - 1).trim() + "…";
  }

  function initials(name) {
    return String(name || "DJ").split(" ").filter(Boolean).slice(0, 2).map(function (part) {
      return part.charAt(0);
    }).join("").toUpperCase();
  }

  function linkRows(profile) {
    return [
      ["Instagram", profile.instagram],
      ["SoundCloud", profile.soundcloud],
      ["Mixcloud", profile.mixcloud],
      ["YouTube", profile.youtube],
      ["Site web", profile.website]
    ].filter(function (entry) { return entry[1]; });
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
    const links = linkRows(profile);
    const linkMarkup = links.length ? '<div class="presskit-links">' + links.map(function (entry) {
      return '<a href="' + esc(entry[1]) + '" target="_blank" rel="noopener">' + esc(entry[0]) + '</a>';
    }).join("") + '</div>' : "";
    if (!root) return;
    root.innerHTML = [
      '<article class="presskit-page presskit-page-one reveal" id="presskit-sheet">',
      '<header class="presskit-hero presskit-one-hero">',
      '<div class="presskit-photo presskit-one-photo">',
      image ? '<img src="' + esc(image) + '" alt="Photo artiste ' + esc(profile.artist_name) + '">' : '<div class="presskit-photo-placeholder"><span>' + esc(initials(profile.artist_name)) + '</span><i></i></div>',
      profile.photo_credit ? '<p class="presskit-photo-credit">Crédit photo : ' + esc(profile.photo_credit) + '</p>' : '',
      '</div>',
      '<div class="presskit-title-block">',
      '<p class="presskit-kicker">' + (profile.status === "approved" ? "Profil validé par DJ-hub" : "Prévisualisation admin") + ' · 1/1</p>',
      '<h1>' + esc(profile.artist_name) + '</h1>',
      '<p class="presskit-subtitle">' + esc(profile.city) + ' · Contact réservation via DJ-hub</p>',
      '<div class="presskit-tags">' + tags(profile.styles) + '</div>',
      '</div>',
      '</header>',
      '<div class="presskit-one-content">',
      '<div class="presskit-one-main">',
      '<section class="presskit-section"><h2>Présentation</h2><p class="presskit-lead">' + esc(presskit.short_intro || "") + '</p><p>' + esc(compactText(presskit.long_bio || "", 620)) + '</p></section>',
      '<section class="presskit-section"><h2>Booking</h2><p>' + esc(compactText(presskit.booking_text || "", 360)) + '</p></section>',
      '<section class="presskit-section"><h2>Technique</h2><p>' + esc(compactText(presskit.technical_info || "", 320)) + '</p></section>',
      '</div>',
      '<aside class="presskit-one-aside">',
      '<div class="presskit-info-grid presskit-one-info"><div><strong>' + esc(profile.price_from ? profile.price_from + " €" : "Tarif à confirmer") + '</strong><span>tarif indicatif</span></div><div><strong>' + esc(profile.material ? "Matériel possible" : "À confirmer") + '</strong><span>matériel</span></div><div><strong>' + esc(list(profile.zones, profile.city || "À confirmer")) + '</strong><span>zone</span></div></div>',
      '<section class="presskit-section"><h2>Événements</h2><div class="presskit-tags">' + tags(profile.event_types || []) + '</div></section>',
      linkMarkup ? '<section class="presskit-section"><h2>Réseaux & liens</h2>' + linkMarkup + '</section>' : '',
      '</aside>',
      '</div>',
      '<footer class="presskit-footer presskit-one-footer"><strong>Presskit généré avec DJ-hub</strong><span>Contact réservation via DJ-hub.</span><span>Informations à confirmer avant réservation.</span><span><a href="trouver-un-dj.html?dj=' + encodeURIComponent(profile.id) + '">Demander ce DJ</a></span></footer>',
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
