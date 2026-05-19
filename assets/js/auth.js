(function () {
  "use strict";

  function getClient() {
    return window.djHubSupabase || null;
  }

  function isConfigured() {
    return Boolean(window.djHubSupabaseConfig && window.djHubSupabaseConfig.isConfigured && getClient());
  }

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function showMessage(target, text, state) {
    if (!target) return;
    target.hidden = false;
    target.textContent = text;
    target.dataset.state = state || "info";
  }

  function configuredOrMessage(target) {
    if (isConfigured()) return true;
    showMessage(target, "Supabase n'est pas encore configuré. Le site public fonctionne, mais la connexion sera active après ajout de l'URL projet et de l'anon key.", "warning");
    return false;
  }

  async function getCurrentUser() {
    const client = getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user || null;
  }

  async function getCurrentProfile() {
    const client = getClient();
    const user = await getCurrentUser();
    if (!client || !user) return null;

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("[DJ-hub] Impossible de charger le profil utilisateur.", error.message);
      return null;
    }

    return data || null;
  }

  async function requireAuth(redirectTo) {
    redirectTo = redirectTo || "connexion.html";
    if (!isConfigured()) {
      window.location.href = redirectTo;
      return null;
    }

    const user = await getCurrentUser();
    if (!user) {
      window.location.href = redirectTo + "?redirect=" + encodeURIComponent(location.pathname.split("/").pop() || "index.html");
      return null;
    }

    return user;
  }

  async function requireRole(role, redirectTo) {
    redirectTo = redirectTo || "connexion.html";
    const user = await requireAuth(redirectTo);
    if (!user) return null;

    const profile = await getCurrentProfile();
    if (!profile || (profile.role !== role && profile.role !== "admin")) {
      window.location.href = redirectTo;
      return null;
    }

    return profile;
  }

  async function upsertProfile(user, role, fullName) {
    const client = getClient();
    if (!client || !user) return null;

    const safeRole = role === "artist" ? "artist" : "client";
    const { data, error } = await client
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        role: safeRole,
        full_name: fullName || user.user_metadata && user.user_metadata.full_name || ""
      }, { onConflict: "id" })
      .select()
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  async function signUpUser(email, password, role, fullName) {
    const client = getClient();
    if (!client) throw new Error("Supabase n'est pas configuré.");

    const safeRole = role === "artist" ? "artist" : "client";
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: safeRole,
          full_name: fullName || ""
        },
        emailRedirectTo: window.location.origin + window.location.pathname.replace(/[^/]+$/, "connexion.html")
      }
    });

    if (error) throw error;
    if (data && data.user) {
      try {
        await upsertProfile(data.user, safeRole, fullName);
      } catch (profileError) {
        console.warn("[DJ-hub] Profil applicatif non créé immédiatement. Le trigger Supabase peut le créer après confirmation email.", profileError.message);
      }
    }

    return data;
  }

  async function signInUser(email, password) {
    const client = getClient();
    if (!client) throw new Error("Supabase n'est pas configuré.");

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOutUser() {
    const client = getClient();
    if (client) await client.auth.signOut();
    window.location.href = "connexion.html";
  }

  async function redirectByRole() {
    const profile = await getCurrentProfile();
    if (!profile) {
      window.location.href = "djs.html";
      return;
    }

    if (profile.role === "admin") window.location.href = "admin-validations.html";
    else if (profile.role === "artist") window.location.href = "espace-artiste.html";
    else window.location.href = "djs.html";
  }

  async function updateAuthNav() {
    const targets = Array.prototype.slice.call(document.querySelectorAll("[data-auth-nav]"));
    if (!targets.length) return;

    const profile = await getCurrentProfile();
    targets.forEach(function (target) {
      if (!profile) {
        target.innerHTML = '<a href="connexion.html">Connexion</a>';
        return;
      }

      const href = profile.role === "admin" ? "admin-validations.html" : profile.role === "artist" ? "espace-artiste.html" : "djs.html";
      const label = profile.role === "artist" ? "Espace artiste" : profile.role === "admin" ? "Admin" : "Mon espace";
      target.innerHTML = '<a href="' + href + '">' + label + '</a>';
    });
  }

  function initAuthForms() {
    const loginForm = qs("#login-form");
    const signupForm = qs("#artist-signup-form");
    const message = qs("#auth-message");

    if (loginForm) {
      configuredOrMessage(message);
      loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!configuredOrMessage(message)) return;

        try {
          showMessage(message, "Connexion en cours...", "info");
          await signInUser(qs("#login-email", loginForm).value.trim(), qs("#login-password", loginForm).value);
          const params = new URLSearchParams(window.location.search);
          const redirect = params.get("redirect");
          if (redirect) window.location.href = redirect;
          else await redirectByRole();
        } catch (error) {
          showMessage(message, error.message || "Connexion impossible.", "error");
        }
      });
    }

    if (signupForm) {
      configuredOrMessage(message);
      signupForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        if (!configuredOrMessage(message)) return;

        const password = qs("#signup-password", signupForm).value;
        const confirm = qs("#signup-password-confirm", signupForm).value;
        if (password !== confirm) {
          showMessage(message, "Les deux mots de passe ne correspondent pas.", "error");
          return;
        }

        try {
          showMessage(message, "Création du compte artiste...", "info");
          const data = await signUpUser(qs("#signup-email", signupForm).value.trim(), password, "artist", qs("#signup-name", signupForm).value.trim());

          if (data && data.session) {
            window.location.href = "questionnaire-artiste.html";
            return;
          }

          showMessage(message, "Compte créé. Vérifiez votre email si Supabase demande une confirmation, puis connectez-vous.", "success");
          signupForm.reset();
        } catch (error) {
          showMessage(message, error.message || "Création impossible.", "error");
        }
      });
    }
  }

  window.getCurrentUser = getCurrentUser;
  window.getCurrentProfile = getCurrentProfile;
  window.requireAuth = requireAuth;
  window.requireRole = requireRole;
  window.signUpUser = signUpUser;
  window.signInUser = signInUser;
  window.signOutUser = signOutUser;
  window.redirectByRole = redirectByRole;
  window.updateAuthNav = updateAuthNav;

  document.addEventListener("DOMContentLoaded", function () {
    initAuthForms();
    updateAuthNav();
  });
})();
