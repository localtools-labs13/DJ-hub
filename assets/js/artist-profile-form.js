(function () {
  "use strict";

  function qs(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function value(form, name) {
    const field = qs('[name="' + name + '"]', form);
    return field ? field.value.trim() : "";
  }

  function setValue(form, name, inputValue) {
    const field = qs('[name="' + name + '"]', form);
    if (field) field.value = inputValue || "";
  }

  function list(value) {
    return String(value || "")
      .split(",")
      .map(function (item) { return item.trim(); })
      .filter(Boolean);
  }

  function join(value) {
    return Array.isArray(value) ? value.join(", ") : "";
  }

  function slugify(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function show(text, state) {
    const box = qs("#profile-message") || qs("#auth-message");
    if (!box) return;
    box.hidden = false;
    box.textContent = text;
    box.dataset.state = state || "info";
  }

  function client() {
    return window.djHubSupabase || null;
  }

  async function loadProfile(userId) {
    const { data, error } = await client()
      .from("artist_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }

  function fillForm(form, profile) {
    if (!profile) return;
    setValue(form, "artist_name", profile.artist_name);
    setValue(form, "city", profile.city);
    setValue(form, "styles", join(profile.styles));
    setValue(form, "price_from", profile.price_from);
    setValue(form, "material", profile.material ? "true" : "false");
    setValue(form, "bio", profile.bio);
    setValue(form, "experience", profile.experience);
    setValue(form, "zones", join(profile.zones));
    setValue(form, "event_types", join(profile.event_types));
    setValue(form, "instagram", profile.instagram);
    setValue(form, "soundcloud", profile.soundcloud);
    setValue(form, "mixcloud", profile.mixcloud);
    setValue(form, "legal_status", profile.legal_status);
    setValue(form, "photo_url", profile.photo_url || profile.public_image_url);
    setValue(form, "photo_credit", profile.photo_credit);
    setValue(form, "photo_note", profile.photo_note);
  }

  function payload(form, userId) {
    const artistName = value(form, "artist_name");
    const city = value(form, "city");
    return {
      user_id: userId,
      artist_name: artistName,
      slug: slugify(artistName + "-" + city),
      city: city,
      styles: list(value(form, "styles")),
      price_from: value(form, "price_from") ? Number(value(form, "price_from")) : null,
      material: value(form, "material") === "true",
      bio: value(form, "bio"),
      experience: value(form, "experience"),
      zones: list(value(form, "zones")),
      event_types: list(value(form, "event_types")),
      instagram: value(form, "instagram"),
      soundcloud: value(form, "soundcloud"),
      mixcloud: value(form, "mixcloud"),
      legal_status: value(form, "legal_status"),
      photo_url: value(form, "photo_url"),
      photo_credit: value(form, "photo_credit"),
      photo_note: value(form, "photo_note"),
      status: "pending"
    };
  }

  async function init() {
    const form = qs("#artist-profile-form");
    if (!form) return;

    if (!window.djHubSupabaseConfig || !window.djHubSupabaseConfig.isConfigured || !client()) {
      show("Supabase n’est pas encore configuré. Le questionnaire sera enregistrable après ajout de l’URL projet et de l’anon key.", "warning");
      return;
    }

    const roleProfile = await window.requireRole("artist", "connexion.html");
    if (!roleProfile) return;
    const user = await window.getCurrentUser();
    let existing = null;

    try {
      existing = await loadProfile(user.id);
      fillForm(form, existing);
    } catch (error) {
      show(error.message || "Impossible de charger votre profil.", "error");
    }

    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      show("Enregistrement du profil...", "info");

      try {
        const body = payload(form, user.id);
        let result;
        if (existing) {
          result = await client()
            .from("artist_profiles")
            .update(body)
            .eq("id", existing.id)
            .select()
            .maybeSingle();
        } else {
          result = await client()
            .from("artist_profiles")
            .insert(body)
            .select()
            .maybeSingle();
        }

        if (result.error) throw result.error;
        existing = result.data;
        show("Profil envoyé pour validation.", "success");
      } catch (error) {
        show(error.message || "Enregistrement impossible.", "error");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
