(function () {
  "use strict";

  var config = window.BOOKTONDJ_SUPABASE_CONFIG || {};
  var client = null;

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $all(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  function setText(selector, text) {
    var node = $(selector);
    if (node) node.textContent = text;
  }

  function showMessage(target, text, type) {
    if (!target) return;
    target.hidden = false;
    target.textContent = text;
    target.dataset.state = type || "info";
  }

  function isConfigured() {
    return Boolean(
      config.url &&
      config.anonKey &&
      config.url.indexOf("REMPLACE_") === -1 &&
      config.anonKey.indexOf("REMPLACE_") === -1
    );
  }

  function getClient() {
    if (client) return client;
    if (!isConfigured() || !window.supabase || !window.supabase.createClient) return null;

    client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return client;
  }

  function requireClient(messageNode) {
    var supabaseClient = getClient();
    if (!supabaseClient) {
      showMessage(
        messageNode,
        "Supabase n'est pas encore configure. Remplissez assets/js/supabase-config.js avec l'URL projet et l'anon key.",
        "warning"
      );
      return null;
    }
    return supabaseClient;
  }

  function parseList(value) {
    return String(value || "")
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function joinList(value) {
    return Array.isArray(value) ? value.join(", ") : "";
  }

  function formatDate(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("fr-FR", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }).format(new Date(value + "T12:00:00"));
  }

  async function getSessionOrRedirect() {
    var supabaseClient = getClient();
    if (!supabaseClient) return null;

    var result = await supabaseClient.auth.getSession();
    if (!result.data.session) {
      window.location.href = "connexion.html?redirect=" + encodeURIComponent(window.location.pathname.split("/").pop() || "espace-artiste.html");
      return null;
    }
    return result.data.session;
  }

  async function getOwnArtistProfile(supabaseClient, userId) {
    var result = await supabaseClient
      .from("artist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (result.error && result.error.code !== "PGRST116") throw result.error;
    return result.data || null;
  }

  function initLogin() {
    var form = $("#login-form");
    if (!form) return;

    var message = $("#auth-message");
    var supabaseClient = requireClient(message);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      supabaseClient = requireClient(message);
      if (!supabaseClient) return;

      var email = $("#login-email", form).value.trim();
      var password = $("#login-password", form).value;
      showMessage(message, "Connexion en cours...", "info");

      var result = await supabaseClient.auth.signInWithPassword({ email: email, password: password });
      if (result.error) {
        showMessage(message, result.error.message, "error");
        return;
      }

      var params = new URLSearchParams(window.location.search);
      window.location.href = params.get("redirect") || "espace-artiste.html";
    });
  }

  function initSignup() {
    var form = $("#signup-form");
    if (!form) return;

    var message = $("#auth-message");
    var supabaseClient = requireClient(message);

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      supabaseClient = requireClient(message);
      if (!supabaseClient) return;

      var email = $("#signup-email", form).value.trim();
      var password = $("#signup-password", form).value;
      var fullName = $("#signup-name", form).value.trim();
      var stageName = $("#signup-stage-name", form).value.trim();

      showMessage(message, "Creation du compte artiste...", "info");
      var result = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: config.authRedirectUrl,
          data: {
            role: "artist",
            full_name: fullName,
            stage_name: stageName
          }
        }
      });

      if (result.error) {
        showMessage(message, result.error.message, "error");
        return;
      }

      if (result.data && result.data.session) {
        window.location.href = "questionnaire-artiste.html";
        return;
      }

      showMessage(message, "Compte cree. Verifiez votre email pour activer la connexion, puis revenez vous connecter.", "success");
      form.reset();
    });
  }

  async function initDashboard() {
    var dashboard = $("#artist-dashboard");
    if (!dashboard) return;

    var message = $("#auth-message");
    var supabaseClient = requireClient(message);
    if (!supabaseClient) return;

    var session = await getSessionOrRedirect();
    if (!session) return;

    setText("#artist-email", session.user.email || "");
    var signOut = $("#signout-button");
    if (signOut) {
      signOut.addEventListener("click", async function () {
        await supabaseClient.auth.signOut();
        window.location.href = "connexion.html";
      });
    }

    try {
      var artist = await getOwnArtistProfile(supabaseClient, session.user.id);
      renderDashboardArtist(artist);
      await renderAvailability(supabaseClient, artist);
      initAvailabilityForm(supabaseClient, artist);
    } catch (error) {
      showMessage(message, error.message, "error");
    }
  }

  function renderDashboardArtist(artist) {
    var box = $("#artist-dashboard");
    if (!box) return;

    if (!artist) {
      box.innerHTML = [
        '<div class="auth-card">',
        '<p class="eyebrow">Profil incomplet</p>',
        "<h2>Votre fiche DJ n'est pas encore creee.</h2>",
        '<p>Remplissez le questionnaire artiste pour envoyer votre profil en validation.</p>',
        '<a class="btn btn-primary" href="questionnaire-artiste.html">Remplir le questionnaire</a>',
        '</div>'
      ].join("");
      return;
    }

    var statusLabel = {
      draft: "Brouillon",
      pending_review: "En validation",
      approved: "Valide",
      rejected: "A corriger"
    }[artist.status] || artist.status;

    box.innerHTML = [
      '<div class="auth-card">',
      '<p class="eyebrow">Profil artiste</p>',
      '<h2>' + escapeHtml(artist.stage_name) + '</h2>',
      '<div class="auth-status-row">',
      '<span class="status-pill">' + escapeHtml(statusLabel) + '</span>',
      '<span>' + escapeHtml(artist.city || "") + '</span>',
      '<span>' + escapeHtml(joinList(artist.styles)) + '</span>',
      '</div>',
      '<p>' + escapeHtml(artist.bio || "Bio a completer.") + '</p>',
      '<div class="hero-actions">',
      '<a class="btn btn-primary" href="questionnaire-artiste.html">Modifier mon profil</a>',
      '<a class="btn btn-ghost" href="djs.html">Voir la selection publique</a>',
      '</div>',
      '</div>'
    ].join("");
  }

  async function renderAvailability(supabaseClient, artist) {
    var list = $("#availability-list");
    if (!list) return;

    if (!artist) {
      list.innerHTML = "<p class=\"muted\">Creez d'abord votre profil artiste pour gerer vos disponibilites.</p>";
      return;
    }

    var result = await supabaseClient
      .from("artist_availabilities")
      .select("*")
      .eq("artist_profile_id", artist.id)
      .order("available_date", { ascending: true });

    if (result.error) throw result.error;

    if (!result.data.length) {
      list.innerHTML = '<p class="muted">Aucune date ajoutee pour le moment.</p>';
      return;
    }

    list.innerHTML = result.data.map(function (item) {
      return [
        '<article class="availability-item">',
        '<strong>' + escapeHtml(formatDate(item.available_date)) + '</strong>',
        '<span class="status-pill">' + escapeHtml(item.status) + '</span>',
        item.note ? '<p>' + escapeHtml(item.note) + '</p>' : '',
        '</article>'
      ].join("");
    }).join("");
  }

  function initAvailabilityForm(supabaseClient, artist) {
    var form = $("#availability-form");
    if (!form || !artist) return;

    var message = $("#availability-message");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      var payload = {
        artist_profile_id: artist.id,
        available_date: $("#availability-date", form).value,
        status: $("#availability-status", form).value,
        note: $("#availability-note", form).value.trim() || null
      };

      var result = await supabaseClient
        .from("artist_availabilities")
        .upsert(payload, { onConflict: "artist_profile_id,available_date" });

      if (result.error) {
        showMessage(message, result.error.message, "error");
        return;
      }

      showMessage(message, "Disponibilite enregistree.", "success");
      form.reset();
      await renderAvailability(supabaseClient, artist);
    });
  }

  async function initQuestionnaire() {
    var form = $("#artist-questionnaire-form");
    if (!form) return;

    var message = $("#auth-message");
    var supabaseClient = requireClient(message);
    if (!supabaseClient) return;

    var session = await getSessionOrRedirect();
    if (!session) return;

    setText("#artist-email", session.user.email || "");

    try {
      var existing = await getOwnArtistProfile(supabaseClient, session.user.id);
      if (existing) fillQuestionnaire(form, existing);
    } catch (error) {
      showMessage(message, error.message, "error");
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      var payload = {
        user_id: session.user.id,
        status: "pending_review",
        published: false,
        stage_name: $("#artist-stage-name", form).value.trim(),
        city: $("#artist-city", form).value.trim(),
        styles: parseList($("#artist-styles", form).value),
        price_from: Number($("#artist-price-from", form).value || 0),
        bio: $("#artist-bio", form).value.trim(),
        experience: $("#artist-experience", form).value.trim(),
        material: $("#artist-material", form).value === "true",
        zones: parseList($("#artist-zones", form).value),
        event_types: parseList($("#artist-event-types", form).value),
        badges: parseList($("#artist-badges", form).value),
        instagram: $("#artist-instagram", form).value.trim() || null,
        soundcloud: $("#artist-soundcloud", form).value.trim() || null,
        mixcloud: $("#artist-mixcloud", form).value.trim() || null,
        submitted_at: new Date().toISOString()
      };

      if (!payload.stage_name || !payload.city || !payload.styles.length) {
        showMessage(message, "Nom d'artiste, ville et styles sont obligatoires.", "error");
        return;
      }

      var result = await supabaseClient
        .from("artist_profiles")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .single();

      if (result.error) {
        showMessage(message, result.error.message, "error");
        return;
      }

      showMessage(message, "Profil envoye en validation admin. Il ne sera public qu'apres approbation.", "success");
      window.setTimeout(function () {
        window.location.href = "espace-artiste.html";
      }, 900);
    });
  }

  function fillQuestionnaire(form, artist) {
    $("#artist-stage-name", form).value = artist.stage_name || "";
    $("#artist-city", form).value = artist.city || "";
    $("#artist-styles", form).value = joinList(artist.styles);
    $("#artist-price-from", form).value = artist.price_from || "";
    $("#artist-bio", form).value = artist.bio || "";
    $("#artist-experience", form).value = artist.experience || "";
    $("#artist-material", form).value = String(Boolean(artist.material));
    $("#artist-zones", form).value = joinList(artist.zones);
    $("#artist-event-types", form).value = joinList(artist.event_types);
    $("#artist-badges", form).value = joinList(artist.badges);
    $("#artist-instagram", form).value = artist.instagram || "";
    $("#artist-soundcloud", form).value = artist.soundcloud || "";
    $("#artist-mixcloud", form).value = artist.mixcloud || "";
  }

  function escapeHtml(value) {
    return String(value === undefined || value === null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("DOMContentLoaded", function () {
    initLogin();
    initSignup();
    initDashboard();
    initQuestionnaire();

    $all("[data-auth-link='logout']").forEach(function (button) {
      button.addEventListener("click", async function () {
        var supabaseClient = getClient();
        if (supabaseClient) await supabaseClient.auth.signOut();
        window.location.href = "connexion.html";
      });
    });
  });
})();
