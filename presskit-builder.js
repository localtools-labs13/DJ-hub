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

  function socialDisplay(label, url) {
    return socialLabel(label, url)
      .replace(/^Instagram · /, "")
      .replace(/^SoundCloud · /, "")
      .replace(/^Mixcloud · /, "")
      .replace(/^YouTube · /, "")
      .replace(/^Site web · /, "");
  }

  function socialIcon(label) {
    const key = String(label || "").toLowerCase();
    if (key === "instagram") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4"></rect><circle cx="12" cy="12" r="3.2"></circle><circle cx="16.8" cy="7.2" r="1"></circle></svg>';
    }
    if (key === "soundcloud") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 17.2h11.2a3.8 3.8 0 0 0 .2-7.6 5.1 5.1 0 0 0-9.8 1.7A3 3 0 0 0 6.6 17.2Z"></path><path d="M3.8 13.2v3.1M5.6 11.7v4.8M7.4 10.7v5.8M9.2 9.5v7"></path></svg>';
    }
    if (key === "mixcloud") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.6 16.8h9.1a3.3 3.3 0 0 0 .2-6.6 4.4 4.4 0 0 0-8.4 1.2 2.7 2.7 0 0 0-.9 5.4Z"></path><path d="M3.8 13.9c1.3-2.6 3.1-3.9 5.5-3.9 1.7 0 3 .5 4 1.6 1 .9 1.9 1.4 2.7 1.4 1.2 0 2.2-.7 3-2"></path></svg>';
    }
    if (key === "youtube") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4.5" y="7" width="15" height="10" rx="3"></rect><path d="m10.7 10 4.2 2-4.2 2Z"></path></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8"></circle><path d="M4.5 12h15M12 4.2c2.2 2.4 3.3 5 3.3 7.8S14.2 17.4 12 19.8M12 4.2C9.8 6.6 8.7 9.2 8.7 12s1.1 5.4 3.3 7.8"></path></svg>';
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
      return '<a href="' + esc(entry[1]) + '" target="_blank" rel="noopener" aria-label="' + esc(entry[0]) + '"><span class="pk2-social-icon">' + socialIcon(entry[0]) + '</span><em>' + esc(socialDisplay(entry[0], entry[1])) + '</em></a>';
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

  function pdfCtor() {
    return window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : window.jsPDF;
  }

  function setPdfFill(doc, hex) {
    const c = hex.replace("#", "");
    doc.setFillColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
  }

  function setPdfText(doc, hex) {
    const c = hex.replace("#", "");
    doc.setTextColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
  }

  function setPdfStroke(doc, hex) {
    const c = hex.replace("#", "");
    doc.setDrawColor(parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16));
  }

  function drawPdfBackground(doc) {
    setPdfFill(doc, "#070a13");
    doc.rect(0, 0, 210, 297, "F");
    setPdfStroke(doc, "#12394b");
    doc.setLineWidth(0.28);
    for (let i = -260; i < 230; i += 10) {
      doc.line(i, 297, i + 297, 0);
    }
    setPdfFill(doc, "#0e1728");
    doc.roundedRect(8, 8, 194, 281, 3, 3, "F");
    setPdfStroke(doc, "#1a6f8d");
    doc.setLineWidth(0.35);
    doc.roundedRect(8, 8, 194, 281, 3, 3, "S");
  }

  function drawPdfPill(doc, text, x, y, maxWidth) {
    const label = compactText(text, 22).toUpperCase();
    const width = Math.min(maxWidth || 42, Math.max(18, doc.getTextWidth(label) + 7));
    setPdfFill(doc, "#14253a");
    setPdfStroke(doc, "#39bde7");
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, width, 6.5, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.1);
    setPdfText(doc, "#eef8ff");
    doc.text(label, x + 3.4, y + 4.4);
    return width;
  }

  function drawPdfTags(doc, values, x, y, maxWidth) {
    let cx = x;
    let cy = y;
    (values || []).filter(Boolean).slice(0, 6).forEach(function (value) {
      const width = Math.min(44, Math.max(18, doc.getTextWidth(String(value).toUpperCase()) + 8));
      if (cx + width > x + maxWidth) {
        cx = x;
        cy += 8;
      }
      drawPdfPill(doc, value, cx, cy, width);
      cx += width + 3;
    });
    return cy + 8;
  }

  function pdfLines(doc, text, width, maxLines) {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    return doc.splitTextToSize(cleaned, width).slice(0, maxLines);
  }

  function drawPdfTextBlock(doc, text, x, y, width, maxLines, size, color) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size || 6.2);
    setPdfText(doc, color || "#edf7ff");
    const lines = pdfLines(doc, text, width, maxLines || 8);
    doc.text(lines, x, y, { lineHeightFactor: 1.28 });
    return y + (lines.length * (size || 6.2) * 0.45);
  }

  function drawPdfCard(doc, title, body, x, y, width, height, maxLines) {
    setPdfFill(doc, "#111b2b");
    setPdfStroke(doc, "#1d5f77");
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, width, height, 3, 3, "FD");
    setPdfFill(doc, "#e946ff");
    doc.circle(x + 4.2, y + 5.1, 0.85, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setPdfText(doc, "#5fe4ff");
    doc.text(title.toUpperCase(), x + 7, y + 6.7);
    drawPdfTextBlock(doc, body, x + 4, y + 13, width - 8, maxLines, 5.6, "#edf7ff");
  }

  function drawPdfInfoCard(doc, profile, x, y, width, height) {
    setPdfFill(doc, "#111b2b");
    setPdfStroke(doc, "#1d5f77");
    doc.setLineWidth(0.25);
    doc.roundedRect(x, y, width, height, 3, 3, "FD");
    setPdfFill(doc, "#e946ff");
    doc.circle(x + 4.2, y + 5.1, 0.85, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setPdfText(doc, "#5fe4ff");
    doc.text("PERSONAL INFO", x + 7, y + 6.7);
    const rows = [
      ["Ville", profile.city || "À confirmer"],
      ["Styles", list(profile.styles, "À confirmer")],
      ["Tarif", formatEuro(profile.price_from)],
      ["Matériel", materialLabel(profile)]
    ];
    const colW = (width - 10) / 2;
    rows.forEach(function (row, index) {
      const rx = x + 4 + (index % 2) * (colW + 3);
      const ry = y + 15 + Math.floor(index / 2) * 13;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.6);
      setPdfText(doc, "#98a9ba");
      doc.text(row[0].toUpperCase(), rx, ry);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5.4);
      setPdfText(doc, "#f6fbff");
      doc.text(pdfLines(doc, row[1], colW, 2), rx, ry + 5, { lineHeightFactor: 1.2 });
    });
  }

  function blobToDataUrl(blob) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  function loadImage(dataUrl) {
    return new Promise(function (resolve, reject) {
      const image = new Image();
      image.onload = function () { resolve(image); };
      image.onerror = reject;
      image.src = dataUrl;
    });
  }

  async function coverImageDataUrl(url, width, height) {
    if (!url) return null;
    try {
      const response = await fetch(url, { mode: "cors", cache: "force-cache" });
      if (!response.ok) return null;
      const dataUrl = await blobToDataUrl(await response.blob());
      const image = await loadImage(dataUrl);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0a0f1c";
      ctx.fillRect(0, 0, width, height);
      const ratio = Math.max(width / image.width, height / image.height);
      const drawW = image.width * ratio;
      const drawH = image.height * ratio;
      ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
      return canvas.toDataURL("image/jpeg", 0.92);
    } catch (error) {
      return null;
    }
  }

  function drawPdfPhotoPlaceholder(doc, profile, x, y, width, height) {
    setPdfFill(doc, "#090f1d");
    doc.rect(x, y, width, height, "F");
    setPdfStroke(doc, "#1c6f8c");
    doc.rect(x, y, width, height, "S");
    setPdfStroke(doc, "#124458");
    doc.setLineWidth(0.25);
    for (let i = -height; i < width + height; i += 7) {
      doc.line(x + i, y + height, x + i + height, y);
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(34);
    setPdfText(doc, "#f6fbff");
    doc.text(initials(profile.artist_name), x + width / 2, y + height / 2 + 5, { align: "center" });
  }

  function drawPdfSocials(doc, profile, x, y, width) {
    const links = linkRows(profile).slice(0, 4);
    setPdfFill(doc, "#111b2b");
    setPdfStroke(doc, "#1d5f77");
    doc.roundedRect(x, y, width, 38, 3, 3, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    setPdfText(doc, "#5fe4ff");
    doc.text("FOLLOW ME", x + 4, y + 6.7);
    if (!links.length) {
      drawPdfTextBlock(doc, "Réseaux à confirmer.", x + 4, y + 16, width - 8, 2, 5.6);
      return;
    }
    links.forEach(function (entry, index) {
      const rowY = y + 15 + index * 5.2;
      const colors = { Instagram: "#dd2a7b", SoundCloud: "#ff6b00", Mixcloud: "#55f2bb", YouTube: "#ff3030" };
      setPdfFill(doc, colors[entry[0]] || "#59dcff");
      doc.circle(x + 5, rowY - 1.5, 1.8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.4);
      setPdfText(doc, "#071018");
      doc.text(entry[0].charAt(0), x + 5, rowY, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      setPdfText(doc, "#f4f9ff");
      doc.text(compactText(socialDisplay(entry[0], entry[1]), 28), x + 9, rowY);
    });
  }

  async function downloadPresskitPdfDirect(profile, payload) {
    const JsPDF = pdfCtor();
    if (!JsPDF) return false;
    const doc = new JsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const texts = payload || {
      short_intro: field("short_intro").value.trim(),
      long_bio: field("long_bio").value.trim(),
      technical_info: field("technical_info").value.trim(),
      booking_text: field("booking_text").value.trim()
    };
    const name = (profile.artist_name || "DJ").toUpperCase();
    drawPdfBackground(doc);

    setPdfFill(doc, "#64dcff");
    doc.roundedRect(14, 14, 14, 14, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.5);
    setPdfText(doc, "#071018");
    doc.text("DJ-hub", 21, 22.5, { align: "center" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    setPdfText(doc, "#cbd8e8");
    doc.text("OFFICIAL PRESS KIT", 32, 21.8);
    doc.setFontSize(7);
    setPdfText(doc, "#5fe4ff");
    doc.text("PROFIL ARTISTE · PRESSKIT 1/1", 14, 41);

    let titleSize = 28;
    doc.setFont("helvetica", "bold");
    while (doc.getTextWidth(name) > 182 && titleSize > 18) {
      titleSize -= 1.5;
      doc.setFontSize(titleSize);
    }
    doc.setFontSize(titleSize);
    setPdfText(doc, "#ffffff");
    doc.text(name, 14, 56);
    doc.setFontSize(7.2);
    setPdfText(doc, "#62dfff");
    doc.text("DJ basé à " + (profile.city || "ville à confirmer") + " · Contact réservation via DJ-hub", 14, 66);
    drawPdfTags(doc, profile.styles || [], 14, 72, 182);

    const photo = await coverImageDataUrl(profile.public_image_url, 900, 1500);
    const photoX = 14;
    const photoY = 90;
    const photoW = 72;
    const photoH = 138;
    if (photo) {
      doc.addImage(photo, "JPEG", photoX, photoY, photoW, photoH, undefined, "FAST");
      setPdfStroke(doc, "#1c6f8c");
      doc.rect(photoX, photoY, photoW, photoH, "S");
    } else {
      drawPdfPhotoPlaceholder(doc, profile, photoX, photoY, photoW, photoH);
    }

    drawPdfSocials(doc, profile, 14, 233, 72);
    const rightX = 92;
    drawPdfInfoCard(doc, profile, rightX, 90, 104, 37);
    drawPdfCard(doc, "Biography", texts.short_intro || generateShortBio(profile), rightX, 132, 104, 42, 7);
    drawPdfCard(doc, "Events", list(profile.event_types, "Soirées privées, bars, rooftops"), rightX, 179, 50, 26, 4);
    drawPdfCard(doc, "Zones", list(profile.zones, profile.city || "À confirmer"), 146, 179, 50, 26, 4);
    drawPdfCard(doc, "Technical rider", texts.technical_info || generateTechnicalText(profile), rightX, 210, 104, 31, 4);
    drawPdfCard(doc, "Booking text", texts.booking_text || generateBookingText(profile), rightX, 246, 104, 27, 4);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setPdfText(doc, "#5fe4ff");
    doc.text("DJ-HUB.FR", 14, 283);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.2);
    setPdfText(doc, "#dbe8f5");
    doc.text("Contact réservation via DJ-hub · Tarif final, disponibilité et conditions à confirmer avant validation.", 196, 283, { align: "right" });

    doc.save("presskit-dj-hub-" + slug(profile.artist_name || profile.slug || "dj") + ".pdf");
    return true;
  }

  function setDownloadButtonLoading(button, isLoading) {
    if (!button) return;
    if (isLoading) {
      button.dataset.originalText = button.textContent;
      button.textContent = "Préparation du PDF...";
      button.disabled = true;
      button.classList.add("is-loading");
      return;
    }
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
    button.classList.remove("is-loading");
  }

  function waitForImages(root) {
    const images = Array.from(root.querySelectorAll("img"));
    if (!images.length) return Promise.resolve();
    return Promise.all(images.map(function (image) {
      if (image.complete) return Promise.resolve();
      return new Promise(function (resolve) {
        image.addEventListener("load", resolve, { once: true });
        image.addEventListener("error", resolve, { once: true });
      });
    }));
  }

  function createPdfSource(sheet) {
    const wrap = document.createElement("div");
    wrap.className = "presskit-pdf-export";
    const clone = sheet.cloneNode(true);
    clone.id = "presskit-sheet-export";
    wrap.appendChild(clone);
    document.body.appendChild(wrap);
    return wrap;
  }

  async function downloadPresskitPdf(profile, button, payload) {
    const sheet = qs("#presskit-sheet");
    if (!sheet) {
      show("Utilisez “Imprimer / enregistrer en PDF” pour créer le fichier.", "warning");
      printPresskit();
      return;
    }

    let source = null;
    try {
      setDownloadButtonLoading(button, true);
      if (await downloadPresskitPdfDirect(profile, payload)) {
        show("Presskit PDF téléchargé. Vous pouvez l’envoyer directement à vos prospects.", "success");
        return;
      }
      if (!window.html2pdf) {
        show("Utilisez “Imprimer / enregistrer en PDF” pour créer le fichier.", "warning");
        printPresskit();
        return;
      }
      source = createPdfSource(sheet);
      await waitForImages(source);
      const filename = "presskit-dj-hub-" + slug(profile.artist_name || profile.slug || "dj") + ".pdf";
      await window.html2pdf()
        .set({
          margin: 0,
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2.35,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#070a13",
            logging: false,
            scrollX: 0,
            scrollY: 0
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        })
        .from(source.firstElementChild)
        .save();
      show("Presskit PDF téléchargé. Vous pouvez l’envoyer directement à vos prospects.", "success");
    } catch (error) {
      show("Utilisez “Imprimer / enregistrer en PDF” pour créer le fichier.", "warning");
      printPresskit();
    } finally {
      if (source) source.remove();
      setDownloadButtonLoading(button, false);
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
        show("Presskit prêt. Utilisez “Imprimer / enregistrer en PDF” pour créer le fichier.", "info");
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
        await downloadPresskitPdf(profile, button, payload);
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
