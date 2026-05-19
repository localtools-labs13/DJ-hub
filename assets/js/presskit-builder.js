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

  function join(values, fallback) {
    return Array.isArray(values) && values.length ? values.join(", ") : fallback || "à confirmer";
  }

  function formatEuro(value) {
    if (!value) return "Tarif à confirmer";
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
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

  async function existingPresskit(profileId) {
    const { data, error } = await client()
      .from("artist_presskits")
      .select("*")
      .eq("artist_profile_id", profileId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  function generate(profile) {
    const name = profile.artist_name;
    const styles = join(profile.styles, "plusieurs univers musicaux");
    const events = join(profile.event_types, "soirées privées et petits lieux");
    const zones = join(profile.zones, profile.city);
    const formats = join(profile.set_formats, "formats à confirmer");
    const material = profile.material ? "matériel possible selon configuration" : "matériel à confirmer selon le lieu";

    const shortIntro = name + " est un DJ basé à " + profile.city + ", spécialisé en " + styles + ". Son univers est adapté aux " + events + ", avec une sélection pensée pour créer une ambiance cohérente et progressive.";
    const longBio = [
      shortIntro,
      profile.bio || "",
      profile.experience ? "Expérience : " + profile.experience : "",
      profile.preferred_vibe ? "Ambiance privilégiée : " + profile.preferred_vibe : ""
    ].filter(Boolean).join("\n\n");
    const bookingText = "Idéal pour " + events + ", " + name + " propose un set " + styles + " adapté à votre lieu, votre public et votre horaire. Tarif final et conditions à confirmer via DJ-hub.";
    const technicalInfo = "Matériel : " + material + ". Zone de déplacement : " + zones + ". Formats possibles : " + formats + ".";
    const generatedText = [shortIntro, "", bookingText, "", technicalInfo].join("\n");

    return {
      title: "Presskit " + name,
      short_intro: shortIntro,
      long_bio: longBio,
      music_styles: profile.styles || [],
      ideal_events: profile.event_types || [],
      technical_info: technicalInfo,
      booking_text: bookingText,
      generated_text: generatedText
    };
  }

  function field(name) {
    return qs('[name="' + name + '"]');
  }

  function fillForm(data) {
    ["title", "short_intro", "long_bio", "technical_info", "booking_text", "generated_text"].forEach(function (key) {
      const node = field(key);
      if (node) node.value = data[key] || "";
    });
  }

  function readForm(profile, userId) {
    return {
      artist_profile_id: profile.id,
      user_id: userId,
      title: field("title").value.trim(),
      short_intro: field("short_intro").value.trim(),
      long_bio: field("long_bio").value.trim(),
      music_styles: profile.styles || [],
      ideal_events: profile.event_types || [],
      technical_info: field("technical_info").value.trim(),
      booking_text: field("booking_text").value.trim(),
      generated_text: field("generated_text").value.trim(),
      generated_html: renderPresskitHtml(profile, {
        short_intro: field("short_intro").value.trim(),
        long_bio: field("long_bio").value.trim(),
        technical_info: field("technical_info").value.trim(),
        booking_text: field("booking_text").value.trim()
      })
    };
  }

  function links(profile) {
    return [
      ["Instagram", profile.instagram],
      ["SoundCloud", profile.soundcloud],
      ["Mixcloud", profile.mixcloud],
      ["YouTube", profile.youtube],
      ["Site web", profile.website]
    ].filter(function (entry) { return entry[1]; });
  }

  function renderPresskitHtml(profile, texts) {
    const image = profile.public_image_url || "";
    const credit = profile.photo_credit ? '<small>Crédit photo : ' + esc(profile.photo_credit) + '</small>' : '';
    return [
      '<article class="presskit-card">',
      image ? '<img class="presskit-cover" src="' + esc(image) + '" alt="' + esc(profile.artist_name) + '">' : '<div class="artist-placeholder artist-placeholder-large"><span>DJ</span><i></i></div>',
      '<div class="presskit-body">',
      credit,
      '<p class="eyebrow">' + (profile.status === "approved" ? "Profil validé par DJ-hub" : "Prévisualisation artiste") + '</p>',
      '<h1>' + esc(profile.artist_name) + '</h1>',
      '<p class="detail-subtitle">' + esc(profile.city) + ' · ' + esc(join(profile.styles)) + '</p>',
      '<div class="style-line detail-style-line">' + (profile.styles || []).map(function (style) { return '<span>' + esc(style) + '</span>'; }).join("") + '</div>',
      '<p>' + esc(texts.short_intro || "") + '</p>',
      '<section><h2>Bio</h2><p>' + esc(texts.long_bio || "").replace(/\n/g, "<br>") + '</p></section>',
      '<section><h2>Booking</h2><p>' + esc(texts.booking_text || "") + '</p></section>',
      '<section><h2>Technique</h2><p>' + esc(texts.technical_info || "") + '</p></section>',
      '<section><h2>Infos rapides</h2><p>Zone : ' + esc(join(profile.zones, profile.city)) + '<br>Événements : ' + esc(join(profile.event_types)) + '<br>Tarif indicatif : ' + esc(formatEuro(profile.price_from)) + '</p></section>',
      links(profile).length ? '<section><h2>Liens</h2><div class="social-row">' + links(profile).map(function (entry) { return '<a class="social-link" href="' + esc(entry[1]) + '" target="_blank" rel="noopener">' + esc(entry[0]) + '</a>'; }).join("") + '</div></section>' : '',
      '<section><h2>Contact</h2><p>Contact via DJ-hub. Tarif final et conditions à confirmer avant validation.</p></section>',
      '</div>',
      '</article>'
    ].join("");
  }

  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    return Promise.resolve();
  }

  function downloadHtml(profile, html) {
    const doc = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(profile.artist_name) + ' - Presskit DJ-hub</title><link rel="stylesheet" href="assets/css/style.css"></head><body>' + html + '</body></html>';
    const blob = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "presskit-" + (profile.slug || profile.artist_name || "dj").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html";
    link.click();
    URL.revokeObjectURL(url);
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

    let profile;
    let current;
    try {
      profile = await ownProfile(user.id);
      if (!profile) {
        root.innerHTML = '<div class="empty-state empty-state-premium"><h2>Profil artiste requis</h2><p>Complétez d’abord votre questionnaire artiste.</p><a class="btn btn-primary" href="questionnaire-artiste.html">Compléter mon profil</a></div>';
        return;
      }
      current = await existingPresskit(profile.id);
      fillForm(current || generate(profile));
      qs("#presskit-preview").innerHTML = renderPresskitHtml(profile, {
        short_intro: field("short_intro").value,
        long_bio: field("long_bio").value,
        technical_info: field("technical_info").value,
        booking_text: field("booking_text").value
      });
    } catch (error) {
      show(error.message || "Impossible de charger le presskit.", "error");
      return;
    }

    root.addEventListener("click", async function (event) {
      const button = event.target.closest("[data-presskit-action]");
      if (!button) return;
      const action = button.dataset.presskitAction;
      const payload = readForm(profile, user.id);

      if (action === "generate") {
        fillForm(generate(profile));
        qs("#presskit-preview").innerHTML = renderPresskitHtml(profile, readForm(profile, user.id));
        show("Textes générés à partir du questionnaire.", "success");
      }

      if (action === "preview") {
        qs("#presskit-preview").innerHTML = payload.generated_html;
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
        window.print();
      }

      if (action === "download-html") {
        downloadHtml(profile, payload.generated_html);
      }

      if (action === "save") {
        const { error } = await client()
          .from("artist_presskits")
          .upsert(payload, { onConflict: "artist_profile_id" });
        if (error) {
          show(error.message, "error");
          return;
        }
        show("Presskit sauvegardé.", "success");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
