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

  function socialLabel(label, url) {
    const raw = String(url || "").trim();
    if (!raw) return "";
    const handleMatch = raw.match(/(?:instagram\.com|soundcloud\.com|mixcloud\.com|youtube\.com|youtu\.be)\/@?([^/?#]+)/i);
    if (handleMatch && handleMatch[1]) return label + " · @" + handleMatch[1].replace(/^@/, "");
    try {
      return label + " · " + new URL(raw).hostname.replace(/^www\./, "");
    } catch (error) {
      return label + " · " + raw.replace(/^https?:\/\//, "");
    }
  }

  function formatEuro(value) {
    if (!value) return "Tarif à confirmer";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
  }

  function materialLabel(profile) {
    if (profile.material === true) return "Matériel disponible selon configuration";
    if (profile.material === false) return "Matériel à confirmer selon le lieu";
    return "À confirmer";
  }

  function templateSection(title, body, extraClass) {
    if (!body) return "";
    return '<section class="pk-block ' + esc(extraClass || "") + '"><h2>' + esc(title) + '</h2>' + body + '</section>';
  }

  function infoRows(rows) {
    return '<dl class="pk-info-list">' + rows.filter(function (row) { return row[1]; }).map(function (row) {
      return '<div><dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd></div>';
    }).join("") + '</dl>';
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
    const linkMarkup = links.length ? '<div class="pk-social-links">' + links.map(function (entry) {
      return '<a href="' + esc(entry[1]) + '" target="_blank" rel="noopener"><span>' + esc(entry[0].charAt(0)) + '</span>' + esc(socialLabel(entry[0], entry[1])) + '</a>';
    }).join("") + '</div>' : "";
    const styleTags = tags(profile.styles || []);
    const eventTags = tags(profile.event_types || []);
    const zoneTags = tags(profile.zones || []);
    const location = profile.city || "Ville à confirmer";
    const mainStyles = list(profile.styles, "Styles à confirmer");
    const shortIntro = presskit.short_intro || "";
    const longBio = compactText(presskit.long_bio || profile.bio || "", 760);
    const bookingText = compactText(presskit.booking_text || "Contact réservation via DJ-hub.", 420);
    const technicalInfo = compactText(presskit.technical_info || "", 420);
    if (!root) return;
    root.innerHTML = [
      '<article class="presskit-page presskit-pro-sheet reveal" id="presskit-sheet">',
      '<div class="pk-glow pk-glow-one"></div><div class="pk-glow pk-glow-two"></div><div class="pk-grid-bg"></div>',
      '<header class="pk-hero">',
      '<div class="pk-brand-chip"><strong>DJ-hub</strong><span>' + (profile.status === "approved" ? "Profil validé" : "Prévisualisation admin") + '</span></div>',
      '<div class="pk-title">',
      '<p class="pk-kicker">Official press kit</p>',
      '<h1>' + esc(profile.artist_name) + '</h1>',
      '<p class="pk-subtitle">DJ · ' + esc(location) + ' · Réservation via DJ-hub</p>',
      styleTags ? '<div class="presskit-tags pk-tags">' + styleTags + '</div>' : '',
      '</div>',
      '<div class="pk-photo-orbit">',
      '<div class="pk-orbit-ring"></div><div class="pk-orbit-ring pk-orbit-ring-two"></div>',
      '<div class="pk-photo-frame">',
      image ? '<img src="' + esc(image) + '" alt="Photo artiste ' + esc(profile.artist_name) + '">' : '<div class="presskit-photo-placeholder pk-photo-placeholder"><span>' + esc(initials(profile.artist_name)) + '</span><i></i></div>',
      '</div>',
      profile.photo_credit ? '<p class="pk-photo-credit">Crédit photo : ' + esc(profile.photo_credit) + '</p>' : '',
      '</div>',
      '</header>',
      '<main class="pk-body">',
      '<div class="pk-column pk-column-left">',
      templateSection("Personal info", infoRows([
        ["Ville", location],
        ["Styles", mainStyles],
        ["Tarif indicatif", formatEuro(profile.price_from)],
        ["Matériel", materialLabel(profile)]
      ]), "pk-block-info"),
      templateSection("Biography", '<p class="pk-lead">' + esc(shortIntro) + '</p>' + (longBio ? '<p>' + esc(longBio) + '</p>' : "")),
      templateSection("Booking text", '<p>' + esc(bookingText) + '</p>'),
      '</div>',
      '<aside class="pk-column pk-column-right">',
      '<div class="pk-stat-row"><div><strong>' + esc(formatEuro(profile.price_from)) + '</strong><span>à partir de</span></div><div><strong>' + esc(location) + '</strong><span>ville</span></div></div>',
      templateSection("Events", eventTags ? '<div class="presskit-tags pk-mini-tags">' + eventTags + '</div>' : '<p>Soirées privées, bars, rooftops.</p>'),
      zoneTags ? templateSection("Zones", '<div class="presskit-tags pk-mini-tags">' + zoneTags + '</div>') : "",
      templateSection("Technical rider", '<p>' + esc(technicalInfo) + '</p>'),
      linkMarkup ? templateSection("Follow / links", linkMarkup, "pk-social-block") : "",
      '</aside>',
      '</main>',
      '<footer class="pk-footer"><div><strong>FOLLOW ME</strong>' + (linkMarkup || '<span>Réseaux à confirmer</span>') + '</div><div><strong>BOOKING CONTACT</strong><span>Contact réservation via DJ-hub</span><span>Informations à confirmer avant réservation.</span></div><span class="pk-footer-url">DJ-hub.fr</span></footer>',
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
