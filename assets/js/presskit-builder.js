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
    const box = qs("#presskit-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function list(values, fallback) {
    return Array.isArray(values) && values.length ? values.filter(Boolean).join(", ") : fallback || "";
  }

  function tags(values) {
    return (values || []).filter(Boolean).map(function (value) {
      return '<span>' + esc(value) + '</span>';
    }).join("");
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

  function slug(value) {
    return String(value || "dj")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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

  async function ownProfile(userId) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function profileById(id) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function existingPresskit(profileId) {
    const { data, error } = await client()
      .from("artist_presskits")
      .select("*")
      .eq("artist_profile_id", profileId)
      .maybeSingle();

    if (error) {
      console.warn("[DJ-hub] Presskit non chargé. Génération locale utilisée.", error.message);
      return null;
    }
    return data || null;
  }

  function generateShortBio(profile) {
    const name = profile.artist_name || "Ce DJ";
    const styles = list(profile.styles, "plusieurs univers musicaux");
    const events = list(profile.event_types, "soirées privées, petits bars et événements locaux");
    return name + " est un DJ basé à " + (profile.city || "votre ville") + ", spécialisé en " + styles + ". Son univers est pensé pour les " + events + ", avec une sélection adaptée à l’ambiance du lieu, au public et au moment de la soirée.";
  }

  function generateLongBio(profile) {
    return [
      generateShortBio(profile),
      profile.bio || "",
      profile.experience ? "Expérience : " + profile.experience : "",
      profile.influences ? "Influences : " + profile.influences : "",
      profile.preferred_vibe ? "Ambiance privilégiée : " + profile.preferred_vibe : ""
    ].filter(Boolean).join("\n\n");
  }

  function generateBookingText(profile) {
    const events = list(profile.event_types, "soirées privées, petits bars et événements locaux");
    const styles = list(profile.styles, "formats musicaux adaptés");
    return "Idéal pour " + events + ", " + (profile.artist_name || "ce DJ") + " propose des sets " + styles + " adaptés aux soirées privées, petits bars et événements locaux. Les conditions finales de prestation sont confirmées via DJ-hub avant validation.";
  }

  function generateTechnicalText(profile) {
    const zones = list(profile.zones, profile.city || "zone à confirmer");
    const formats = list(profile.set_formats, "formats à confirmer");
    return "Zone de déplacement : " + zones + ". Matériel : " + materialLabel(profile) + ". Tarif indicatif : " + formatEuro(profile.price_from) + ", selon durée, lieu, matériel et disponibilité. Formats possibles : " + formats + ".";
  }

  function generate(profile) {
    const shortIntro = generateShortBio(profile);
    const longBio = generateLongBio(profile);
    const bookingText = generateBookingText(profile);
    const technicalInfo = generateTechnicalText(profile);
    const generatedText = [shortIntro, "", bookingText, "", technicalInfo].join("\n");

    return {
      title: "Presskit " + (profile.artist_name || "DJ-hub"),
      short_intro: shortIntro,
      long_bio: longBio,
      music_styles: profile.styles || [],
      ideal_events: profile.event_types || [],
      technical_info: technicalInfo,
      booking_text: bookingText,
      generated_text: generatedText
    };
  }

  function section(title, body) {
    if (!body) return "";
    return '<section class="presskit-section"><h2>' + esc(title) + '</h2>' + body + '</section>';
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

  function compactText(text, max) {
    text = String(text || "").replace(/\s+/g, " ").trim();
    if (!text || text.length <= max) return text;
    return text.slice(0, max - 1).trim() + "…";
  }

  function templateForProfile(profile, selected) {
    if (selected && selected !== "auto") return selected;
    const styles = list(profile.styles, "").toLowerCase();
    if (styles.indexOf("techno") !== -1 || styles.indexOf("electro") !== -1 || styles.indexOf("hard") !== -1) return "techno";
    if (styles.indexOf("house") !== -1 || styles.indexOf("disco") !== -1 || styles.indexOf("afro") !== -1) return "house";
    return "general";
  }

  function renderPresskit(profile, texts, selectedTemplate) {
    texts = texts || generate(profile);
    const visualTemplate = templateForProfile(profile, selectedTemplate);
    const image = profile.public_image_url || "";
    const styleTags = tags(profile.styles || []);
    const eventTags = tags(profile.event_types || []);
    const zoneTags = tags(profile.zones || []);
    const links = linkRows(profile);
    const photoCredit = profile.photo_credit ? '<p class="pk-photo-credit">Crédit photo : ' + esc(profile.photo_credit) + '</p>' : "";
    const influences = profile.influences ? '<p>' + esc(profile.influences) + '</p>' : "";
    const formats = Array.isArray(profile.set_formats) && profile.set_formats.length ? '<div class="presskit-tags">' + tags(profile.set_formats) + '</div>' : "";
    const linkMarkup = links.length ? '<div class="pk2-links">' + links.map(function (entry) {
      return '<a href="' + esc(entry[1]) + '" target="_blank" rel="noopener"><span>' + esc(entry[0].charAt(0)) + '</span>' + esc(socialLabel(entry[0], entry[1])) + '</a>';
    }).join("") + '</div>' : "";
    const shortIntro = compactText(texts.short_intro || generateShortBio(profile), 300);
    const longBio = compactText(texts.long_bio || profile.bio || "", 460);
    const bookingText = compactText(texts.booking_text || generateBookingText(profile), 260);
    const technicalInfo = compactText(texts.technical_info || generateTechnicalText(profile), 250);
    const location = profile.city || "Ville à confirmer";
    const mainStyles = list(profile.styles, "Styles à confirmer");
    const mainEvents = list(profile.event_types, "soirées privées, bars, rooftops");

    return [
      '<article class="presskit-page presskit-a4-sheet pk2-template-' + esc(visualTemplate) + '" id="presskit-sheet">',
      '<div class="pk2-noise"></div><div class="pk2-accent pk2-accent-top"></div><div class="pk2-accent pk2-accent-bottom"></div>',
      '<header class="pk2-header">',
      '<div class="pk2-brand"><strong>DJ-hub</strong><span>Official press kit</span></div>',
      '<p class="pk2-kicker">Profil artiste · Presskit 1/1</p>',
      '<h1>' + esc(profile.artist_name || "DJ") + '</h1>',
      '<p class="pk2-subtitle">DJ basé à ' + esc(location) + ' · Contact réservation via DJ-hub</p>',
      styleTags ? '<div class="presskit-tags pk2-tags">' + styleTags + '</div>' : '',
      '</header>',
      '<main class="pk2-body">',
      '<aside class="pk2-left">',
      '<figure class="pk2-photo">',
      image ? '<img src="' + esc(image) + '" alt="Photo artiste ' + esc(profile.artist_name) + '" crossorigin="anonymous">' : '<div class="presskit-photo-placeholder pk2-photo-placeholder"><span>' + esc(initials(profile.artist_name)) + '</span><i></i></div>',
      photoCredit,
      '</figure>',
      '<section class="pk2-card pk2-social-card"><h2>Follow me</h2>' + (linkMarkup || '<p>Réseaux à confirmer.</p>') + '</section>',
      '</aside>',
      '<div class="pk2-right">',
      '<section class="pk2-card pk2-info-card"><h2>Personal info</h2>' + infoRows([
        ["Ville", location],
        ["Styles", mainStyles],
        ["Tarif indicatif", formatEuro(profile.price_from)],
        ["Matériel", materialLabel(profile)]
      ]) + '</section>',
      '<section class="pk2-card pk2-bio-card"><h2>Biography</h2><p class="pk2-lead">' + esc(shortIntro) + '</p>' + (longBio ? '<p>' + esc(longBio) + '</p>' : '') + '</section>',
      '<div class="pk2-mini-grid">',
      '<section class="pk2-card pk2-events-card"><h2>Events</h2>' + (eventTags ? '<div class="presskit-tags pk2-mini-tags">' + eventTags + '</div>' : '<p>' + esc(mainEvents) + '</p>') + '</section>',
      '<section class="pk2-card pk2-zones-card"><h2>Zones</h2>' + (zoneTags ? '<div class="presskit-tags pk2-mini-tags">' + zoneTags + '</div>' : '<p>' + esc(location) + '</p>') + '</section>',
      '</div>',
      '<section class="pk2-card pk2-tech-card"><h2>Technical rider</h2><p>' + esc(technicalInfo) + '</p></section>',
      (influences || formats) ? '<section class="pk2-card pk2-sound-card"><h2>Sound universe</h2>' + influences + formats + '</section>' : '',
      '<section class="pk2-card pk2-booking-card"><h2>Booking text</h2><p>' + esc(bookingText) + '</p></section>',
      '</div>',
      '</main>',
      '<footer class="pk2-footer">',
      '<strong>DJ-hub.fr</strong>',
      '<span>Contact réservation via DJ-hub · Tarif final, disponibilité et conditions à confirmer avant validation.</span>',
      '</footer>',
      '</article>'
    ].join("");
  }

  function field(name) {
    return qs('[name="' + name + '"]');
  }

  function selectedTemplate(profile) {
    const input = field("presskit_template");
    return templateForProfile(profile, input ? input.value : "auto");
  }

  function fillForm(data) {
    ["title", "short_intro", "long_bio", "technical_info", "booking_text", "generated_text"].forEach(function (key) {
      const node = field(key);
      if (node) node.value = data[key] || "";
    });
  }

  function readForm(profile, userId) {
    const text = {
      short_intro: field("short_intro").value.trim(),
      long_bio: field("long_bio").value.trim(),
      technical_info: field("technical_info").value.trim(),
      booking_text: field("booking_text").value.trim()
    };

    return {
      artist_profile_id: profile.id,
      user_id: userId,
      title: field("title").value.trim(),
      short_intro: text.short_intro,
      long_bio: text.long_bio,
      music_styles: profile.styles || [],
      ideal_events: profile.event_types || [],
      technical_info: text.technical_info,
      booking_text: text.booking_text,
      generated_text: field("generated_text").value.trim(),
      generated_html: renderPresskit(profile, text, selectedTemplate(profile))
    };
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

  function printPresskit() {
    window.print();
  }

  async function downloadPresskitPdf(profile) {
    const sheet = qs("#presskit-sheet");
    if (!sheet || !window.html2pdf) {
      show("Téléchargement automatique indisponible. Utilisez la fenêtre d’impression pour enregistrer en PDF.", "warning");
      printPresskit();
      return;
    }

    try {
      const filename = "presskit-dj-hub-" + slug(profile.artist_name || profile.slug || "dj") + ".pdf";
      await window.html2pdf()
        .set({
          margin: 0,
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(sheet)
        .save();
    } catch (error) {
      show("Téléchargement automatique indisponible. Utilisez la fenêtre d’impression pour enregistrer en PDF.", "warning");
      printPresskit();
    }
  }

  function downloadHtml(profile, html) {
    const doc = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(profile.artist_name) + ' - Presskit DJ-hub</title><link rel="stylesheet" href="assets/css/style.css"></head><body>' + html + '</body></html>';
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "presskit-dj-hub-" + slug(profile.artist_name || profile.slug || "dj") + ".html";
    link.click();
    URL.revokeObjectURL(url);
  }

  function emptyProfileState(root) {
    root.innerHTML = [
      '<div class="empty-state empty-state-premium">',
      '<h2>Complétez d’abord votre profil artiste avant de générer votre presskit.</h2>',
      '<p>Le presskit reprend votre photo, votre bio, vos styles, vos zones, vos liens audio et vos informations techniques.</p>',
      '<a class="btn btn-primary" href="questionnaire-artiste.html">Compléter mon profil</a>',
      '</div>'
    ].join("");
  }

  function refreshPreview(profile) {
    const preview = qs("#presskit-preview");
    if (!preview) return;
    preview.innerHTML = renderPresskit(profile, {
      short_intro: field("short_intro").value,
      long_bio: field("long_bio").value,
      technical_info: field("technical_info").value,
      booking_text: field("booking_text").value
    }, selectedTemplate(profile));
  }

  async function savePresskit(payload) {
    const { error } = await client()
      .from("artist_presskits")
      .upsert(payload, { onConflict: "artist_profile_id" });

    if (error) throw error;
  }

  async function init() {
    const root = qs("#presskit-builder");
    if (!root) return;

    if (!configured()) {
      show("Supabase n’est pas encore configuré. Le presskit sera générable après connexion du projet.", "warning");
      return;
    }

    const roleProfile = await window.requireRole("artist", "connexion.html");
    if (!roleProfile) return;
    const user = await window.getCurrentUser();
    const params = new URLSearchParams(window.location.search);

    let profile;
    let current;
    let presskitUserId = user ? user.id : null;
    try {
      if (roleProfile.role === "admin" && params.get("artist")) {
        profile = await profileById(params.get("artist"));
        presskitUserId = profile ? profile.user_id : presskitUserId;
      } else {
        profile = await ownProfile(user.id);
      }

      if (!profile) {
        emptyProfileState(root);
        return;
      }

      current = await existingPresskit(profile.id);
      fillForm(current || generate(profile));
      refreshPreview(profile);

      if (params.get("download") === "pdf") {
        window.setTimeout(function () { downloadPresskitPdf(profile); }, 500);
      }
    } catch (error) {
      show(error.message || "Impossible de charger le presskit.", "error");
      return;
    }

    root.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-presskit-action]");
      if (!button) return;
      const action = button.dataset.presskitAction;
      const payload = readForm(profile, presskitUserId || user.id);

      if (action === "generate") {
        fillForm(generate(profile));
        refreshPreview(profile);
        show("Textes générés à partir du questionnaire.", "success");
      }

      if (action === "preview") {
        refreshPreview(profile);
      }

      if (action === "copy-summary") {
        await copy(payload.generated_text);
        show("Résumé copié.", "success");
      }

      if (action === "copy-short") {
        await copy(payload.short_intro);
        show("Bio courte copiée.", "success");
      }

      if (action === "copy-booking") {
        await copy(payload.booking_text);
        show("Texte booking copié.", "success");
      }

      if (action === "print") {
        refreshPreview(profile);
        printPresskit();
      }

      if (action === "download-pdf") {
        refreshPreview(profile);
        await downloadPresskitPdf(profile);
      }

      if (action === "download-html") {
        refreshPreview(profile);
        downloadHtml(profile, payload.generated_html);
      }

      if (action === "save") {
        try {
          await savePresskit(payload);
          show("Presskit sauvegardé.", "success");
        } catch (error) {
          show("Presskit généré côté navigateur. La sauvegarde en base sera disponible après activation de la table artist_presskits.", "warning");
        }
      }
    });

    const templateInput = field("presskit_template");
    if (templateInput) {
      templateInput.addEventListener("change", function () {
        refreshPreview(profile);
        show("Style visuel mis à jour.", "success");
      });
    }
  }

  window.djHubPresskit = {
    generateShortBio: generateShortBio,
    generateLongBio: generateLongBio,
    generateBookingText: generateBookingText,
    generateTechnicalText: generateTechnicalText,
    renderPresskit: renderPresskit,
    templateForProfile: templateForProfile,
    printPresskit: printPresskit,
    downloadPresskitPdf: downloadPresskitPdf
  };

  document.addEventListener("DOMContentLoaded", init);
})();
